import express from 'express'; // Trigger re-compile
import { createBooking, getBookings, getBookingById, getBookingQR, markBookingFailed, cleanOldPendingBookings } from '../controllers/bookingController';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { createBookingSchema } from '../utils/validation';
import { asyncHandler } from '../middleware/errorMiddleware';

const router = express.Router();

router.post('/', authMiddleware, validateRequest(createBookingSchema), asyncHandler(createBooking));
router.get('/', authMiddleware, asyncHandler(getBookings));
router.post('/mark-failed', authMiddleware, asyncHandler(markBookingFailed));
router.post('/cleanup', authMiddleware, adminMiddleware, asyncHandler(cleanOldPendingBookings));
router.get('/:id', authMiddleware, asyncHandler(getBookingById));
router.get('/:id/qr', authMiddleware, asyncHandler(getBookingQR));

export default router;
