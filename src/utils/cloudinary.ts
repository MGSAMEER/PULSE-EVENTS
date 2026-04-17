import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Validate Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn('⚠️ WARNING: Cloudinary credentials are not fully configured');
  console.warn('Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

import { Request } from 'express';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: Request, file: Express.Multer.File) => ({
    folder: 'eventhub/sponsors',
    allowed_formats: ['jpg', 'png', 'webp', 'jpeg'],
    public_id: `sponsor_${Date.now()}`,
    resource_type: 'auto',
  }),
});

const eventStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: Request, file: Express.Multer.File) => ({
    folder: 'eventhub/events',
    allowed_formats: ['jpg', 'png', 'webp', 'jpeg'],
    public_id: `event_${Date.now()}`,
    resource_type: 'auto',
  }),
});

export const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB Limit per image
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const isMatched = allowedTypes.test(file.mimetype.toLowerCase());
    if (isMatched) return cb(null, true);
    cb(new Error('File upload rejected: Unsupported format (Live feed requires JPG/PNG/WEBP)'));
  }
});

export const eventUpload = multer({ 
  storage: eventStorage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB Limit for flyers
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const isMatched = allowedTypes.test(file.mimetype.toLowerCase());
    if (isMatched) return cb(null, true);
    cb(new Error('File upload rejected: Unsupported format (Flyer requires JPG/PNG/WEBP)'));
  }
});

export default cloudinary;
