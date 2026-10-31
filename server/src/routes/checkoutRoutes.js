import { Router } from 'express';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { Vendor } from '../models/Vendor.js';
import { Checkout } from '../models/Checkout.js';
import { VendorOrder } from '../models/VendorOrder.js';
import { PlatformSettings } from '../models/PlatformSettings.js';
import { AuditLog } from '../models/AuditLog.js';
import { requireAuth } from '../middleware/auth.js';
import { isConnectedToMongoDB } from '../config/db.js';
import { memoryStore } from '../config/inMemoryStore.js';

const router = Router();

function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `FC-${dateStr}-${rand}`;
}

// POST /api/checkout (Automated Order Splitting)
router.post('/', requireAuth, async (req, res) => {
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyer accounts can create checkouts' });
  try {
    const {
      idempotencyKey,
      deliveryAddress,
      deliveryCoordinates,
      paymentMethod = 'razorpay_route',
    } = req.body;

    if (!idempotencyKey) {
      return res.status(400).json({ error: 'idempotencyKey is required' });
    }

    if (!deliveryAddress || !deliveryAddress.street) {
      return res.status(400).json({ error: 'Valid delivery address is required' });
    }
    if (paymentMethod !== 'cod' && (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET || !process.env.RAZORPAY_WEBHOOK_SECRET)) {
      return res.status(503).json({ error: 'Online payment is not configured. Set Razorpay credentials and webhook secret, or choose cash on delivery for local testing.' });
    }

    if (isConnectedToMongoDB) {
      // 1. Idempotency Check
      const existing = await Checkout.findOne({ idempotencyKey }).populate({
        path: 'orderIds',
        populate: { path: 'vendorId', select: 'businessName' },
      });
      if (existing) {
        return res.json({ message: 'Idempotent replay', checkout: existing, isIdempotentReplay: true });
      }

      // 2. Load Cart
      const cart = await Cart.findOne({ buyerId: req.user._id });
      if (!cart || !cart.items || cart.items.length === 0) {
        return res.status(400).json({ error: 'Your cart is empty' });
      }

      let settings = await PlatformSettings.findOne();
      const commissionPercent = settings?.commissionPercent || 5;

      // 3. Stock validation & reservation
      const reservedProducts = [];
      const vendorGroups = new Map();
      let calculatedTotal = 0;

      for (const item of cart.items) {
        const product = await Product.findOne({ _id: item.productId, isActive: true });
        if (!product) {
          for (const resItem of reservedProducts) {
            await Product.findByIdAndUpdate(resItem.productId, { $inc: { stock: resItem.quantity } });
          }
          return res.status(400).json({ error: 'A product in your cart is no longer available' });
        }

        const updated = await Product.findOneAndUpdate(
          { _id: product._id, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );

        if (!updated) {
          for (const resItem of reservedProducts) {
            await Product.findByIdAndUpdate(resItem.productId, { $inc: { stock: resItem.quantity } });
          }
          return res.status(409).json({ error: `Insufficient stock for "${product.name}"` });
        }

        reservedProducts.push({ productId: product._id, quantity: item.quantity });

        const lineSubtotal = product.price * item.quantity;
        calculatedTotal += lineSubtotal;
        const vendorIdStr = product.vendorId.toString();

        if (!vendorGroups.has(vendorIdStr)) {
          vendorGroups.set(vendorIdStr, {
            vendorId: product.vendorId,
            items: [],
            subtotal: 0,
          });
        }

        vendorGroups.get(vendorIdStr).items.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          unit: product.unit,
          subtotal: lineSubtotal,
        });
        vendorGroups.get(vendorIdStr).subtotal += lineSubtotal;
      }

      // 4. Create Parent Checkout
      const parentCheckout = new Checkout({
        buyerId: req.user._id,
        idempotencyKey,
        totalAmount: parseFloat(calculatedTotal.toFixed(2)),
        currency: 'INR',
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
        paymentMethod,
        paymentReference: '',
        deliveryAddress,
        deliveryCoordinates: deliveryCoordinates || { latitude: 11.0168, longitude: 76.9558 },
        orderIds: [],
      });
      await parentCheckout.save();

      // 5. Create Child Orders
      const createdOrders = [];
      for (const [vId, group] of vendorGroups.entries()) {
        const commissionAmount = parseFloat(((group.subtotal * commissionPercent) / 100).toFixed(2));
        const vendorPayout = parseFloat((group.subtotal - commissionAmount).toFixed(2));

        const vendorOrder = new VendorOrder({
          orderNumber: generateOrderNumber(),
          checkoutId: parentCheckout._id,
          buyerId: req.user._id,
          vendorId: group.vendorId,
          items: group.items,
          subtotal: group.subtotal,
          commissionRate: commissionPercent,
          commissionAmount,
          vendorPayout,
          status: 'pending',
          payoutStatus: 'unsettled',
        });
        await vendorOrder.save();
        createdOrders.push(vendorOrder);
        parentCheckout.orderIds.push(vendorOrder._id);
      }
      await parentCheckout.save();

      // Clear cart
      await Cart.findOneAndUpdate({ buyerId: req.user._id }, { items: [] });

      await AuditLog.create({
        action: 'CHECKOUT_AND_ORDER_SPLIT',
        actorId: req.user._id,
        actorRole: 'buyer',
        details: { checkoutId: parentCheckout._id, totalAmount: parentCheckout.totalAmount },
      });

      const populated = await Checkout.findById(parentCheckout._id).populate({
        path: 'orderIds',
        populate: { path: 'vendorId', select: 'businessName address phone' },
      });

      return res.status(201).json({
        message: 'Checkout created. Complete payment before fulfillment begins.',
        checkout: populated,
        vendorOrders: createdOrders,
      });
    } else {
      // In-Memory Mode
      const existing = memoryStore.checkouts.find((c) => c.idempotencyKey === idempotencyKey);
      if (existing) {
        return res.json({ message: 'Idempotent replay', checkout: existing, isIdempotentReplay: true });
      }

      const cartItems = memoryStore.carts.get(req.user._id.toString()) || [];
      if (cartItems.length === 0) {
        return res.status(400).json({ error: 'Your cart is empty' });
      }

      const commissionPercent = memoryStore.settings.commissionPercent || 5;
      const vendorGroups = new Map();
      let calculatedTotal = 0;

      // Validate & reserve stock
      for (const item of cartItems) {
        const product = memoryStore.products.find((p) => p._id.toString() === item.productId.toString());
        if (!product || !product.isActive) {
          return res.status(400).json({ error: 'A product in your cart is unavailable' });
        }
        if (product.stock < item.quantity) {
          return res.status(409).json({ error: `Insufficient stock for "${product.name}"` });
        }

        // Decrement stock
        product.stock -= item.quantity;

        const lineSubtotal = product.price * item.quantity;
        calculatedTotal += lineSubtotal;
        const vendorIdStr = product.vendorId.toString();

        if (!vendorGroups.has(vendorIdStr)) {
          vendorGroups.set(vendorIdStr, {
            vendorId: product.vendorId,
            items: [],
            subtotal: 0,
          });
        }

        vendorGroups.get(vendorIdStr).items.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          unit: product.unit,
          subtotal: lineSubtotal,
        });
        vendorGroups.get(vendorIdStr).subtotal += lineSubtotal;
      }

      const checkoutId = `chk_${Date.now()}`;
      const createdOrders = [];
      const orderIds = [];

      for (const [vId, group] of vendorGroups.entries()) {
        const vendor = memoryStore.vendors.find((v) => v._id.toString() === vId);
        const commissionAmount = parseFloat(((group.subtotal * commissionPercent) / 100).toFixed(2));
        const vendorPayout = parseFloat((group.subtotal - commissionAmount).toFixed(2));
        const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        const vOrder = {
          _id: orderId,
          orderNumber: generateOrderNumber(),
          checkoutId,
          buyerId: req.user._id,
          vendorId: vendor || { _id: vId, businessName: 'Local Producer' },
          items: group.items,
          subtotal: group.subtotal,
          commissionRate: commissionPercent,
          commissionAmount,
          vendorPayout,
          status: 'pending',
          payoutStatus: 'unsettled',
          createdAt: new Date(),
        };

        memoryStore.vendorOrders.unshift(vOrder);
        createdOrders.push(vOrder);
        orderIds.push(vOrder);
      }

      const parentCheckout = {
        _id: checkoutId,
        buyerId: req.user,
        idempotencyKey,
        totalAmount: parseFloat(calculatedTotal.toFixed(2)),
        currency: 'INR',
        paymentStatus: 'pending',
        paymentMethod,
        paymentReference: '',
        deliveryAddress,
        deliveryCoordinates: deliveryCoordinates || { latitude: 11.0168, longitude: 76.9558 },
        orderIds,
        createdAt: new Date(),
      };

      memoryStore.checkouts.unshift(parentCheckout);

      // Empty cart
      memoryStore.carts.set(req.user._id.toString(), []);

      memoryStore.auditLogs.unshift({
        action: 'CHECKOUT_AND_ORDER_SPLIT',
        actorId: req.user._id,
        actorRole: 'buyer',
        details: { checkoutId, totalAmount: parentCheckout.totalAmount, splitOrdersCount: createdOrders.length },
        timestamp: new Date(),
      });

      return res.status(201).json({
        message: 'Checkout created. Complete payment before fulfillment begins.',
        checkout: parentCheckout,
        vendorOrders: createdOrders,
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Checkout failed: ' + err.message });
  }
});

// GET /api/checkout/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (isConnectedToMongoDB) {
      const checkout = await Checkout.findOne({ _id: req.params.id, ...(req.user.role === 'admin' ? {} : { buyerId: req.user._id }) })
        .populate('buyerId', 'name email phone businessName')
        .populate({
          path: 'orderIds',
          populate: { path: 'vendorId', select: 'businessName address phone rating' },
        });

      if (!checkout) return res.status(404).json({ error: 'Checkout not found' });
      return res.json(checkout);
    } else {
      const checkout = memoryStore.checkouts.find((c) => c._id.toString() === req.params.id.toString() && (req.user.role === 'admin' || String(c.buyerId?._id || c.buyerId) === String(req.user._id)));
      if (!checkout) return res.status(404).json({ error: 'Checkout not found' });
      return res.json(checkout);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve checkout: ' + err.message });
  }
});

export default router;
