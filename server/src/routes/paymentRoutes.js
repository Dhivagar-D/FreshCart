import { Router } from 'express';
import crypto from 'node:crypto';
import { Checkout } from '../models/Checkout.js';
import { VendorOrder } from '../models/VendorOrder.js';
import { Product } from '../models/Product.js';
import { AuditLog } from '../models/AuditLog.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || '')); const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

// Create a real Razorpay order. This endpoint intentionally fails closed when credentials are absent.
router.post('/create-intent', requireAuth, async (req, res) => {
  try {
    const { checkoutId } = req.body;
    const checkout = await Checkout.findOne({ _id: checkoutId, buyerId: req.user._id });
    if (!checkout) return res.status(404).json({ error: 'Checkout not found for this buyer' });
    if (checkout.paymentStatus === 'completed') return res.status(409).json({ error: 'Checkout is already paid' });
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ error: 'Online payments are not configured. Add Razorpay test credentials to server/.env.' });
    }
    if (!Number.isFinite(checkout.totalAmount) || checkout.totalAmount <= 0) return res.status(400).json({ error: 'Invalid checkout amount' });
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: Math.round(checkout.totalAmount * 100), currency: 'INR', receipt: String(checkout._id), notes: { checkoutId: String(checkout._id), buyerId: String(req.user._id) } }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data.error?.description || 'Payment provider could not create an order' });
    checkout.paymentReference = data.id;
    checkout.paymentProvider = 'razorpay';
    checkout.paymentMethod = 'razorpay_route';
    await checkout.save();
    await AuditLog.create({ action: 'PAYMENT_ORDER_CREATED', actorId: req.user._id, actorRole: req.user.role, details: { checkoutId: String(checkout._id), providerOrderId: data.id, amount: checkout.totalAmount } });
    return res.json({ success: true, provider: 'razorpay', providerOrderId: data.id, amount: data.amount, currency: data.currency, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('Payment order creation failed:', err);
    return res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Admin-initiated full refund. A real provider payment ID must have been captured by the signed webhook.
router.post('/refund', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { checkoutId, reason = 'Customer refund' } = req.body;
    const checkout = await Checkout.findById(checkoutId);
    if (!checkout) return res.status(404).json({ error: 'Checkout not found' });
    if (checkout.paymentStatus !== 'completed' || !checkout.providerPaymentReference) return res.status(409).json({ error: 'Only verified captured payments can be refunded' });
    const deliveredOrderExists = await VendorOrder.exists({ checkoutId: checkout._id, status: 'delivered' });
    if (deliveredOrderExists) return res.status(409).json({ error: 'Full checkout refund is unavailable after any supplier order has been delivered. Handle this as a support-reviewed partial refund.' });
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return res.status(503).json({ error: 'Razorpay credentials are not configured' });
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(checkout.providerPaymentReference)}/refund`, {
      method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(checkout.totalAmount * 100), notes: { checkoutId: String(checkout._id), reason: String(reason).slice(0, 200) } }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data.error?.description || 'Payment provider rejected refund' });
    checkout.paymentStatus = 'refunded'; checkout.refundReference = data.id; await checkout.save();
    const cancellableOrders = await VendorOrder.find({ checkoutId: checkout._id, status: { $nin: ['delivered', 'cancelled'] } });
    for (const order of cancellableOrders) {
      for (const item of order.items) await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
      order.status = 'cancelled'; order.cancellationReason = 'Checkout refunded';
      order.statusHistory.push({ status: 'cancelled', note: 'Checkout refunded by admin; reserved stock restored', changedBy: String(req.user._id), changedAt: new Date() });
      await order.save();
    }
    await AuditLog.create({ action: 'PAYMENT_REFUND_ISSUED', actorId: req.user._id, actorRole: 'admin', details: { checkoutId: String(checkout._id), refundId: data.id, amount: checkout.totalAmount } });
    return res.json({ message: 'Refund submitted to payment provider', refundId: data.id, status: data.status });
  } catch (err) { console.error('Refund failed:', err); return res.status(500).json({ error: 'Refund could not be processed' }); }
});

// Razorpay webhook: app mounts express.raw() before express.json() for this endpoint.
router.post('/webhook', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ error: 'Payment webhook secret is not configured' });
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const receivedSignature = req.headers['x-razorpay-signature'];
    const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!safeEqual(receivedSignature, expectedSignature)) return res.status(401).json({ error: 'Invalid webhook signature' });
    const eventBody = JSON.parse(rawBody.toString('utf8'));
    const event = eventBody.event;
    const payment = eventBody.payload?.payment?.entity;
    const providerOrderId = payment?.order_id || eventBody.payload?.order?.entity?.id;
    if (!providerOrderId) return res.json({ received: true, ignored: true });
    const checkout = await Checkout.findOne({ paymentReference: providerOrderId });
    if (!checkout) return res.status(404).json({ error: 'Checkout for payment order not found' });
    if (event === 'payment.captured' || event === 'order.paid') {
      const wasAlreadyPaid = checkout.paymentStatus === 'completed';
      checkout.paymentStatus = 'completed';
      checkout.paidAt = checkout.paidAt || new Date();
      if (payment?.id) checkout.providerPaymentReference = payment.id;
      await checkout.save();
      if (!wasAlreadyPaid) {
        await VendorOrder.updateMany({ checkoutId: checkout._id, status: 'pending' }, { $set: { status: 'accepted', payoutStatus: 'unsettled' }, $push: { statusHistory: { status: 'accepted', note: 'Payment verified by payment provider webhook', changedBy: 'system', changedAt: new Date() } } });
        await AuditLog.create({ action: 'WEBHOOK_PAYMENT_CONFIRMED', actorRole: 'webhook', details: { checkoutId: String(checkout._id), event, providerOrderId } });
      }
    } else if (event === 'payment.failed' && checkout.paymentStatus === 'pending') {
      checkout.paymentStatus = 'failed'; await checkout.save();
      const orders = await VendorOrder.find({ checkoutId: checkout._id });
      for (const order of orders) {
        if (order.status !== 'cancelled') {
          for (const item of order.items) await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
          order.status = 'cancelled'; order.cancellationReason = 'Payment failed';
          order.statusHistory.push({ status: 'cancelled', note: 'Payment failed; reserved stock restored', changedBy: 'system' });
          await order.save();
        }
      }
      await AuditLog.create({ action: 'WEBHOOK_PAYMENT_FAILED', actorRole: 'webhook', details: { checkoutId: String(checkout._id), providerOrderId } });
    }
    return res.json({ received: true });
  } catch (err) {
    console.error('Payment webhook processing failed:', err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
});

export default router;
