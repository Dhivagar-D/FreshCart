import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true },
    description: { type: String, default: '' },
    address: { type: String, required: true },
    categories: [{ type: String }],
    rating: { type: Number, default: 4.8 },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      // Note: GeoJSON coordinate order is [longitude, latitude]
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    isActive: { type: Boolean, default: true },
    stripeAccountId: { type: String, default: '' },
    bankDetails: {
      accountNumber: { type: String, default: '' },
      ifsc: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

// Explicit 2dsphere geospatial index for $near queries
vendorSchema.index({ location: '2dsphere' });

export const Vendor = mongoose.model('Vendor', vendorSchema);
