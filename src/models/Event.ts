import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  name: string;
  description: string;
  date: Date;
  venue: string;
  price: number;
  category: string;
  tags: string[];
  earlyBirdPrice?: number;
  earlyBirdDeadline?: Date;
  capacity: number;
  availableTickets: number;
  status: 'active' | 'cancelled' | 'completed';
  flyerImage?: string;
  organizer: mongoose.Types.ObjectId;
}

const EventSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  venue: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, default: 'General', index: true },
  tags: [{ type: String }],
  earlyBirdPrice: { type: Number },
  earlyBirdDeadline: { type: Date },
  capacity: { type: Number, required: true },
  availableTickets: { type: Number, required: true },
  flyerImage: { type: String },
  organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['active', 'cancelled', 'completed'], default: 'active', index: true },
}, {
  timestamps: true,
});

// Compound index for the main paginated query: status=active, sorted by date
EventSchema.index({ status: 1, date: 1 });
// Text index for search
EventSchema.index({ name: 'text', venue: 'text' });

export default mongoose.model<IEvent>('Event', EventSchema);