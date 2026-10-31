import { Router } from 'express';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { Vendor } from '../models/Vendor.js';
import { requireAuth } from '../middleware/auth.js';
import { isConnectedToMongoDB } from '../config/db.js';
import { memoryStore } from '../config/inMemoryStore.js';

const router = Router();

function computeGroupedCartInMemory(buyerId) {
  const items = memoryStore.carts.get(buyerId.toString()) || [];
  if (items.length === 0) {
    return { items: [], vendorGroups: [], totalItemsCount: 0, totalAmount: 0 };
  }

  const validItems = [];
  const vendorGroupsMap = new Map();
  let totalAmount = 0;
  let totalItemsCount = 0;

  for (const item of items) {
    const prod = memoryStore.products.find((p) => p._id.toString() === item.productId.toString());
    if (!prod || !prod.isActive) continue;

    const vendor = memoryStore.vendors.find((v) => v._id.toString() === prod.vendorId.toString());
    if (!vendor) continue;

    const price = prod.price;
    const quantity = item.quantity;
    const lineTotal = price * quantity;
    const vendorIdStr = vendor._id.toString();

    totalAmount += lineTotal;
    totalItemsCount += quantity;

    const itemEnriched = {
      productId: prod._id,
      name: prod.name,
      category: prod.category,
      unit: prod.unit,
      price,
      quantity,
      stock: prod.stock,
      minOrderQty: prod.minOrderQty,
      imageUrl: prod.imageUrl,
      subtotal: lineTotal,
      vendorId: vendor._id,
      vendorName: vendor.businessName,
    };

    validItems.push(itemEnriched);

    if (!vendorGroupsMap.has(vendorIdStr)) {
      vendorGroupsMap.set(vendorIdStr, {
        vendorId: vendor._id,
        vendorName: vendor.businessName,
        vendorAddress: vendor.address,
        items: [],
        subtotal: 0,
        itemCount: 0,
      });
    }

    const grp = vendorGroupsMap.get(vendorIdStr);
    grp.items.push(itemEnriched);
    grp.subtotal += lineTotal;
    grp.itemCount += quantity;
  }

  return {
    items: validItems,
    vendorGroups: Array.from(vendorGroupsMap.values()),
    totalItemsCount,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
}

async function computeEnrichedCartMongo(cart) {
  if (!cart || !cart.items || cart.items.length === 0) {
    return { items: [], vendorGroups: [], totalItemsCount: 0, totalAmount: 0 };
  }

  const productIds = cart.items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } }).populate('vendorId', 'businessName address location');

  const productMap = new Map();
  products.forEach((p) => productMap.set(p._id.toString(), p));

  const validItems = [];
  const vendorGroupsMap = new Map();
  let totalAmount = 0;
  let totalItemsCount = 0;

  for (const item of cart.items) {
    const prod = productMap.get(item.productId.toString());
    if (!prod || !prod.isActive) continue;

    const price = prod.price;
    const quantity = item.quantity;
    const lineTotal = price * quantity;
    const vendor = prod.vendorId;
    const vendorIdStr = vendor._id.toString();

    totalAmount += lineTotal;
    totalItemsCount += quantity;

    const itemEnriched = {
      productId: prod._id,
      name: prod.name,
      category: prod.category,
      unit: prod.unit,
      price,
      quantity,
      stock: prod.stock,
      minOrderQty: prod.minOrderQty,
      imageUrl: prod.imageUrl,
      subtotal: lineTotal,
      vendorId: vendor._id,
      vendorName: vendor.businessName,
    };

    validItems.push(itemEnriched);

    if (!vendorGroupsMap.has(vendorIdStr)) {
      vendorGroupsMap.set(vendorIdStr, {
        vendorId: vendor._id,
        vendorName: vendor.businessName,
        vendorAddress: vendor.address,
        items: [],
        subtotal: 0,
        itemCount: 0,
      });
    }

    const grp = vendorGroupsMap.get(vendorIdStr);
    grp.items.push(itemEnriched);
    grp.subtotal += lineTotal;
    grp.itemCount += quantity;
  }

  return {
    rawCartId: cart._id,
    items: validItems,
    vendorGroups: Array.from(vendorGroupsMap.values()),
    totalItemsCount,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
}

