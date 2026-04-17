import express, { Request, Response } from 'express';
import logger from '../utils/logger';
import {
  getSponsors,
  getSponsorById,
  createSponsor,
  updateSponsor,
  deleteSponsor,
  associateSponsorWithEvent,
  getEventSponsors,
} from '../controllers/sponsorController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';
import { upload } from '../utils/cloudinary';
import { ApiResponseUtil } from '../utils/response';
import { validateRequest } from '../middleware/validationMiddleware';
import { createSponsorSchema } from '../utils/validation';
import { asyncHandler } from '../middleware/errorMiddleware';

const router = express.Router();

// Upload handler middleware
const uploadHandler = async (req: any, res: Response) => {
  logger.debug(`Sponsor upload request from ${req.ip}`);
  
  if (!req.file) {
    logger.debug('Upload rejected: No file provided');
    return ApiResponseUtil.error(res, 'No file uploaded. Please select an image.', 400);
  }
  
  const uploadedPath = (req.file as any).path;
  const uploadedFilename = (req.file as any).filename;
  
  if (!uploadedPath) {
    logger.error('Upload failed: Cloudinary path not generated');
    return ApiResponseUtil.error(res, 'Upload failed: Cloudinary path not generated. Check your Cloudinary credentials.', 500);
  }
  
  logger.info(`Sponsor logo uploaded: ${uploadedFilename}`);
  return ApiResponseUtil.success(res, 'Logo uploaded successfully', {
    url: uploadedPath,
    public_id: uploadedFilename,
  });
};

// Public routes
router.get('/', asyncHandler(getSponsors));

// Image Upload - MUST come before /:id routes
router.post('/upload', authMiddleware, roleMiddleware(['ADMIN']), upload.single('logo'), uploadHandler);

// Specific /:id routes
router.get('/:id', asyncHandler(getSponsorById));

// Admin-only routes
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), validateRequest(createSponsorSchema), asyncHandler(createSponsor));
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), asyncHandler(updateSponsor));
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), asyncHandler(deleteSponsor));

// Event-sponsor association
router.post('/associate', authMiddleware, roleMiddleware(['ADMIN']), asyncHandler(associateSponsorWithEvent));
router.get('/event/:eventId', asyncHandler(getEventSponsors));

export default router;