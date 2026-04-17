import express from 'express';
import { validateQR } from '../controllers/qrController';
import { validateRequest } from '../middleware/validationMiddleware';
import { validateQRSchema } from '../utils/validation';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorMiddleware';

const router = express.Router();

router.post(
  '/validate',
  authMiddleware,
  roleMiddleware(['ADMIN', 'STAFF']),
  validateRequest(validateQRSchema),
  asyncHandler(validateQR)
);

export default router;