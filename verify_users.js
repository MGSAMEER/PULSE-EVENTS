const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const verifyAllUsers = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/event-ticketing';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({
      isVerified: { type: Boolean, default: false }
    }));

    const result = await User.updateMany({}, { $set: { isVerified: true } });
    console.log(`Successfully verified ${result.modifiedCount} users.`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error verifying users:', err);
    process.exit(1);
  }
};

verifyAllUsers();
