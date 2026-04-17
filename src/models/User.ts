import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'USER' | 'ADMIN' | 'STAFF' | 'ORGANIZER';
  interests?: string[];
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  googleId?: string;
  avatar?: string;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  role: { type: String, enum: ['USER', 'ADMIN', 'STAFF', 'ORGANIZER'], default: 'USER', index: true },
  googleId: { type: String, sparse: true, index: true },
  avatar: { type: String },
  interests: [{ type: String }],
  isVerified: { type: Boolean, default: false, index: true },
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, {
  timestamps: true,
});

export default mongoose.model<IUser>('User', UserSchema);