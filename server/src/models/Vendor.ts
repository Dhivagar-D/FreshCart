import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVendor extends Document {
  userId: Types.ObjectId;
  businessName: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  verificationStatus: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  stripeAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    isActive: { type: Boolean, default: true },
    stripeAccountId: { type: String },
  },
  { timestamps: true }
);

// 2dsphere index for geospatial queries
VendorSchema.index({ location: '2dsphere' });

export const Vendor = mongoose.model<IVendor>('Vendor', VendorSchema);
