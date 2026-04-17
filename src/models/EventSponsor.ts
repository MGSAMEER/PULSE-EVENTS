import mongoose, { Document, Schema } from 'mongoose';

export interface IEventSponsor extends Document {
  eventId: mongoose.Types.ObjectId;
  sponsorId: mongoose.Types.ObjectId;
  displayOrder: number;
}

const EventSponsorSchema: Schema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  sponsorId: { type: Schema.Types.ObjectId, ref: 'Sponsor', required: true },
  displayOrder: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Compound index to prevent duplicate associations
EventSponsorSchema.index({ eventId: 1, sponsorId: 1 }, { unique: true });

export default mongoose.model<IEventSponsor>('EventSponsor', EventSponsorSchema);