import express from 'express';
import { getAnalytics, getUsers, getRevenue, broadcastAnnouncement, createStaff, getStaffs, deleteStaff } from '../controllers/adminController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { staffSchema, broadcastAnnouncementSchema } from '../utils/validation';
import { asyncHandler } from '../middleware/errorMiddleware';

const router = express.Router();

// All admin routes require admin role
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

router.get('/analytics', asyncHandler(getAnalytics));
router.get('/users', asyncHandler(getUsers));
router.get('/revenue', asyncHandler(getRevenue));
router.post('/broadcast', validateRequest(broadcastAnnouncementSchema), asyncHandler(broadcastAnnouncement));
router.post('/staff', validateRequest(staffSchema), asyncHandler(createStaff));
router.get('/staff', asyncHandler(getStaffs));
router.delete('/staff/:id', asyncHandler(deleteStaff));

export default router;