import mongoose, { Document, Schema } from 'mongoose';

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  ticketsCount: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'failed';
  qrCode?: string;
  attended: boolean;
  attendanceLog: Array<{
    scannedBy: mongoose.Types.ObjectId;
    scannedAt: Date;
  }>;
}

const BookingSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  ticketsCount: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending', index: true },
  qrCode: { type: String },
  attended: { type: Boolean, default: false },
  attendanceLog: [{
    scannedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    scannedAt: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

export default mongoose.model<IBooking>('Booking', BookingSchema);