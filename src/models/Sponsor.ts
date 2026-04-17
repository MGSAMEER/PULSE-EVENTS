import mongoose, { Document, Schema } from 'mongoose';

export interface ISponsor extends Document {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  sponsorshipLevel: 'gold' | 'silver' | 'bronze';
  agreementTerms: string;
  paymentAmount: number;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  bannerImage?: string;
  website?: string;
}

const SponsorSchema: Schema = new Schema({
  companyName: { type: String, required: true },
  contactPerson: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  sponsorshipLevel: { type: String, enum: ['gold', 'silver', 'bronze'], required: true },
  agreementTerms: { type: String, required: true },
  paymentAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
  bannerImage: { type: String },
  website: { type: String },
}, {
  timestamps: true,
});

export default mongoose.model<ISponsor>('Sponsor', SponsorSchema);