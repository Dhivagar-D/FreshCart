import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI as string;
  if (!mongoUri) {
    throw new Error('MONGO_URI not defined in .env');
  }
  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error', err);
    process.exit(1);
  }
};
