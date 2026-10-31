import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['buyer', 'vendor', 'admin'], default: 'buyer' },
    phone: { type: String, default: '' },
    businessName: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
