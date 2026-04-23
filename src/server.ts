import 'dotenv/config';
import dns from 'dns';

// Force IPv4 as priority to resolve ENETUNREACH/IPv6 routing issues on Railway
dns.setDefaultResultOrder('ipv4first');

import app from './app';
import connectDB from './config/database';
import { scheduleReminders } from './utils/scheduler';
import logger from './utils/logger';
import { transporter } from './utils/emailService';
import './workers/emailWorker';

// Verify SMTP connection on startup
transporter.verify()
  .then(() => logger.info('✅ SMTP READY for dispatch'))
  .catch((err: any) => logger.error(`❌ SMTP CONNECTION ERROR: ${err.message}`));

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
