import mongoose from 'mongoose';
import dns from 'dns';

// Fix for querySrv ECONNREFUSED issues with some DNS servers
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('⚠️ Could not set custom DNS servers, using system default');
}

console.log('🔍 Loading mongodb.ts - DNS fix applied');

interface MongooseCache {
  conn: unknown;
  promise: Promise<unknown> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  const globalRef = global as unknown as { mongoose?: MongooseCache };
  globalRef.mongoose = cached as MongooseCache;
}

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;

  console.log('🔐 MONGODB_URI:', MONGODB_URI?.substring(0, 50) + '...');

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set. Please configure .env.local');
  }

  if (cached.conn) {
    console.log('📌 Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    // Use the URI as provided (supports SRV URIs with authSource)
    const connectionUri = MONGODB_URI;

    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
    };

    console.log('🔄 Attempting MongoDB connection...');
    console.log('📍 Host: cluster0.da9eud5.mongodb.net');

    cached.promise = mongoose.connect(connectionUri, opts)
      .then((mongoose) => {
        console.log('✅ Successfully connected to MongoDB Atlas');
        return mongoose;
      })
      .catch((error) => {
        console.error('❌ MongoDB connection error:', error instanceof Error ? error.message : String(error));
        
        if (error instanceof Error) {
          if (error.message.includes('querySrv')) {
            console.error('💡 Hint: DNS/SRV lookup failed - attempting direct connection');
          }
          if (error.message.includes('ECONNREFUSED')) {
            console.error('💡 Hint: Connection refused - ensure MongoDB Atlas IP whitelist allows your IP');
          }
          if (error.message.includes('authentication failed') || error.message.includes('Unauthorized')) {
            console.error('💡 Hint: Authentication failed - check username/password in MONGODB_URI');
          }
        }
        
        // Clear the promise so retry is possible
        cached.promise = null;
        throw error;
      });
  }

  const result = await cached.promise;
  cached.conn = result;
  return cached.conn;
}

export default dbConnect;
