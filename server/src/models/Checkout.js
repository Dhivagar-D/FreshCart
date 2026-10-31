import mongoose from 'mongoose';

const checkoutSchema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    idempotencyKey: { type: String, required: true, unique: true },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay_route', 'stripe_connect', 'upi', 'cod'],
      default: 'razorpay_route',
    },
    paymentReference: { type: String, default: '' },
    providerPaymentReference: { type: String, default: '' },
    paymentProvider: { type: String, enum: ['razorpay', 'manual', 'cod'], default: 'razorpay' },
    deliverySlot: { type: Date, default: null },
    deliveryFee: { type: Number, min: 0, default: 0 },
    scheduledOrder: { type: Boolean, default: false },
    paidAt: { type: Date, default: null },
    refundReference: { type: String, default: '' },
    orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder' }],
    deliveryAddress: {
      street: { type: String, required: true },
      area: { type: String, default: '' },
      city: { type: String, default: 'Coimbatore' },
      pincode: { type: String, default: '' },
      contactPhone: { type: String, default: '' },
    },
    deliveryCoordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  { timestamps: true }
);

export const Checkout = mongoose.model('Checkout', checkoutSchema);
