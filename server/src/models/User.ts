import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'buyer' | 'vendor' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['buyer', 'vendor', 'admin'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
