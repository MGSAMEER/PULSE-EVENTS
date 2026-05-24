import 'dotenv/config';
import app from './app';
import connectDB from './config/database';
import { scheduleReminders } from './utils/scheduler';
import logger from './utils/logger';

const PORT = process.env.PORT || 5001;
// Basic runtime safety handlers
process.on('unhandledRejection', (reason: any) => {
  logger.error(`Unhandled Rejection at: ${reason}`);
});

process.on('uncaughtException', (err: any) => {
  logger.error(`Uncaught Exception: ${err?.stack || err}`);
  process.exit(1);
});

console.log('Server starting...');
console.log('Environment:', process.env.NODE_ENV || 'development');

connectDB().then(() => {
  try {
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });

    server.on('error', (err: any) => {
      logger.error(`Server listen error: ${err}`);
      process.exit(1);
    });

    // Start the reminder scheduler
    scheduleReminders();

    // Initial Discovery Sync
    (async () => {
      try {
        const { syncExternalEvents } = await import('./utils/discoveryService');
        await syncExternalEvents();
      } catch (err) {
        logger.error(`Initial sync failed: ${err}`);
      }
    })();
  } catch (err) {
    logger.error(`FATAL: Error during server startup: ${err}`);
    process.exit(1);
  }
}).catch((err) => {
  logger.error(`FATAL: Failed to start server: ${err}`);
  process.exit(1);
});
