import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.log('⚠️  No MONGODB_URI found. Using in-memory fallback for development.');
}

// In-memory storage for development when MongoDB is not available
// Cached on global to persist through HMR in development
let inMemoryStorage = (global as any).inMemoryStorage;

if (!inMemoryStorage) {
  inMemoryStorage = (global as any).inMemoryStorage = {
    tickets: [],
    wishlist: [],
    plans: [],
    dates: [],
    messages: []
  };
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // If no MongoDB URI, use in-memory storage
  if (!MONGODB_URI) {
    console.log('💾 Using in-memory storage (no database connection)');
    return { inMemory: true };
  }

  // If we already determined to use in-memory storage, return that
  if (cached.conn && typeof cached.conn === 'object' && 'inMemory' in cached.conn) {
    return cached.conn;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ Connected to MongoDB');
      return mongoose;
    }).catch(async (error) => {
      console.error('❌ MongoDB connection error:', error instanceof Error ? error.message : String(error));
      console.log('💡 Falling back to in-memory storage');
      // Cache the in-memory decision
      cached.conn = { inMemory: true };
      return cached.conn;
    });
  }

  const result = await cached.promise;
  if (result && typeof result === 'object' && 'inMemory' in result) {
    return result;
  }
  cached.conn = result;
  return cached.conn;
}

export default dbConnect;
export { inMemoryStorage };
