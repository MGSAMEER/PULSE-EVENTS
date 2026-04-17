import express from 'express';
import authRoutes from './authRoutes';
import eventRoutes from './eventRoutes';
import bookingRoutes from './bookingRoutes';
import paymentRoutes from './paymentRoutes';
import qrRoutes from './qrRoutes';
import adminRoutes from './adminRoutes';
import sponsorRoutes from './sponsorRoutes';
import externalEventRoutes from './externalEventRoutes';

import { apiLimiter } from '../middleware/securityMiddleware';

const router = express.Router();

router.use('/auth', authRoutes); // Auth routes handle their own limiting (authLimiter)

// Apply general API limiter to all other modules
router.use(apiLimiter);

router.use('/events', eventRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/qr', qrRoutes);
router.use('/admin', adminRoutes);
router.use('/sponsors', sponsorRoutes);
router.use('/external-events', externalEventRoutes);

export default router;