// GET /api/cart
router.get('/', requireAuth, async (req, res) => {
  try {
    if (isConnectedToMongoDB) {
      let cart = await Cart.findOne({ buyerId: req.user._id });
      if (!cart) cart = await Cart.create({ buyerId: req.user._id, items: [] });
      const enriched = await computeEnrichedCartMongo(cart);
      return res.json(enriched);
    } else {
      const enriched = computeGroupedCartInMemory(req.user._id);
      return res.json(enriched);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cart: ' + err.message });
  }
});

// POST /api/cart/items
router.post('/items', requireAuth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const requestedQty = parseInt(quantity, 10);

    if (isConnectedToMongoDB) {
      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        return res.status(404).json({ error: 'Product unavailable' });
      }

      let cart = await Cart.findOne({ buyerId: req.user._id });
      if (!cart) cart = new Cart({ buyerId: req.user._id, items: [] });

      const idx = cart.items.findIndex((i) => i.productId.toString() === productId);
      if (idx > -1) {
        cart.items[idx].quantity += requestedQty;
      } else {
        cart.items.push({
          productId: product._id,
          vendorId: product.vendorId,
          quantity: Math.max(requestedQty, product.minOrderQty),
        });
      }
      await cart.save();
      const enriched = await computeEnrichedCartMongo(cart);
      return res.json({ message: 'Added to cart', cart: enriched });
    } else {
      const product = memoryStore.products.find((p) => p._id.toString() === productId.toString());
      if (!product || !product.isActive) {
        return res.status(404).json({ error: 'Product unavailable' });
      }

      let items = memoryStore.carts.get(req.user._id.toString()) || [];
      const idx = items.findIndex((i) => i.productId.toString() === productId.toString());
      if (idx > -1) {
        items[idx].quantity += requestedQty;
      } else {
        items.push({
          productId: product._id,
          vendorId: product.vendorId,
          quantity: Math.max(requestedQty, product.minOrderQty),
        });
      }
      memoryStore.carts.set(req.user._id.toString(), items);
      const enriched = computeGroupedCartInMemory(req.user._id);
      return res.json({ message: 'Added to cart', cart: enriched });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to add item: ' + err.message });
  }
});

// PATCH /api/cart/items/:productId
router.patch('/items/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const qty = parseInt(req.body.quantity, 10);

    if (isConnectedToMongoDB) {
      const cart = await Cart.findOne({ buyerId: req.user._id });
      if (!cart) return res.status(404).json({ error: 'Cart not found' });
      const idx = cart.items.findIndex((i) => i.productId.toString() === productId);
      if (idx === -1) return res.status(404).json({ error: 'Item not in cart' });

      if (qty <= 0) cart.items.splice(idx, 1);
      else cart.items[idx].quantity = qty;

      await cart.save();
      const enriched = await computeEnrichedCartMongo(cart);
      return res.json(enriched);
    } else {
      let items = memoryStore.carts.get(req.user._id.toString()) || [];
      const idx = items.findIndex((i) => i.productId.toString() === productId.toString());
      if (idx === -1) return res.status(404).json({ error: 'Item not in cart' });

      if (qty <= 0) items.splice(idx, 1);
      else items[idx].quantity = qty;

      memoryStore.carts.set(req.user._id.toString(), items);
      const enriched = computeGroupedCartInMemory(req.user._id);
      return res.json(enriched);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item: ' + err.message });
  }
});

// DELETE /api/cart/items/:productId
router.delete('/items/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;

    if (isConnectedToMongoDB) {
      const cart = await Cart.findOne({ buyerId: req.user._id });
      if (!cart) return res.status(404).json({ error: 'Cart not found' });
      cart.items = cart.items.filter((i) => i.productId.toString() !== productId);
      await cart.save();
      const enriched = await computeEnrichedCartMongo(cart);
      return res.json(enriched);
    } else {
      let items = memoryStore.carts.get(req.user._id.toString()) || [];
      items = items.filter((i) => i.productId.toString() !== productId.toString());
      memoryStore.carts.set(req.user._id.toString(), items);
      const enriched = computeGroupedCartInMemory(req.user._id);
      return res.json(enriched);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// DELETE /api/cart (Clear entire cart)
router.delete('/', requireAuth, async (req, res) => {
  try {
    if (isConnectedToMongoDB) {
      await Cart.findOneAndUpdate({ buyerId: req.user._id }, { items: [] });
    } else {
      memoryStore.carts.set(req.user._id.toString(), []);
    }
    res.json({ message: 'Cart cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;
