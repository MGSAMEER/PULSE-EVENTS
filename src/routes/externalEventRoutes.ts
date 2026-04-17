import express from 'express';
import { getExternalEvents, updateExternalEventStatus, deleteExternalEvent } from '../controllers/externalEventController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorMiddleware';

const router = express.Router();

// Public discovery route
router.get('/', asyncHandler(getExternalEvents));

// Admin management routes
router.patch('/:id/status', authMiddleware, roleMiddleware(['ADMIN']), asyncHandler(updateExternalEventStatus));
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), asyncHandler(deleteExternalEvent));

export default router;
