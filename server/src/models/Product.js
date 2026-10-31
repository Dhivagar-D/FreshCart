import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    name: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['Vegetables', 'Fruits', 'Dairy', 'Herbs & Microgreens', 'Grains & Pulses', 'Organic Specials'],
    },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 }, // Price in ₹ per unit
    unit: { type: String, required: true, default: 'kg' }, // kg, bunch, litre, crate, box
    stock: { type: Number, required: true, min: 0 },
    minOrderQty: { type: Number, required: true, default: 1 },
    imageUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    harvestDate: { type: Date, default: Date.now },
    grade: { type: String, enum: ['A', 'B', 'C', 'standard'], default: 'standard' },
    expectedAvailableAt: { type: Date, default: null },
    minimumShelfLifeDays: { type: Number, min: 0, default: 0 },
    origin: { type: String, default: '' },
    organicCertified: { type: Boolean, default: false },
    reservedStock: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

export const Product = mongoose.model('Product', productSchema);
