import { Router } from 'express';
import { Vendor } from '../models/Vendor.js';
import { Product } from '../models/Product.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { isConnectedToMongoDB } from '../config/db.js';
import { memoryStore } from '../config/inMemoryStore.js';

const router = Router();

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

// GET /api/vendors/nearby (Strict <= 20km)
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing coordinates. Provide latitude and longitude query parameters.',
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Coordinates provided are invalid numbers or out of range.' });
    }

    if (isConnectedToMongoDB) {
      const MAX_DISTANCE_METERS = 20000;
      const eligibleVendors = await Vendor.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            $maxDistance: MAX_DISTANCE_METERS,
          },
        },
        isActive: true,
        verificationStatus: 'approved',
      }).populate('userId', 'name email phone');

      const enriched = await Promise.all(
        eligibleVendors.map(async (v) => {
          const vendorObj = v.toObject();
          const vendorLng = v.location.coordinates[0];
          const vendorLat = v.location.coordinates[1];
          const distanceKm = calculateHaversineKm(lat, lng, vendorLat, vendorLng);
          const productCount = await Product.countDocuments({ vendorId: v._id, isActive: true, stock: { $gt: 0 } });

          return {
            ...vendorObj,
            distanceKm,
            productCount,
            isEligible: distanceKm <= 20.0,
          };
        })
      );

      return res.json({
        buyerCoordinates: { latitude: lat, longitude: lng },
        searchRadiusKm: 20,
        totalFound: enriched.length,
        vendors: enriched,
      });
    } else {
      // In-Memory Geospatial Calculation
      const eligible = [];
      for (const v of memoryStore.vendors) {
        if (!v.isActive || v.verificationStatus !== 'approved') continue;
        const vLng = v.location.coordinates[0];
        const vLat = v.location.coordinates[1];
        const distanceKm = calculateHaversineKm(lat, lng, vLat, vLng);

        if (distanceKm <= 20.0) {
          const productCount = memoryStore.products.filter(
            (p) => p.vendorId.toString() === v._id.toString() && p.isActive && p.stock > 0
          ).length;

          eligible.push({
            ...v,
            distanceKm,
            productCount,
            isEligible: true,
          });
        }
      }

      eligible.sort((a, b) => a.distanceKm - b.distanceKm);

      return res.json({
        buyerCoordinates: { latitude: lat, longitude: lng },
        searchRadiusKm: 20,
        totalFound: eligible.length,
        vendors: eligible,
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to search nearby vendors: ' + err.message });
  }
});

// GET /api/vendors (All vendors with distance relative to buyer)
router.get('/', async (req, res) => {
  try {
    const { buyerLat, buyerLng } = req.query;

    if (isConnectedToMongoDB) {
      const vendors = await Vendor.find({ verificationStatus: 'approved', isActive: true }).populate('userId', 'name email phone');
      const mapped = vendors.map((v) => {
        const vObj = v.toObject();
        if (buyerLat && buyerLng) {
          const vLng = v.location.coordinates[0];
          const vLat = v.location.coordinates[1];
          vObj.distanceKm = calculateHaversineKm(parseFloat(buyerLat), parseFloat(buyerLng), vLat, vLng);
          vObj.isWithin20km = vObj.distanceKm <= 20.0;
        }
        return vObj;
      });
      return res.json(mapped);
    } else {
      const mapped = memoryStore.vendors.filter((v) => v.verificationStatus === 'approved' && v.isActive).map((v) => {
        const vObj = { ...v };
        if (buyerLat && buyerLng) {
          const vLng = v.location.coordinates[0];
          const vLat = v.location.coordinates[1];
          vObj.distanceKm = calculateHaversineKm(parseFloat(buyerLat), parseFloat(buyerLng), vLat, vLng);
          vObj.isWithin20km = vObj.distanceKm <= 20.0;
        }
        return vObj;
      });
      return res.json(mapped);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// GET /api/vendors/:id
router.get('/:id', async (req, res) => {
  try {
    if (isConnectedToMongoDB) {
      const vendor = await Vendor.findById(req.params.id).populate('userId', 'name email phone');
      if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
      return res.json(vendor);
    } else {
      const vendor = memoryStore.vendors.find((v) => v._id.toString() === req.params.id.toString());
      if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
      return res.json(vendor);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

// PUT /api/vendors/profile
router.put('/profile', requireAuth, requireRole(['vendor']), async (req, res) => {
  try {
    const { businessName, description, address, coordinates, categories } = req.body;

    if (isConnectedToMongoDB) {
      let vendor = await Vendor.findOne({ userId: req.user._id });
      if (!vendor) vendor = new Vendor({ userId: req.user._id });
      if (businessName) vendor.businessName = businessName;
      if (description !== undefined) vendor.description = description;
      if (address) vendor.address = address;
      if (categories) vendor.categories = categories;
      if (coordinates && Array.isArray(coordinates)) {
        vendor.location = { type: 'Point', coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])] };
      }
      await vendor.save();
      return res.json({ message: 'Vendor profile updated', vendor });
    } else {
      let vendor = memoryStore.vendors.find((v) => v.userId === req.user._id);
      if (!vendor) {
        vendor = { _id: `v_${Date.now()}`, userId: req.user._id };
        memoryStore.vendors.push(vendor);
      }
      if (businessName) vendor.businessName = businessName;
      if (description !== undefined) vendor.description = description;
      if (address) vendor.address = address;
      if (categories) vendor.categories = categories;
      if (coordinates && Array.isArray(coordinates)) {
        vendor.location = { type: 'Point', coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])] };
      }
      return res.json({ message: 'Vendor profile updated', vendor });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update vendor: ' + err.message });
  }
});

export default router;
