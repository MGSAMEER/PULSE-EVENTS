import 'dotenv/config';

import app from './app';
import connectDB from './config/database';
import { scheduleReminders } from './utils/scheduler';
import logger from './utils/logger';

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
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
}).catch((err) => {
  logger.error(`FATAL: Failed to start server: ${err}`);
  process.exit(1);
});
