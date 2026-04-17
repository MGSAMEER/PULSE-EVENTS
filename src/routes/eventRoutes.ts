import express from 'express';
import { getEvents, getEventById, createEvent, updateEvent, deleteEvent, getRecommendedEvents } from '../controllers/eventController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { createEventSchema, updateEventSchema } from '../utils/validation';
import { asyncHandler } from '../middleware/errorMiddleware';
import { eventUpload } from '../utils/cloudinary';
import { scraperLimiter, aiLimiter } from '../middleware/securityMiddleware';

const router = express.Router();

router.get('/', scraperLimiter, asyncHandler(getEvents));
router.get('/recommendations', authMiddleware, aiLimiter, asyncHandler(getRecommendedEvents));
router.get('/:id', asyncHandler(getEventById));
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'ORGANIZER']), eventUpload.single('flyerImage'), validateRequest(createEventSchema), asyncHandler(createEvent));
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'ORGANIZER']), eventUpload.single('flyerImage'), validateRequest(updateEventSchema), asyncHandler(updateEvent));
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'ORGANIZER']), asyncHandler(deleteEvent));

export default router;