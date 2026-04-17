import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  bookingId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  status: 'pending' | 'succeeded' | 'failed';
}

const PaymentSchema: Schema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  razorpayOrderId: { type: String, required: true, index: true },
  razorpayPaymentId: { type: String, index: true },
  status: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending', index: true },
}, {
  timestamps: true,
});

export default mongoose.model<IPayment>('Payment', PaymentSchema);