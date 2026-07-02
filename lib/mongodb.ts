import mongoose from 'mongoose';
import dns from 'dns';

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

let dnsConfigured = false;

function configureDnsForSrvLookup(uri: string) {
  if (dnsConfigured || !uri.startsWith('mongodb+srv://')) return;
  try {
    // Windows/local DNS often refuses SRV queries in Node while nslookup still works.
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
    dnsConfigured = true;
  } catch {
    // ignore — fall back to system DNS
  }
}

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set. Please configure .env.local');
  }

  configureDnsForSrvLookup(MONGODB_URI);

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // Reduced from 30s for faster failure
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
      maxPoolSize: 20, // Increased for better concurrency
      minPoolSize: 5,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('✅ Connected to MongoDB');
        return mongoose;
      })
      .catch((error) => {
        console.error('❌ MongoDB connection error:', error instanceof Error ? error.message : String(error));
        cached.promise = null;
        throw error;
      });
  }

  const result = await cached.promise;
  cached.conn = result;
  return cached.conn;
}

export default dbConnect;
