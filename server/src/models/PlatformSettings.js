import mongoose from 'mongoose';

const platformSettingsSchema = new mongoose.Schema(
  {
    commissionPercent: { type: Number, default: 5, min: 0, max: 100 },
    maxDiscoveryRadiusMeters: { type: Number, default: 20000 },
    taxPercent: { type: Number, default: 0 },
    currencySymbol: { type: String, default: '₹' },
  },
  { timestamps: true }
);

export const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);
