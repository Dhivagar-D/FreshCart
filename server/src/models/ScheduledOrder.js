import mongoose from 'mongoose';
const scheduledOrderSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'], required: true },
  items: [{ productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, quantity: { type: Number, required: true, min: 1 } }],
  deliveryAddress: { street: { type: String, required: true }, area: { type: String, default: '' }, city: { type: String, default: '' }, pincode: { type: String, default: '' }, contactPhone: { type: String, default: '' } },
  nextRunAt: { type: Date, required: true }, active: { type: Boolean, default: true },
  lastRunAt: { type: Date, default: null },
}, { timestamps: true });
scheduledOrderSchema.index({ buyerId: 1, active: 1, nextRunAt: 1 });
export const ScheduledOrder = mongoose.model('ScheduledOrder', scheduledOrderSchema);
