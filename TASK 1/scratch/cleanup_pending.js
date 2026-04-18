const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from backend
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function cleanup() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    const Booking = mongoose.model('Booking', new mongoose.Schema({
        status: String,
        eventId: mongoose.Schema.Types.ObjectId,
        ticketsCount: Number
    }, { timestamps: true }));

    const Event = mongoose.model('Event', new mongoose.Schema({
        availableTickets: Number
    }));

    const pending = await Booking.find({ status: 'pending' });
    console.log(`Found ${pending.length} pending bookings. Converting to failed and restoring inventory...`);

    for (const b of pending) {
        b.status = 'failed';
        await b.save();
        await Event.findByIdAndUpdate(b.eventId, { $inc: { availableTickets: b.ticketsCount } });
    }

    console.log('Cleanup complete.');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanup();
