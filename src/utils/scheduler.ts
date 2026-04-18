import cron from 'node-cron';
import Booking from '../models/Booking';
import { sendEventReminder } from './emailService';
import logger from './logger';

// Schedule reminder emails 1 day before event
export const scheduleReminders = () => {
  // Run every hour to check for upcoming events
  cron.schedule('0 * * * *', async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      // Find confirmed bookings for events tomorrow
      const bookings = await Booking.find({
        status: 'confirmed',
      }).populate('eventId userId');

      for (const booking of bookings) {
        const eventDate = new Date((booking.eventId as any).date);
        if (eventDate >= tomorrow && eventDate < dayAfter) {
          // Send reminder email
          sendEventReminder(
            (booking.userId as any).email,
            (booking.eventId as any).name,
            eventDate.toLocaleDateString()
          ).catch(err => {
            logger.error(`Background reminder failure for ${booking._id}: ${err.message}`);
          });
        }
      }
    } catch (error) {
      console.error('Error in reminder scheduler:', error);
    }
  });

  // Event Discovery Sync: Every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      const { syncExternalEvents } = await import('./discoveryService');
      await syncExternalEvents();
    } catch (error) {
      console.error('Error in discovery scheduler:', error);
    }
  });
};