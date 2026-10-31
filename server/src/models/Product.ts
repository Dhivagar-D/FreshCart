import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProduct extends Document {
  vendorId: Types.ObjectId;
  name: string;
  category: string;
  description?: string;
  priceCents: number; // stored as minor unit
  stock: number; // quantity in unit (kg, litre, etc.)
  unit: string; // e.g., "kg", "L"
  minOrderQty: number;
  isActive: boolean;
  images?: string[]; // URLs to stored images
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String },
    priceCents: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    minOrderQty: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true },
    images: [{ type: String }],
  },
  { timestamps: true }
);

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
