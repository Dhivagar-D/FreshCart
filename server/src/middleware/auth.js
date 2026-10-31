import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { isConnectedToMongoDB } from '../config/db.js';
import { memoryStore } from '../config/inMemoryStore.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32 || secret.startsWith('REPLACE_')) return res.status(500).json({ error: 'Server authentication secret is not configured securely' });
    const decoded = jwt.verify(token, secret);

    let user = null;
    if (isConnectedToMongoDB) {
      user = await User.findById(decoded.id).select('-passwordHash');
    } else {
      user = memoryStore.users.find((u) => u._id.toString() === decoded.id.toString());
    }

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended or inactive' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
    }
    next();
  };
};

export const requireApprovedVendor = async (req, res, next) => {
  try {
    if (req.user?.role !== 'vendor') return res.status(403).json({ error: 'Vendor access required' });
    if (!isConnectedToMongoDB) return res.status(503).json({ error: 'Vendor approval requires persistent database mode' });
    const { Vendor } = await import('../models/Vendor.js');
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || vendor.verificationStatus !== 'approved' || !vendor.isActive) return res.status(403).json({ error: 'Your vendor profile is awaiting admin approval' });
    req.vendor = vendor;
    next();
  } catch (error) { next(error); }
};
