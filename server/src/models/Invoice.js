import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    checkoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'Checkout', required: true },
    buyerName: { type: String, required: true },
    buyerEmail: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, default: 'completed' },
    issuedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Invoice = mongoose.model('Invoice', invoiceSchema);
