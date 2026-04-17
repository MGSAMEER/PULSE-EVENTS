import mongoose from 'mongoose';
import logger from '../utils/logger';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI && process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: Database connectivity string (MONGO_URI) is missing in production!');
    }
    const finalURI = mongoURI || 'mongodb://localhost:27017/event-ticketing';
    await mongoose.connect(finalURI);
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error(`MongoDB connection error: ${error}`);
    process.exit(1);
  }
};

export default connectDB;