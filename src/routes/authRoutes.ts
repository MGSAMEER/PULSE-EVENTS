import express from 'express';
import { register, login, googleLogin, verifyEmail, forgotPassword, resetPassword, requestOrganizer, getOrganizerRequests, approveOrganizerRequest, getMe } from '../controllers/authController';
import { validateRequest } from '../middleware/validationMiddleware';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../utils/validation';
import { authLimiter, loginLimiter, apiLimiter, registrationLimiter } from '../middleware/securityMiddleware';
import { asyncHandler } from '../middleware/errorMiddleware';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', registrationLimiter, validateRequest(registerSchema), asyncHandler(register as any));
router.get('/verify-email/:token', apiLimiter, asyncHandler(verifyEmail as any));
router.post('/login', loginLimiter, validateRequest(loginSchema), asyncHandler(login as any));
router.post('/google', loginLimiter, asyncHandler(googleLogin as any));
router.get('/me', authMiddleware, asyncHandler(getMe as any));
router.post('/forgot-password', authLimiter, validateRequest(forgotPasswordSchema), asyncHandler(forgotPassword as any));
router.post('/reset-password', authLimiter, validateRequest(resetPasswordSchema), asyncHandler(resetPassword as any));

// Organizer Request System
router.post('/request-organizer', authMiddleware, asyncHandler(requestOrganizer as any));
router.get('/organizer-requests', authMiddleware, adminMiddleware, asyncHandler(getOrganizerRequests as any));
router.post('/approve-organizer', authMiddleware, adminMiddleware, asyncHandler(approveOrganizerRequest as any));

export default router;