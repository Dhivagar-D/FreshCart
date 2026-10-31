import mongoose from 'mongoose';

const vendorOrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  subtotal: { type: Number, required: true },
});

const vendorOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    checkoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'Checkout', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    items: [vendorOrderItemSchema],
    subtotal: { type: Number, required: true },
    commissionRate: { type: Number, required: true, default: 5 }, // percentage
    commissionAmount: { type: Number, required: true },
    vendorPayout: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'preparing', 'dispatched', 'delivered', 'cancelled'],
      default: 'pending',
    },
    payoutStatus: {
      type: String,
      enum: ['unsettled', 'scheduled', 'transferred', 'refunded'],
      default: 'unsettled',
    },
    cancellationReason: { type: String, default: '' },
    deliveryPartner: { type: String, default: '' },
    deliveryTrackingCode: { type: String, default: '' },
    estimatedDeliveryAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    deliveryProofUrl: { type: String, default: '' },
    statusHistory: [{ status: String, note: String, changedBy: String, changedAt: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

export const VendorOrder = mongoose.model('VendorOrder', vendorOrderSchema);
