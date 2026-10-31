import { Router } from 'express';
import { Checkout } from '../models/Checkout.js';
import { VendorOrder } from '../models/VendorOrder.js';
import { Vendor } from '../models/Vendor.js';
import { AuditLog } from '../models/AuditLog.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { isConnectedToMongoDB } from '../config/db.js';
import { memoryStore } from '../config/inMemoryStore.js';

const router = Router();

// GET /api/orders (Buyer view)
router.get('/', requireAuth, async (req, res) => {
  try {
    if (isConnectedToMongoDB) {
      const checkouts = await Checkout.find({ buyerId: req.user._id })
        .populate({
          path: 'orderIds',
          populate: { path: 'vendorId', select: 'businessName address phone rating' },
        })
        .sort({ createdAt: -1 });

      return res.json(checkouts);
    } else {
      const buyerCheckouts = memoryStore.checkouts.filter(
        (c) => c.buyerId?._id?.toString() === req.user._id.toString() || c.buyerId?.toString() === req.user._id.toString()
      );
      return res.json(buyerCheckouts);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve orders: ' + err.message });
  }
});

// GET /api/orders/vendor/me (Vendor view)
router.get('/vendor/me', requireAuth, requireRole(['vendor']), async (req, res) => {
  try {
    if (isConnectedToMongoDB) {
      const vendor = await Vendor.findOne({ userId: req.user._id });
      if (!vendor) return res.status(403).json({ error: 'No vendor profile associated' });

      const orders = await VendorOrder.find({ vendorId: vendor._id })
        .populate('buyerId', 'name email phone businessName')
        .populate('checkoutId', 'deliveryAddress paymentMethod paymentStatus createdAt')
        .sort({ createdAt: -1 });

      return res.json(orders);
    } else {
      const vendor = memoryStore.vendors.find((v) => v.userId === req.user._id);
      if (!vendor) return res.status(403).json({ error: 'No vendor profile associated' });

      const orders = memoryStore.vendorOrders.filter(
        (o) => o.vendorId?._id?.toString() === vendor._id.toString() || o.vendorId?.toString() === vendor._id.toString()
      );

      // Populate buyer info
      const enriched = orders.map((o) => {
        const buyer = memoryStore.users.find((u) => u._id.toString() === o.buyerId.toString());
        const checkout = memoryStore.checkouts.find((c) => c._id.toString() === o.checkoutId.toString());
        return {
          ...o,
          buyerId: buyer || { name: 'Restaurant Buyer', businessName: 'Commercial Kitchen' },
          checkoutId: checkout || { deliveryAddress: { street: 'Coimbatore' } },
        };
      });

      return res.json(enriched);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve vendor orders: ' + err.message });
  }
});

// GET /api/orders/vendor/metrics (Vendor earnings)
router.get('/vendor/metrics', requireAuth, requireRole(['vendor']), async (req, res) => {
  try {
    if (isConnectedToMongoDB) {
      const vendor = await Vendor.findOne({ userId: req.user._id });
      if (!vendor) return res.status(403).json({ error: 'No vendor profile found' });

      const orders = await VendorOrder.find({ vendorId: vendor._id });
      let grossSales = 0, totalCommission = 0, netPayout = 0, activeOrders = 0, completedOrders = 0;

      orders.forEach((o) => {
        grossSales += o.subtotal;
        totalCommission += o.commissionAmount;
        netPayout += o.vendorPayout;
        if (['pending', 'accepted', 'preparing', 'dispatched'].includes(o.status)) activeOrders++;
        else if (o.status === 'delivered') completedOrders++;
      });

      return res.json({
        grossSales: parseFloat(grossSales.toFixed(2)),
        totalCommissionPaid: parseFloat(totalCommission.toFixed(2)),
        netPayout: parseFloat(netPayout.toFixed(2)),
        totalOrders: orders.length,
        activeOrders,
        completedOrders,
        vendorDetails: { businessName: vendor.businessName, rating: vendor.rating, address: vendor.address },
      });
    } else {
      const vendor = memoryStore.vendors.find((v) => v.userId === req.user._id);
      if (!vendor) return res.status(403).json({ error: 'No vendor profile found' });

      const orders = memoryStore.vendorOrders.filter(
        (o) => o.vendorId?._id?.toString() === vendor._id.toString() || o.vendorId?.toString() === vendor._id.toString()
      );

      let grossSales = 0, totalCommission = 0, netPayout = 0, activeOrders = 0, completedOrders = 0;
      orders.forEach((o) => {
        grossSales += o.subtotal;
        totalCommission += o.commissionAmount;
        netPayout += o.vendorPayout;
        if (['pending', 'accepted', 'preparing', 'dispatched'].includes(o.status)) activeOrders++;
        else if (o.status === 'delivered') completedOrders++;
      });

      return res.json({
        grossSales: parseFloat(grossSales.toFixed(2)),
        totalCommissionPaid: parseFloat(totalCommission.toFixed(2)),
        netPayout: parseFloat(netPayout.toFixed(2)),
        totalOrders: orders.length,
        activeOrders,
        completedOrders,
        vendorDetails: { businessName: vendor.businessName, rating: vendor.rating, address: vendor.address },
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate vendor metrics: ' + err.message });
  }
});

// PATCH /api/orders/vendor/:id/status
router.patch('/vendor/:id/status', requireAuth, requireRole(['vendor', 'admin']), async (req, res) => {
  try {
    const { status, notes, deliveryPartner, deliveryTrackingCode, estimatedDeliveryAt, deliveryProofUrl } = req.body;
    const allowed = ['pending', 'accepted', 'preparing', 'dispatched', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${allowed.join(', ')}` });
    }

    if (isConnectedToMongoDB) {
      const order = await VendorOrder.findById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (req.user.role === 'vendor') {
        const vendor = await Vendor.findOne({ userId: req.user._id });
        if (!vendor || vendor.verificationStatus !== 'approved' || !vendor.isActive) return res.status(403).json({ error: 'Vendor account is not approved' });
        if (String(order.vendorId) !== String(vendor._id)) return res.status(403).json({ error: "You cannot update another vendor\'s order" });
      }
      const transitions = { pending: ['accepted', 'cancelled'], accepted: ['preparing', 'cancelled'], preparing: ['dispatched', 'cancelled'], dispatched: ['delivered'], delivered: [], cancelled: [] };
      if (!transitions[order.status]?.includes(status) && !(req.user.role === 'admin' && status === order.status)) return res.status(409).json({ error: `Invalid status transition: ${order.status} -> ${status}` });
      if (status === 'accepted' || status === 'preparing' || status === 'dispatched' || status === 'delivered') {
        const checkout = await Checkout.findById(order.checkoutId);
        if (!checkout || (checkout.paymentStatus !== 'completed' && checkout.paymentMethod !== 'cod')) return res.status(409).json({ error: 'Order cannot be fulfilled until payment is verified' });
      }
      const checkoutForTransition = await Checkout.findById(order.checkoutId);
      if (status === 'delivered' && checkoutForTransition?.paymentMethod === 'cod' && req.body.codCollected !== true) return res.status(400).json({ error: 'Confirm that cash was collected before marking this COD order delivered' });
      const previousStatus = order.status;
      if (status === 'cancelled') {
        const checkout = await Checkout.findById(order.checkoutId);
        if (checkout?.paymentStatus === 'completed' && checkout.paymentMethod !== 'cod') return res.status(409).json({ error: 'Paid online orders must be refunded through the admin refund workflow before cancellation' });
      }
      order.status = status;
      if (notes) order.cancellationReason = notes;
      if (deliveryPartner !== undefined) order.deliveryPartner = String(deliveryPartner).slice(0, 120);
      if (deliveryTrackingCode !== undefined) order.deliveryTrackingCode = String(deliveryTrackingCode).slice(0, 120);
      if (estimatedDeliveryAt !== undefined) { const eta = new Date(estimatedDeliveryAt); if (Number.isNaN(eta.getTime())) return res.status(400).json({ error: 'Invalid estimated delivery date' }); order.estimatedDeliveryAt = eta; }
      if (deliveryProofUrl !== undefined) order.deliveryProofUrl = String(deliveryProofUrl).slice(0, 500);
      if (status === 'delivered') {
        order.deliveredAt = new Date();
        const checkout = await Checkout.findById(order.checkoutId);
        if (checkout?.paymentMethod === 'cod') {
          const siblingOrders = await VendorOrder.find({ checkoutId: checkout._id, _id: { $ne: order._id } });
          if (siblingOrders.every((sibling) => sibling.status === 'delivered' || sibling.status === 'cancelled')) {
            // COD is reconciled at delivery only; production deployments should require explicit collection confirmation.
            checkout.paymentStatus = 'completed'; checkout.paidAt = new Date(); await checkout.save();
          }
        }
      }
      order.statusHistory.push({ status, note: notes || '', changedBy: String(req.user._id), changedAt: new Date() });
      await order.save();
      if (status === 'cancelled' && previousStatus !== 'cancelled') {
        for (const item of order.items) await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
      }
      return res.json({ message: 'Order status updated', order });
    } else {
      const order = memoryStore.vendorOrders.find((o) => o._id.toString() === req.params.id.toString());
      if (!order) return res.status(404).json({ error: 'Order not found' });
      order.status = status;
      if (notes) order.cancellationReason = notes;
      return res.json({ message: 'Order status updated', order });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status: ' + err.message });
  }
});

export default router;
