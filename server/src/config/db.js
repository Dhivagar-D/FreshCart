import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config();

export let isConnectedToMongoDB = false;
let mongodInstance = null;

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/freshcart';
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 1500,
    });
    isConnectedToMongoDB = true;
    console.log('[Database] Connected to configured MongoDB deployment.');
  } catch (err) {
    if (process.env.NODE_ENV === 'production' || process.env.ALLOW_EPHEMERAL_DB !== 'true') {
      throw new Error(`MongoDB connection failed. Configure MONGO_URI. ${err.message}`);
    }
    console.log(`[Database] MongoDB unavailable; starting explicitly enabled development-only embedded database...`);
    try {
      mongodInstance = await MongoMemoryServer.create({
        instance: {
          port: 27017,
          dbName: 'freshcart',
        },
      });
      const memoryUri = mongodInstance.getUri();
      await mongoose.connect(memoryUri);
      isConnectedToMongoDB = true;
      console.log(`[Database] Connected successfully to embedded MongoDB with GeoJSON 2dsphere support at ${memoryUri}`);
    } catch (memErr) {
      // If port 27017 was taken, try random port
      try {
        mongodInstance = await MongoMemoryServer.create();
        const memoryUri = mongodInstance.getUri();
        await mongoose.connect(memoryUri);
        isConnectedToMongoDB = true;
        console.log(`[Database] Connected successfully to embedded MongoDB at ${memoryUri}`);
      } catch (fallbackErr) {
        throw new Error(`Embedded development database could not start: ${fallbackErr.message}`);
      }
    }
  }
};
