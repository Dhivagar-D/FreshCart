import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './models/User.js';
import { Vendor } from './models/Vendor.js';
import { Product } from './models/Product.js';
import { PlatformSettings } from './models/PlatformSettings.js';
import { connectDB } from './config/db.js';

dotenv.config();

export const seedDatabase = async ({ allowProduction = false } = {}) => {
  if (process.env.NODE_ENV === 'production' && !allowProduction) throw new Error('Demo seeding is disabled in production.');
  if (process.env.SEED_DEMO_DATA !== 'true') throw new Error('Set SEED_DEMO_DATA=true to confirm destructive demo seeding. Existing users, vendors, products and settings will be deleted.');
  try {
    console.log('[Seed] Seeding FreshCart database with initial test data...');

    // Clear existing collections
    await User.deleteMany({});
    await Vendor.deleteMany({});
    await Product.deleteMany({});
    await PlatformSettings.deleteMany({});

    // 1. Platform Settings
    await PlatformSettings.create({
      commissionPercent: 5,
      maxDiscoveryRadiusMeters: 20000,
      currencySymbol: '₹',
    });

    // Passwords hash
    const passwordHash = await bcrypt.hash('password123', 10);
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'admin@freshcart.local';
    const adminName = process.env.ADMIN_NAME?.trim() || 'FreshCart Administrator';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

    // 2. Admin User
    const adminUser = await User.create({
      name: adminName,
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: 'admin',
      phone: '+91 98888 00001',
      businessName: 'FreshCart Marketplace Ops',
    });

    // 3. Restaurant Buyer User
    const buyerUser = await User.create({
      name: 'Chef Rajesh Kumar',
      email: 'buyer@freshcart.local',
      passwordHash: passwordHash,
      role: 'buyer',
      phone: '+91 98888 11111',
      businessName: 'Spice & Basil Bistro (Coimbatore)',
    });

    // Reference Buyer Coordinates: RS Puram, Coimbatore [longitude: 76.9558, latitude: 11.0168]

    // 4. Vendor 1: ~3.2 km away (ELIGIBLE)
    const vendor1User = await User.create({
      name: 'Anand Gowda',
      email: 'anand@farmfresh.local',
      passwordHash: passwordHash,
      role: 'vendor',
      phone: '+91 98888 22222',
      businessName: 'Coimbatore Farm Fresh Produce',
    });

    const vendor1 = await Vendor.create({
      userId: vendor1User._id,
      businessName: 'Coimbatore Farm Fresh Produce',
      description: 'Certified organic vegetables, leafy greens and seasonal herbs harvested daily at sunrise.',
      address: 'Kovaipudur Agricultural Belt, Coimbatore',
      categories: ['Vegetables', 'Herbs & Microgreens', 'Organic Specials'],
      rating: 4.9,
      location: {
        type: 'Point',
        coordinates: [76.965, 11.025], // ~1.4 km from buyer
      },
      verificationStatus: 'approved',
      isActive: true,
    });

    // 5. Vendor 2: ~8.6 km away (ELIGIBLE)
    const vendor2User = await User.create({
      name: 'Suresh Reddy',
      email: 'suresh@kovaigreens.local',
      passwordHash: passwordHash,
      role: 'vendor',
      phone: '+91 98888 33333',
      businessName: 'Kovai Agro Greens & Fruits',
    });

    const vendor2 = await Vendor.create({
      userId: vendor2User._id,
      businessName: 'Kovai Agro Greens & Fruits',
      description: 'High-grade farm fresh fruits, exotic bell peppers, and root vegetables for hotels & restaurants.',
      address: 'Singanallur Organic Farm Depot, Coimbatore',
      categories: ['Fruits', 'Vegetables'],
      rating: 4.7,
      location: {
        type: 'Point',
        coordinates: [76.925, 11.000], // ~4.2 km from buyer
      },
      verificationStatus: 'approved',
      isActive: true,
    });

    // 6. Vendor 3: ~17.4 km away (ELIGIBLE)
    const vendor3User = await User.create({
      name: 'Mahesh Patil',
      email: 'mahesh@coimbatoredairy.local',
      passwordHash: passwordHash,
      role: 'vendor',
      phone: '+91 98888 44444',
      businessName: 'Coimbatore Valley Dairy & Farmstead',
    });

    const vendor3 = await Vendor.create({
      userId: vendor3User._id,
      businessName: 'Coimbatore Valley Dairy & Farmstead',
      description: 'Direct farm milk, artisanal paneer, and natural dairy products from grass-fed cattle.',
      address: 'Thudiyalur Agricultural Cooperative, Coimbatore',
      categories: ['Dairy', 'Organic Specials'],
      rating: 4.8,
      location: {
        type: 'Point',
        coordinates: [76.995, 11.075], // ~8.3 km from buyer
      },
      verificationStatus: 'approved',
      isActive: true,
    });

    // 7. Vendor 4: ~27.2 km away (EXCLUDED from 20km strict search!)
    const vendor4User = await User.create({
      name: 'Ramesh Hegde',
      email: 'ramesh@pollachidrygoods.local',
      passwordHash: passwordHash,
      role: 'vendor',
      phone: '+91 98888 55555',
      businessName: 'Pollachi Dry Goods Cooperative',
    });

    const vendor4 = await Vendor.create({
      userId: vendor4User._id,
      businessName: 'Pollachi Dry Goods Cooperative',
      description: 'Bulk grain, pulses and dry commodities supplier from the Pollachi agricultural belt.',
      address: 'Pollachi Rural Outskirts, Tamil Nadu',
      categories: ['Grains & Pulses'],
      rating: 4.5,
      location: {
        type: 'Point',
        coordinates: [77.12, 11.22], // ~27.5 km (OUTSIDE 20km boundary)
      },
      verificationStatus: 'approved',
      isActive: true,
    });

    // 8. Seed Products for each vendor
    const products = [
      // Vendor 1 (Coimbatore Farm Fresh - approximately 1.4 km)
      {
        vendorId: vendor1._id,
        name: 'Farm Fresh Red Tomatoes',
        category: 'Vegetables',
        description: 'Juicy, vine-ripened organic tomatoes. Ideal for sauces, curries, and salads.',
        price: 45,
        unit: 'kg',
        stock: 250,
        minOrderQty: 5,
        imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=60',
      },
      {
        vendorId: vendor1._id,
        name: 'Organic Red Onions (Grade A)',
        category: 'Vegetables',
        description: 'Firm and pungent red onions with long shelf life.',
        price: 35,
        unit: 'kg',
        stock: 400,
        minOrderQty: 10,
        imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop&q=60',
      },
      {
        vendorId: vendor1._id,
        name: 'Crisp English Spinach (Palak)',
        category: 'Herbs & Microgreens',
        description: 'Fresh hydro-washed spinach bunches picked every morning.',
        price: 25,
        unit: 'bunch',
        stock: 120,
        minOrderQty: 5,
        imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&auto=format&fit=crop&q=60',
      },
      {
        vendorId: vendor1._id,
        name: 'Fresh Coriander & Mint Combo',
        category: 'Herbs & Microgreens',
        description: 'Aromatic herb bundle with high essential oil fragrance.',
        price: 30,
        unit: 'bunch',
        stock: 80,
        minOrderQty: 3,
        imageUrl: 'https://images.unsplash.com/photo-1599818816930-b30a501bf0ea?w=500&auto=format&fit=crop&q=60',
      },

      // Vendor 2 (Kovai Agro Greens & Fruits - approximately 4.2 km)
      {
        vendorId: vendor2._id,
        name: 'Crisp Green Bell Peppers (Capsicum)',
        category: 'Vegetables',
        description: 'Thick-walled crunchy green capsicum suitable for stir fry and continental cooking.',
        price: 65,
        unit: 'kg',
        stock: 150,
        minOrderQty: 5,
        imageUrl: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=500&auto=format&fit=crop&q=60',
      },
      {
        vendorId: vendor2._id,
        name: 'Shimla Royal Apples',
        category: 'Fruits',
        description: 'Sweet, crisp, high-altitude handpicked red apples.',
        price: 160,
        unit: 'kg',
        stock: 80,
        minOrderQty: 5,
        imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=60',
      },
      {
        vendorId: vendor2._id,
        name: 'Robusta Golden Bananas',
        category: 'Fruits',
        description: 'Naturally ripened, rich in potassium, steady commercial grade.',
        price: 45,
        unit: 'kg',
        stock: 200,
        minOrderQty: 10,
        imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&auto=format&fit=crop&q=60',
      },
      {
        vendorId: vendor2._id,
        name: 'Nagpur Sweet Oranges',
        category: 'Fruits',
        description: 'Juicy, seedless citrus perfect for fresh bar & restaurant juice stations.',
        price: 85,
        unit: 'kg',
        stock: 120,
        minOrderQty: 10,
        imageUrl: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=500&auto=format&fit=crop&q=60',
      },

      // Vendor 3 (Coimbatore Valley Dairy - approximately 8.3 km)
      {
        vendorId: vendor3._id,
        name: 'Fresh Farm Cow Milk (Raw)',
        category: 'Dairy',
        description: 'Unprocessed pasteurisation-ready fresh cow milk with 4.2% natural fat.',
        price: 60,
        unit: 'litre',
        stock: 150,
        minOrderQty: 10,
        imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=60',
      },
      {
        vendorId: vendor3._id,
        name: 'Artisanal Fresh Malai Paneer',
        category: 'Dairy',
        description: 'Soft, melt-in-mouth cottage cheese crafted daily without preservatives.',
        price: 380,
        unit: 'kg',
        stock: 60,
        minOrderQty: 2,
        imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=60',
      },
      {
        vendorId: vendor3._id,
        name: 'Pure Desi Cow Ghee (Bilona)',
        category: 'Dairy',
        description: 'Golden granular ghee made via traditional curd churning method.',
        price: 920,
        unit: 'kg',
        stock: 30,
        minOrderQty: 1,
        imageUrl: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=500&auto=format&fit=crop&q=60',
      },

      // Vendor 4 (Pollachi Dry Goods - approximately 28.8 km, Outside 20km)
      {
        vendorId: vendor4._id,
        name: 'Aged Sona Masoori Rice (Bulk Bag)',
        category: 'Grains & Pulses',
        description: 'Double polished aged non-sticky rice for commercial biryanis and meals.',
        price: 62,
        unit: 'kg',
        stock: 1000,
        minOrderQty: 25,
        imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60',
      },
    ];

    await Product.insertMany(products);

    console.log('[Seed] Database successfully seeded with:');
    console.log('   - 1 Admin: admin@freshcart.local / admin123');
    console.log('   - 1 Restaurant Buyer: buyer@freshcart.local / password123');
    console.log('   - 3 Coimbatore-area vendors within 20km');
    console.log('   - 1 Pollachi-area vendor outside 20km to test strict radius cutoff');
    console.log(`   - ${products.length} High-grade fresh produce products`);
  } catch (err) {
    console.error('[Seed Error]:', err);
  }
};

// If run directly via CLI
if (process.argv[1]?.endsWith('seed.js')) {
  if (process.env.NODE_ENV === 'production' || process.env.SEED_DEMO_DATA !== 'true') {
    console.error('Refusing to seed. Set SEED_DEMO_DATA=true in a non-production environment to confirm destructive demo seeding.');
    process.exit(1);
  }
  connectDB().then(async () => {
    await seedDatabase();
    process.exit(0);
  });
}
