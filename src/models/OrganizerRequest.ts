import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganizerRequest extends Document {
  userId: mongoose.Types.ObjectId;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  businessDetails: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizerRequestSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  reason: { type: String, required: true },
  businessDetails: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<IOrganizerRequest>('OrganizerRequest', OrganizerRequestSchema);
