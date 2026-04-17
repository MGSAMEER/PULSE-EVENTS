import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import logger from '../utils/logger';

// Rate limiting factory
export const createRateLimit = (windowMs: number, max: number, message: string) => {
  // Relax limits for development
  const isDev = process.env.NODE_ENV === 'development';
  const effectiveMax = isDev ? max * 10 : max;

  return rateLimit({
    windowMs,
    max: effectiveMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks and OPTIONS requests
      if (req.path.includes('/health') || req.method === 'OPTIONS') return true;
      return false;
    },
    handler: (req: Request, res: Response) => {
      logger.warn(`Security Event: Rate Limit Violation [${req.ip}] for ${req.method} ${req.path}`);
      res.status(429).json({
        success: false,
        message: message || 'Too many requests, please try again later.'
      });
    }
  });
};

// Strict rate limit for authentication endpoints (prevent brute force)
export const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  50, // 50 attempts per IP per 15 min (was 20, now 500 in dev)
  'Too many login attempts. Please try again later.'
);

// Very strict rate limit for login specifically
export const loginLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per IP per 15 min (was 20, now 50 in dev)
  'Too many login attempts. Please try again later.'
);

// Strict limit for account creation to prevent spam/bots
export const registrationLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  15, // 15 registrations per IP per hour (was 3)
  'Account creation limit reached. Please try again later.'
);

// Limit for resource-heavy AI/Recommendation requests
export const aiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  15, // 15 requests per 15 min
  'AI processing limit exceeded. Please wait before next request.'
);

// General API rate limit (generous for development)
export const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  200, // 200 requests per IP per 15 min (now 2000 in dev)
  'Too many requests from this IP, please try again later.'
);

// Scraper protection: Aggressive limit for mass data reading
export const scraperLimiter = createRateLimit(
  1 * 60 * 1000, // 1 minute
  30, // 30 requests per minute
  'Bot detection: Rapid request pattern identified. Access throttled.'
);

// Relaxed rate limit for read-only endpoints
export const readLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  500, // 500 read requests per IP per 15 min (now 5000 in dev)
  'Rate limit exceeded. Please slow down.'
);

// CORS configuration
export const corsOptions = {
  origin: (origin: any, callback: any) => {
    // Development mode: allow all origins
    if (process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }
    
    // Production mode: check whitelist
    const whitelist = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173']; 
    
    if (!origin || whitelist.includes(origin) || /\.vercel\.app$/.test(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      logger.error(`CORS Blocked: Origin ${origin} is not in whitelist`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Helmet configuration
export const helmetConfig = helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
      connectSrc: ["'self'", "https://api.razorpay.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});