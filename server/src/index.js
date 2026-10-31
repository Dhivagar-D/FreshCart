import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { seedDatabase } from './seed.js';
import { User } from './models/User.js';

import authRoutes from './routes/authRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import checkoutRoutes from './routes/checkoutRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import scheduledOrderRoutes from './routes/scheduledOrderRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
}));
// Razorpay webhook signatures require the exact raw request body.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/scheduled-orders', scheduledOrderRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'FreshCart Hyperlocal Marketplace API',
  });
});

// Serve static frontend build
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred',
  });
});

// Boot and Start
async function startServer() {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('REPLACE_')) throw new Error('Configure a unique JWT_SECRET (at least 32 characters) in server/.env before starting FreshCart.');
    await connectDB();

    // Demo seeding is destructive and must be explicitly enabled in development only.
    const userCount = await User.countDocuments();
    if (userCount === 0 && process.env.SEED_DEMO_DATA === 'true' && process.env.NODE_ENV !== 'production') {
      console.warn('[Startup] SEED_DEMO_DATA enabled; creating local demo accounts and sample data.');
      await seedDatabase();
    } else if (userCount === 0) {
      console.log('[Startup] Database is empty. Demo seed skipped; create an admin securely or enable SEED_DEMO_DATA=true for local development only.');
    }

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 FreshCart Full-Stack Live at http://localhost:${PORT}`);
      console.log(`   Frontend UI: http://localhost:${PORT}`);
      console.log(`   API Health:  http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start FreshCart server:', err);
    process.exit(1);
  }
}

startServer();

export default app;
