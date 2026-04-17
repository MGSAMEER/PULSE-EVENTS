import mongoose, { Schema, Document } from 'mongoose';

export interface IExternalEvent extends Document {
  title: string;
  description?: string;
  date: Date;
  location: string;
  city: string;
  image: string;
  source: string; // 'Ticketmaster', 'Eventbrite', etc.
  externalUrl: string;
  category: string;
  isApproved: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

const ExternalEventSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  city: { type: String, required: true, index: true },
  image: { type: String },
  source: { type: String, required: true },
  externalUrl: { type: String, required: true, unique: true },
  category: { type: String, default: 'General', index: true },
  isApproved: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IExternalEvent>('ExternalEvent', ExternalEventSchema);
