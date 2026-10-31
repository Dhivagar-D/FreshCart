import bcrypt from 'bcryptjs';

// Pre-generated ID constants for consistent references
export const ID_ADMIN = '660000000000000000000001';
export const ID_BUYER = '660000000000000000000002';
export const ID_VENDOR1_USER = '660000000000000000000003';
export const ID_VENDOR2_USER = '660000000000000000000004';
export const ID_VENDOR3_USER = '660000000000000000000005';
export const ID_VENDOR4_USER = '660000000000000000000006';

export const ID_VENDOR1 = '770000000000000000000001';
export const ID_VENDOR2 = '770000000000000000000002';
export const ID_VENDOR3 = '770000000000000000000003';
export const ID_VENDOR4 = '770000000000000000000004';

const passwordHash = bcrypt.hashSync('password123', 10);
const adminPasswordHash = bcrypt.hashSync('admin123', 10);

export const memoryStore = {
  users: [
    {
      _id: ID_ADMIN,
      name: 'FreshCart Administrator',
      email: 'admin@freshcart.local',
      passwordHash: adminPasswordHash,
      role: 'admin',
      phone: '+91 98888 00001',
      businessName: 'FreshCart Marketplace Ops',
      status: 'active',
      createdAt: new Date(),
    },
    {
      _id: ID_BUYER,
      name: 'Chef Rajesh Kumar',
      email: 'buyer@freshcart.local',
      passwordHash: passwordHash,
      role: 'buyer',
      phone: '+91 98888 11111',
      businessName: 'Spice & Basil Bistro (Coimbatore)',
      status: 'active',
      createdAt: new Date(),
    },
    {
      _id: ID_VENDOR1_USER,
      name: 'Anand Gowda',
      email: 'anand@farmfresh.local',
      passwordHash: passwordHash,
      role: 'vendor',
      phone: '+91 98888 22222',
      businessName: 'Coimbatore Farm Fresh Produce',
      status: 'active',
      createdAt: new Date(),
    },
    {
      _id: ID_VENDOR2_USER,
      name: 'Suresh Reddy',
      email: 'suresh@kovaigreens.local',
      passwordHash: passwordHash,
      role: 'vendor',
      phone: '+91 98888 33333',
      businessName: 'Kovai Agro Greens & Fruits',
      status: 'active',
      createdAt: new Date(),
    },
    {
      _id: ID_VENDOR3_USER,
      name: 'Mahesh Patil',
      email: 'mahesh@coimbatoredairy.local',
      passwordHash: passwordHash,
      role: 'vendor',
      phone: '+91 98888 44444',
      businessName: 'Coimbatore Valley Dairy & Farmstead',
      status: 'active',
      createdAt: new Date(),
    },
    {
      _id: ID_VENDOR4_USER,
      name: 'Ramesh Hegde',
      email: 'ramesh@pollachidrygoods.local',
      passwordHash: passwordHash,
      role: 'vendor',
      phone: '+91 98888 55555',
      businessName: 'Pollachi Dry Goods Cooperative',
      status: 'active',
      createdAt: new Date(),
    },
  ],

  vendors: [
    {
      _id: ID_VENDOR1,
      userId: ID_VENDOR1_USER,
      businessName: 'Coimbatore Farm Fresh Produce',
      description: 'Certified organic vegetables, leafy greens and seasonal herbs harvested daily at sunrise.',
      address: 'Kovaipudur Agricultural Belt, Coimbatore',
      categories: ['Vegetables', 'Herbs & Microgreens', 'Organic Specials'],
      rating: 4.9,
      location: {
        type: 'Point',
        coordinates: [76.965, 11.025], // ~1.4 km
      },
      verificationStatus: 'approved',
      isActive: true,
      stripeAccountId: 'acct_test_farmfresh',
    },
    {
      _id: ID_VENDOR2,
      userId: ID_VENDOR2_USER,
      businessName: 'Kovai Agro Greens & Fruits',
      description: 'High-grade farm fresh fruits, exotic bell peppers, and root vegetables for hotels & restaurants.',
      address: 'Singanallur Organic Farm Depot, Coimbatore',
      categories: ['Fruits', 'Vegetables'],
      rating: 4.7,
      location: {
        type: 'Point',
        coordinates: [76.925, 11.000], // ~4.2 km
      },
      verificationStatus: 'approved',
      isActive: true,
      stripeAccountId: 'acct_test_kovaigreens',
    },
    {
      _id: ID_VENDOR3,
      userId: ID_VENDOR3_USER,
      businessName: 'Coimbatore Valley Dairy & Farmstead',
      description: 'Direct farm milk, artisanal paneer, and natural dairy products from grass-fed cattle.',
      address: 'Thudiyalur Agricultural Cooperative, Coimbatore',
      categories: ['Dairy', 'Organic Specials'],
      rating: 4.8,
      location: {
        type: 'Point',
        coordinates: [76.995, 11.075], // ~8.3 km
      },
      verificationStatus: 'approved',
      isActive: true,
      stripeAccountId: 'acct_test_coimbatoredairy',
    },
    {
      _id: ID_VENDOR4,
      userId: ID_VENDOR4_USER,
      businessName: 'Pollachi Dry Goods Cooperative',
      description: 'Bulk grain, pulses and dry commodities supplier from the Pollachi agricultural belt.',
      address: 'Pollachi Rural Outskirts, Tamil Nadu',
      categories: ['Grains & Pulses'],
      rating: 4.5,
      location: {
        type: 'Point',
        coordinates: [77.120, 11.220], // ~27.5 km (OUTSIDE 20km)
      },
      verificationStatus: 'approved',
      isActive: true,
      stripeAccountId: 'acct_test_ruralagro',
    },
  ],

  products: [
    // Vendor 1 (Coimbatore Farm Fresh - approximately 1.4km)
    {
      _id: '880000000000000000000001',
      vendorId: ID_VENDOR1,
      name: 'Farm Fresh Red Tomatoes',
      category: 'Vegetables',
      description: 'Juicy, vine-ripened organic tomatoes. Ideal for sauces, curries, and salads.',
      price: 45,
      unit: 'kg',
      stock: 250,
      minOrderQty: 5,
      imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=60',
      isActive: true,
    },
    {
      _id: '880000000000000000000002',
      vendorId: ID_VENDOR1,
      name: 'Organic Red Onions (Grade A)',
      category: 'Vegetables',
      description: 'Firm and pungent red onions with long shelf life.',
      price: 35,
      unit: 'kg',
      stock: 400,
      minOrderQty: 10,
      imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop&q=60',
      isActive: true,
    },
    {
      _id: '880000000000000000000003',
      vendorId: ID_VENDOR1,
      name: 'Crisp English Spinach (Palak)',
      category: 'Herbs & Microgreens',
      description: 'Fresh hydro-washed spinach bunches picked every morning.',
      price: 25,
      unit: 'bunch',
      stock: 120,
      minOrderQty: 5,
      imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&auto=format&fit=crop&q=60',
      isActive: true,
    },
    {
      _id: '880000000000000000000004',
      vendorId: ID_VENDOR1,
      name: 'Fresh Coriander & Mint Combo',
      category: 'Herbs & Microgreens',
      description: 'Aromatic herb bundle with high essential oil fragrance.',
      price: 30,
      unit: 'bunch',
      stock: 80,
      minOrderQty: 3,
      imageUrl: 'https://images.unsplash.com/photo-1599818816930-b30a501bf0ea?w=500&auto=format&fit=crop&q=60',
      isActive: true,
    },

    // Vendor 2 (Kovai Agro Greens - approximately 4.2km)
    {
      _id: '880000000000000000000005',
      vendorId: ID_VENDOR2,
      name: 'Crisp Green Bell Peppers (Capsicum)',
      category: 'Vegetables',
      description: 'Thick-walled crunchy green capsicum suitable for stir fry and continental cooking.',
      price: 65,
      unit: 'kg',
      stock: 150,
      minOrderQty: 5,
      imageUrl: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=500&auto=format&fit=crop&q=60',
      isActive: true,
    },
    {
      _id: '880000000000000000000006',
      vendorId: ID_VENDOR2,
      name: 'Shimla Royal Apples',
      category: 'Fruits',
      description: 'Sweet, crisp, high-altitude handpicked red apples.',
      price: 160,
      unit: 'kg',
      stock: 80,
      minOrderQty: 5,
      imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=60',
      isActive: true,
    },
    {
      _id: '880000000000000000000007',
      vendorId: ID_VENDOR2,
      name: 'Robusta Golden Bananas',
      category: 'Fruits',
      description: 'Naturally ripened, rich in potassium, steady commercial grade.',
      price: 45,
      unit: 'kg',
      stock: 200,
      minOrderQty: 10,
      imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&auto=format&fit=crop&q=60',
      isActive: true,
    },
    {
      _id: '880000000000000000000008',
      vendorId: ID_VENDOR2,
      name: 'Nagpur Sweet Oranges',
      category: 'Fruits',
      description: 'Juicy, seedless citrus perfect for fresh bar & restaurant juice stations.',
      price: 85,
      unit: 'kg',
      stock: 120,
      minOrderQty: 10,
      imageUrl: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=500&auto=format&fit=crop&q=60',
      isActive: true,
    },

    // Vendor 3 (Coimbatore Valley Dairy - approximately 8.3km)
    {
      _id: '880000000000000000000009',
      vendorId: ID_VENDOR3,
      name: 'Fresh Farm Cow Milk (Raw)',
      category: 'Dairy',
      description: 'Unprocessed pasteurisation-ready fresh cow milk with 4.2% natural fat.',
      price: 60,
      unit: 'litre',
      stock: 150,
      minOrderQty: 10,
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=60',
      isActive: true,
    },
    {
      _id: '880000000000000000000010',
      vendorId: ID_VENDOR3,
      name: 'Artisanal Fresh Malai Paneer',
      category: 'Dairy',
      description: 'Soft, melt-in-mouth cottage cheese crafted daily without preservatives.',
      price: 380,
      unit: 'kg',
      stock: 60,
      minOrderQty: 2,
      imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=60',
      isActive: true,
    },
    {
      _id: '880000000000000000000011',
      vendorId: ID_VENDOR3,
      name: 'Pure Desi Cow Ghee (Bilona)',
      category: 'Dairy',
      description: 'Golden granular ghee made via traditional curd churning method.',
      price: 920,
      unit: 'kg',
      stock: 30,
      minOrderQty: 1,
      imageUrl: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=500&auto=format&fit=crop&q=60',
      isActive: true,
    },

    // Vendor 4 (Pollachi Dry Goods - approximately 28.8km, OUTSIDE 20km)
    {
      _id: '880000000000000000000012',
      vendorId: ID_VENDOR4,
      name: 'Aged Sona Masoori Rice (Bulk Bag)',
      category: 'Grains & Pulses',
      description: 'Double polished aged non-sticky rice for commercial biryanis and meals.',
      price: 62,
      unit: 'kg',
      stock: 1000,
      minOrderQty: 25,
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60',
      isActive: true,
    },
  ],

  carts: new Map(), // buyerId -> items array
  checkouts: [],
  vendorOrders: [],
  settings: {
    commissionPercent: 5,
    maxDiscoveryRadiusMeters: 20000,
    currencySymbol: '₹',
  },
  auditLogs: [
    {
      action: 'SYSTEM_BOOT',
      actorRole: 'system',
      details: { mode: 'Production Modular Monolith' },
      timestamp: new Date(),
    },
  ],
};
