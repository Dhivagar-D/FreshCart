import { Router } from 'express';
import { Product } from '../models/Product.js';
import { Vendor } from '../models/Vendor.js';
import { requireAuth, requireRole, requireApprovedVendor } from '../middleware/auth.js';
import { isConnectedToMongoDB } from '../config/db.js';
import { memoryStore } from '../config/inMemoryStore.js';
import { VendorOrder } from '../models/VendorOrder.js';

const router = Router();


// GET /api/products/forecast — transparent baseline based on recent order history, not an ML guarantee.
router.get('/forecast/summary', requireAuth, requireRole(['vendor', 'admin']), async (req, res) => {
  try {
    if (!isConnectedToMongoDB) return res.status(503).json({ error: 'Demand forecast requires persistent MongoDB data' });
    let vendorFilter = {};
    if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ userId: req.user._id, verificationStatus: 'approved', isActive: true });
      if (!vendor) return res.status(403).json({ error: 'Vendor account is not approved' });
      vendorFilter = { vendorId: vendor._id };
    }
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const orders = await VendorOrder.find({ ...vendorFilter, createdAt: { $gte: since }, status: { $nin: ['cancelled'] } }).select('items createdAt');
    const demand = new Map();
    for (const order of orders) for (const item of order.items) {
      const key = String(item.productId);
      const current = demand.get(key) || { unitsOrdered: 0, orderLines: 0 };
      current.unitsOrdered += Number(item.quantity) || 0; current.orderLines += 1; demand.set(key, current);
    }
    const products = await Product.find({ ...vendorFilter, isActive: true }).select('name stock unit minOrderQty');
    const forecast = products.map((product) => {
      const sold = demand.get(String(product._id))?.unitsOrdered || 0;
      const dailyAverage = sold / 30;
      const suggestedReorder = Math.max(0, Math.ceil(dailyAverage * 7 - product.stock));
      return { productId: product._id, name: product.name, stock: product.stock, unit: product.unit, unitsOrderedLast30Days: sold, averageDailyDemand: Number(dailyAverage.toFixed(2)), estimatedNext7Days: Number((dailyAverage * 7).toFixed(2)), suggestedReorder: suggestedReorder > 0 ? Math.max(suggestedReorder, product.minOrderQty) : 0 };
    }).sort((a, b) => b.suggestedReorder - a.suggestedReorder);
    return res.json({ method: '30-day moving average baseline', windowDays: 30, forecastDays: 7, disclaimer: 'Planning estimate only. Weather, seasonality, stockouts and canceled/partial orders are not modeled.', products: forecast });
  } catch (err) { return res.status(500).json({ error: 'Failed to calculate demand forecast' }); }
});

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category, vendorId, search, inStockOnly = 'true' } = req.query;

    if (isConnectedToMongoDB) {
      const approvedVendors = await Vendor.find({ verificationStatus: 'approved', isActive: true }).distinct('_id');
      const filter = { isActive: true, vendorId: { $in: approvedVendors } };
      if (category && category !== 'All') filter.category = category;
      if (vendorId) filter.vendorId = vendorId;
      if (inStockOnly === 'true') filter.stock = { $gt: 0 };
      if (search) filter.name = { $regex: search, $options: 'i' };

      const products = await Product.find(filter)
        .populate('vendorId', 'businessName rating address location verificationStatus')
        .sort({ createdAt: -1 });

      return res.json(products);
    } else {
      let filtered = memoryStore.products.filter((p) => p.isActive && memoryStore.vendors.some((v) => String(v._id) === String(p.vendorId) && v.verificationStatus === 'approved' && v.isActive));

      if (category && category !== 'All') {
        filtered = filtered.filter((p) => p.category === category);
      }
      if (vendorId) {
        filtered = filtered.filter((p) => p.vendorId.toString() === vendorId.toString());
      }
      if (inStockOnly === 'true') {
        filtered = filtered.filter((p) => p.stock > 0);
      }
      if (search) {
        filtered = filtered.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
      }

      // Attach vendor details
      const populated = filtered.map((p) => {
        const vendor = memoryStore.vendors.find((v) => v._id.toString() === p.vendorId.toString());
        return {
          ...p,
          vendorId: vendor || { businessName: 'Local Producer' },
        };
      });

      return res.json(populated);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products: ' + err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    if (isConnectedToMongoDB) {
      const product = await Product.findOne({ _id: req.params.id, isActive: true }).populate('vendorId', 'businessName rating address verificationStatus isActive');
      if (product && (product.vendorId?.verificationStatus !== 'approved' || !product.vendorId?.isActive)) return res.status(404).json({ error: 'Product not found' });
      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.json(product);
    } else {
      const product = memoryStore.products.find((p) => p._id.toString() === req.params.id.toString());
      if (!product) return res.status(404).json({ error: 'Product not found' });
      const vendor = memoryStore.vendors.find((v) => v._id.toString() === product.vendorId.toString());
      return res.json({ ...product, vendorId: vendor });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products (Vendor only)
router.post('/', requireAuth, requireRole(['vendor']), requireApprovedVendor, async (req, res) => {
  try {
    const { name, category, description, price, unit = 'kg', stock = 0, minOrderQty = 1, imageUrl = '', harvestDate, grade = 'standard', expectedAvailableAt, minimumShelfLifeDays = 0, origin = '', organicCertified = false } = req.body;

    if (!name || !category || price === undefined || stock === undefined) {
      return res.status(400).json({ error: 'Product name, category, price, and stock are required' });
    }

    if (!Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isFinite(Number(stock)) || Number(stock) < 0 || !Number.isFinite(Number(minOrderQty)) || Number(minOrderQty) <= 0) return res.status(400).json({ error: 'Price and stock must be non-negative; minimum order quantity must be positive' });

    if (isConnectedToMongoDB) {
      const vendor = await Vendor.findOne({ userId: req.user._id });
      if (!vendor) return res.status(403).json({ error: 'No associated vendor profile found' });

      const product = await Product.create({
        vendorId: vendor._id,
        name,
        category,
        description,
        price: parseFloat(price),
        unit,
        stock: parseInt(stock, 10),
        minOrderQty: parseInt(minOrderQty, 10) || 1,
        imageUrl,
        isActive: true,
        harvestDate: harvestDate || new Date(), grade, expectedAvailableAt: expectedAvailableAt || null,
        minimumShelfLifeDays: Number(minimumShelfLifeDays) || 0, origin, organicCertified: Boolean(organicCertified),
      });

      return res.status(201).json(product);
    } else {
      const vendor = memoryStore.vendors.find((v) => v.userId === req.user._id);
      if (!vendor) return res.status(403).json({ error: 'No associated vendor profile found' });

      const newProduct = {
        _id: `prod_${Date.now()}`,
        vendorId: vendor._id,
        name,
        category,
        description,
        price: parseFloat(price),
        unit,
        stock: parseInt(stock, 10),
        minOrderQty: parseInt(minOrderQty, 10) || 1,
        imageUrl,
        isActive: true, harvestDate: harvestDate || new Date(), grade, expectedAvailableAt: expectedAvailableAt || null,
        minimumShelfLifeDays: Number(minimumShelfLifeDays) || 0, origin, organicCertified: Boolean(organicCertified),
      };

      memoryStore.products.unshift(newProduct);
      return res.status(201).json(newProduct);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product: ' + err.message });
  }
});

// PUT /api/products/:id (Vendor only)
router.put('/:id', requireAuth, requireRole(['vendor']), requireApprovedVendor, async (req, res) => {
  try {
    const { name, category, description, price, unit, stock, minOrderQty, imageUrl, isActive, harvestDate, grade, expectedAvailableAt, minimumShelfLifeDays, origin, organicCertified } = req.body;

    if (price !== undefined && (!Number.isFinite(Number(price)) || Number(price) < 0)) return res.status(400).json({ error: 'Price must be a non-negative number' });
    if (stock !== undefined && (!Number.isFinite(Number(stock)) || Number(stock) < 0)) return res.status(400).json({ error: 'Stock must be a non-negative number' });
    if (minOrderQty !== undefined && (!Number.isFinite(Number(minOrderQty)) || Number(minOrderQty) <= 0)) return res.status(400).json({ error: 'Minimum order quantity must be positive' });

    if (isConnectedToMongoDB) {
      const vendor = await Vendor.findOne({ userId: req.user._id });
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      if (product.vendorId.toString() !== vendor._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized: Cannot edit another vendor\'s product' });
      }

      if (name !== undefined) product.name = name;
      if (category !== undefined) product.category = category;
      if (description !== undefined) product.description = description;
      if (price !== undefined) product.price = parseFloat(price);
      if (unit !== undefined) product.unit = unit;
      if (stock !== undefined) product.stock = parseInt(stock, 10);
      if (minOrderQty !== undefined) product.minOrderQty = parseInt(minOrderQty, 10);
      if (imageUrl !== undefined) product.imageUrl = imageUrl;
      if (isActive !== undefined) product.isActive = Boolean(isActive);
      if (harvestDate !== undefined) product.harvestDate = harvestDate;
      if (grade !== undefined) product.grade = grade;
      if (expectedAvailableAt !== undefined) product.expectedAvailableAt = expectedAvailableAt || null;
      if (minimumShelfLifeDays !== undefined) product.minimumShelfLifeDays = Number(minimumShelfLifeDays);
      if (origin !== undefined) product.origin = origin;
      if (organicCertified !== undefined) product.organicCertified = Boolean(organicCertified);

      await product.save();
      return res.json(product);
    } else {
      const vendor = memoryStore.vendors.find((v) => v.userId === req.user._id);
      const product = memoryStore.products.find((p) => p._id.toString() === req.params.id.toString());
      if (!product) return res.status(404).json({ error: 'Product not found' });
      if (product.vendorId.toString() !== vendor._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized: Cannot edit another vendor\'s product' });
      }

      if (name !== undefined) product.name = name;
      if (category !== undefined) product.category = category;
      if (description !== undefined) product.description = description;
      if (price !== undefined) product.price = parseFloat(price);
      if (unit !== undefined) product.unit = unit;
      if (stock !== undefined) product.stock = parseInt(stock, 10);
      if (minOrderQty !== undefined) product.minOrderQty = parseInt(minOrderQty, 10);
      if (imageUrl !== undefined) product.imageUrl = imageUrl;
      if (isActive !== undefined) product.isActive = Boolean(isActive);
      if (harvestDate !== undefined) product.harvestDate = harvestDate;
      if (grade !== undefined) product.grade = grade;
      if (expectedAvailableAt !== undefined) product.expectedAvailableAt = expectedAvailableAt || null;
      if (minimumShelfLifeDays !== undefined) product.minimumShelfLifeDays = Number(minimumShelfLifeDays);
      if (origin !== undefined) product.origin = origin;
      if (organicCertified !== undefined) product.organicCertified = Boolean(organicCertified);

      return res.json(product);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product: ' + err.message });
  }
});

// DELETE /api/products/:id (Vendor only)
router.delete('/:id', requireAuth, requireRole(['vendor']), requireApprovedVendor, async (req, res) => {
  try {
    if (isConnectedToMongoDB) {
      const vendor = await Vendor.findOne({ userId: req.user._id });
      const product = await Product.findOne({ _id: req.params.id, vendorId: vendor?._id });
      if (!product) return res.status(404).json({ error: 'Product not found or not owned by this vendor' });

      await Product.deleteOne({ _id: product._id });
      return res.json({ message: 'Product removed successfully', productId: product._id });
    }

    const vendor = memoryStore.vendors.find((v) => v.userId === req.user._id);
    const productIndex = memoryStore.products.findIndex(
      (p) => p._id.toString() === req.params.id.toString() && p.vendorId.toString() === vendor?._id.toString()
    );
    if (productIndex === -1) return res.status(404).json({ error: 'Product not found or not owned by this vendor' });

    const [product] = memoryStore.products.splice(productIndex, 1);
    return res.json({ message: 'Product removed successfully', productId: product._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove product: ' + err.message });
  }
});

export default router;
