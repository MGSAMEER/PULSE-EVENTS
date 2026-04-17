import express from 'express';
import cors from 'cors';
import routes from './routes';
import { helmetConfig, apiLimiter, corsOptions } from './middleware/securityMiddleware';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware';

import mongoSanitize from 'express-mongo-sanitize';
import logger from './utils/logger';

const app = express();

// Security middleware
app.use(helmetConfig);

// Apply rate limiting to all requests
app.use(apiLimiter);

// Prevents NoSQL injection (removes $ and . from keys)
app.use(mongoSanitize());

// Simple XSS Sanitizer for strings in body/query/params
const xssClean = (data: any): any => {
  if (typeof data === 'string') {
    return data.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  if (Array.isArray(data)) {
    return data.map(xssClean);
  }
  if (data !== null && typeof data === 'object') {
    const keys = Object.keys(data);
    keys.forEach(key => {
      data[key] = xssClean(data[key]);
    });
  }
  return data;
};

app.use((req, res, next) => {
  req.body = xssClean(req.body);
  req.query = xssClean(req.query);
  req.params = xssClean(req.params);
  next();
});

// Structured request logging
app.use((req, res, next) => {
  const meta = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };
  
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`HTTP Request: ${req.method} ${req.url} from ${req.ip}`);
  }
  
  // Tag request for potential audit trailing
  next();
});

// CORS configuration
app.use(cors(corsOptions));

// Body parsing (Reduced limits for security)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Routes
app.use('/api', routes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;