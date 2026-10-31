import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Vendor } from '../models/Vendor.js';
import { requireAuth } from '../middleware/auth.js';
import { isConnectedToMongoDB } from '../config/db.js';
import { memoryStore } from '../config/inMemoryStore.js';

const router = Router();

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith('REPLACE_')) throw new Error('JWT_SECRET must be configured with at least 32 characters');
  return jwt.sign({ id: user._id, role: user.role, email: user.email }, secret, {
    expiresIn: '7d',
  });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'buyer', phone = '', businessName = '', address = '', coordinates } = req.body;

    if (!['buyer', 'vendor'].includes(role)) return res.status(400).json({ error: 'Only buyer or vendor registration is allowed. Admin accounts must be provisioned securely.' });
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email address is required' });
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must contain at least 8 characters' });

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (isConnectedToMongoDB) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        phone,
        businessName,
      });

      let vendor = null;
      if (role === 'vendor') {
        const lng = coordinates && Array.isArray(coordinates) ? coordinates[0] : 76.9558;
        const lat = coordinates && Array.isArray(coordinates) ? coordinates[1] : 11.0168;

        vendor = await Vendor.create({
          userId: user._id,
          businessName: businessName || `${name}'s Farm & Fresh Goods`,
          address: address || 'Agricultural Zone, Coimbatore Rural',
          location: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          verificationStatus: 'pending',
        });
      }

      const token = generateToken(user);
      return res.status(201).json({
        message: 'Account registered successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          businessName: user.businessName,
          phone: user.phone,
          vendorId: vendor?._id,
        },
      });
    } else {
      // In-Memory Mode
      const existing = memoryStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUserId = `user_${Date.now()}`;
      const newUser = {
        _id: newUserId,
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        phone,
        businessName,
        status: 'active',
        createdAt: new Date(),
      };
      memoryStore.users.push(newUser);

      let vendor = null;
      if (role === 'vendor') {
        const lng = coordinates && Array.isArray(coordinates) ? coordinates[0] : 76.9558;
        const lat = coordinates && Array.isArray(coordinates) ? coordinates[1] : 11.0168;
        vendor = {
          _id: `vendor_${Date.now()}`,
          userId: newUserId,
          businessName: businessName || `${name}'s Farm`,
          address: address || 'Coimbatore',
          categories: ['Vegetables'],
          rating: 4.8,
          location: { type: 'Point', coordinates: [lng, lat] },
          verificationStatus: 'pending',
          isActive: true,
        };
        memoryStore.vendors.push(vendor);
      }

      const token = generateToken(newUser);
      return res.status(201).json({
        message: 'Account registered successfully',
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          businessName: newUser.businessName,
          phone: newUser.phone,
          vendorId: vendor?._id,
        },
      });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let user = null;
    let vendor = null;

    if (isConnectedToMongoDB) {
      user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(401).json({ error: 'Invalid email or password' });
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) return res.status(401).json({ error: 'Invalid email or password' });

      if (user.role === 'vendor') {
        vendor = await Vendor.findOne({ userId: user._id });
      }
    } else {
      user = memoryStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return res.status(401).json({ error: 'Invalid email or password' });
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) return res.status(401).json({ error: 'Invalid email or password' });

      if (user.role === 'vendor') {
        vendor = memoryStore.vendors.find((v) => v.userId === user._id);
      }
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessName: user.businessName,
        phone: user.phone,
        vendorId: vendor?._id,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Server error during login' });
  }
});

// Current User Profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    let vendor = null;
    if (req.user.role === 'vendor') {
      if (isConnectedToMongoDB) {
        vendor = await Vendor.findOne({ userId: req.user._id });
      } else {
        vendor = memoryStore.vendors.find((v) => v.userId === req.user._id);
      }
    }
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        businessName: req.user.businessName,
        phone: req.user.phone,
        vendorId: vendor?._id,
        vendor,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

export default router;
