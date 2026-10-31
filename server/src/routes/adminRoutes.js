import { Router } from 'express';
import { User } from '../models/User.js';
import { Vendor } from '../models/Vendor.js';
import { Checkout } from '../models/Checkout.js';
import { VendorOrder } from '../models/VendorOrder.js';
import { PlatformSettings } from '../models/PlatformSettings.js';
import { AuditLog } from '../models/AuditLog.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { isConnectedToMongoDB } from '../config/db.js';
import { memoryStore } from '../config/inMemoryStore.js';

const router = Router();

router.use(requireAuth, requireRole(['admin']));

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    if (isConnectedToMongoDB) {
      const totalBuyers = await User.countDocuments({ role: 'buyer' });
      const totalVendors = await Vendor.countDocuments();
      const approvedVendors = await Vendor.countDocuments({ verificationStatus: 'approved' });
      const pendingVendors = await Vendor.countDocuments({ verificationStatus: 'pending' });

      const totalCheckouts = await Checkout.countDocuments();
      const totalVendorOrders = await VendorOrder.countDocuments();

      const orderTotals = await VendorOrder.aggregate([
        {
          $group: {
            _id: null,
            grossMerchandiseValue: { $sum: '$subtotal' },
            totalPlatformCommission: { $sum: '$commissionAmount' },
            totalVendorPayouts: { $sum: '$vendorPayout' },
          },
        },
      ]);

      const stats = orderTotals[0] || {
        grossMerchandiseValue: 0,
        totalPlatformCommission: 0,
        totalVendorPayouts: 0,
      };

      let settings = await PlatformSettings.findOne();
      if (!settings) settings = await PlatformSettings.create({ commissionPercent: 5 });

      return res.json({
        metrics: {
          totalBuyers,
          totalVendors,
          approvedVendors,
          pendingVendors,
          totalCheckouts,
          totalVendorOrders,
          grossMerchandiseValue: parseFloat(stats.grossMerchandiseValue.toFixed(2)),
          totalPlatformCommission: parseFloat(stats.totalPlatformCommission.toFixed(2)),
          totalVendorPayouts: parseFloat(stats.totalVendorPayouts.toFixed(2)),
          commissionRatePercent: settings.commissionPercent,
        },
      });
    } else {
      const totalBuyers = memoryStore.users.filter((u) => u.role === 'buyer').length;
      const totalVendors = memoryStore.vendors.length;
      const approvedVendors = memoryStore.vendors.filter((v) => v.verificationStatus === 'approved').length;
      const pendingVendors = memoryStore.vendors.filter((v) => v.verificationStatus === 'pending').length;

      const totalCheckouts = memoryStore.checkouts.length;
      const totalVendorOrders = memoryStore.vendorOrders.length;

      let gmv = 0, commission = 0, payouts = 0;
      memoryStore.vendorOrders.forEach((vo) => {
        gmv += vo.subtotal;
        commission += vo.commissionAmount;
        payouts += vo.vendorPayout;
      });

      return res.json({
        metrics: {
          totalBuyers,
          totalVendors,
          approvedVendors,
          pendingVendors,
          totalCheckouts,
          totalVendorOrders,
          grossMerchandiseValue: parseFloat(gmv.toFixed(2)),
          totalPlatformCommission: parseFloat(commission.toFixed(2)),
          totalVendorPayouts: parseFloat(payouts.toFixed(2)),
          commissionRatePercent: memoryStore.settings.commissionPercent || 5,
        },
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin dashboard: ' + err.message });
  }
});

// GET /api/admin/vendors
router.get('/vendors', async (req, res) => {
  try {
    if (isConnectedToMongoDB) {
      const vendors = await Vendor.find().populate('userId', 'name email phone status');
      return res.json(vendors);
    } else {
      const populated = memoryStore.vendors.map((v) => {
        const u = memoryStore.users.find((user) => user._id.toString() === v.userId?.toString());
        return {
          ...v,
          userId: u || { name: 'Producer', email: 'producer@farm.local' },
        };
      });
      return res.json(populated);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// PATCH /api/admin/vendors/:id/verification
router.patch('/vendors/:id/verification', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid verification status' });
    }

    if (isConnectedToMongoDB) {
      const vendor = await Vendor.findByIdAndUpdate(req.params.id, { verificationStatus: status, isActive: status === 'approved' }, { new: true });
      return res.json({ message: 'Updated', vendor });
    } else {
      const vendor = memoryStore.vendors.find((v) => v._id.toString() === req.params.id.toString());
      if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
      vendor.verificationStatus = status;
      vendor.isActive = status === 'approved';

      memoryStore.auditLogs.unshift({
        action: 'VENDOR_VERIFICATION_STATUS_CHANGED',
        actorId: req.user._id,
        actorRole: 'admin',
        details: { vendorId: vendor._id, newStatus: status, businessName: vendor.businessName },
        timestamp: new Date(),
      });

      return res.json({ message: 'Updated', vendor });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

// GET /api/admin/settings
router.get('/settings', async (req, res) => {
  try {
    if (isConnectedToMongoDB) {
      let settings = await PlatformSettings.findOne();
      if (!settings) settings = await PlatformSettings.create({ commissionPercent: 5 });
      return res.json(settings);
    } else {
      return res.json(memoryStore.settings);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// PATCH /api/admin/settings
router.patch('/settings', async (req, res) => {
  try {
    const { commissionPercent } = req.body;
    if (isConnectedToMongoDB) {
      let settings = await PlatformSettings.findOne();
      if (!settings) settings = new PlatformSettings();
      if (commissionPercent !== undefined) settings.commissionPercent = parseFloat(commissionPercent);
      await settings.save();
      return res.json({ message: 'Settings updated', settings });
    } else {
      if (commissionPercent !== undefined) memoryStore.settings.commissionPercent = parseFloat(commissionPercent);
      memoryStore.auditLogs.unshift({
        action: 'PLATFORM_SETTINGS_UPDATED',
        actorId: req.user._id,
        actorRole: 'admin',
        details: { commissionPercent },
        timestamp: new Date(),
      });
      return res.json({ message: 'Settings updated', settings: memoryStore.settings });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', async (req, res) => {
  try {
    if (isConnectedToMongoDB) {
      const logs = await AuditLog.find().populate('actorId', 'name email role').sort({ timestamp: -1 }).limit(50);
      return res.json(logs);
    } else {
      return res.json(memoryStore.auditLogs.slice(0, 50));
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
