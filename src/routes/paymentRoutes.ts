import express from 'express';
import { createOrder, verifyPayment } from '../controllers/paymentController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { createOrderSchema, verifyPaymentSchema } from '../utils/validation';
import { asyncHandler } from '../middleware/errorMiddleware';

const router = express.Router();

router.post('/create-order', authMiddleware, validateRequest(createOrderSchema), asyncHandler(createOrder));
router.post('/verify', authMiddleware, validateRequest(verifyPaymentSchema), asyncHandler(verifyPayment));

export default router;