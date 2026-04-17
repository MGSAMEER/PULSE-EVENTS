import Joi from 'joi';

// Auth validation schemas
export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid('USER').default('USER'), // SECURITY: Only USER role allowed via registration
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  token: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

// Admin Staff creation schema
export const staffSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

// Event validation schemas
export const createEventSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  date: Joi.date().iso().required(),
  venue: Joi.string().min(3).max(200).required(),
  price: Joi.number().min(0).required(),
  capacity: Joi.number().integer().min(1).required(),
  category: Joi.string().valid('Concert', 'Tech', 'Workshop', 'Sports', 'Party', 'General', 'Music', 'Technology', 'Art', 'Business').default('General'),
  imageUrl: Joi.string().uri(),
  tags: Joi.any().custom((value, helpers) => {
    if (typeof value === 'string' && value.trim() !== '') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // If it's not JSON, assume it's a comma-separated string
        return value.split(',').map(v => v.trim()).filter(v => v !== '');
      }
    }
    if (Array.isArray(value)) return value;
    if (!value || value === '') return [];
    return helpers.error('array.base');
  }).default([]),
  earlyBirdPrice: Joi.number().min(0),
  earlyBirdDeadline: Joi.date().iso(),
});

export const updateEventSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  description: Joi.string().min(10).max(1000),
  date: Joi.date().iso(),
  venue: Joi.string().min(3).max(200),
  price: Joi.number().min(0),
  capacity: Joi.number().integer().min(1),
  category: Joi.string().valid('Concert', 'Tech', 'Workshop', 'Sports', 'Party', 'General', 'Music', 'Technology', 'Art', 'Business'),
  imageUrl: Joi.string().uri(),
  tags: Joi.any().custom((value, helpers) => {
    if (typeof value === 'string' && value.trim() !== '') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return value.split(',').map(v => v.trim()).filter(v => v !== '');
      }
    }
    if (Array.isArray(value)) return value;
    if (!value || value === '') return [];
    return helpers.error('array.base');
  }),
  earlyBirdPrice: Joi.number().min(0),
  earlyBirdDeadline: Joi.date().iso(),
  status: Joi.string().valid('active', 'inactive', 'cancelled', 'completed'),
});

// Booking validation schemas
export const createBookingSchema = Joi.object({
  eventId: Joi.string().required().hex().length(24),
  ticketsCount: Joi.number().integer().min(1).max(10).required(),
});

// Payment validation schemas
export const createOrderSchema = Joi.object({
  bookingId: Joi.string().required().hex().length(24),
});

export const verifyPaymentSchema = Joi.object({
  razorpay_order_id: Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature: Joi.string().required(),
});

// QR validation schemas
export const validateQRSchema = Joi.object({
  qrData: Joi.string().required(),
});

// Sponsor validation schemas
export const createSponsorSchema = Joi.object({
  companyName: Joi.string().required(),
  contactPerson: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  sponsorshipLevel: Joi.string().valid('gold', 'silver', 'bronze').required(),
  agreementTerms: Joi.string().required(),
  paymentAmount: Joi.number().min(0).required(),
  bannerImage: Joi.string().uri(),
  website: Joi.string().uri(),
});

// Admin broadcast schema
export const broadcastAnnouncementSchema = Joi.object({
  subject: Joi.string().min(3).max(200).required(),
  message: Joi.string().min(10).max(5000).required(),
  eventId: Joi.string().hex().length(24).optional(),
});
