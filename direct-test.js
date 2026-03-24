import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

console.log('🔄 Testing direct MongoDB connection...');
console.log('📍 URI:', uri.replace(/:([^:@]{4})[^:@]*@/, ':****@'));

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 15000,
});

async function testConnection() {
  try {
    console.log('🔌 Connecting...');
    await client.connect();
    console.log('✅ SUCCESS: Connected to MongoDB Atlas!');

    const db = client.db();
    console.log(`📊 Database: ${db.databaseName}`);

    const collections = await db.collections();
    console.log(`📁 Collections: ${collections.length}`);

    await client.close();
    console.log('✅ Connection test PASSED!');
    process.exit(0);

  } catch (error) {
    console.error('❌ FAILED: Connection error');
    console.error('Error:', error.message);

    if (error.message.includes('authentication failed')) {
      console.error('💡 Issue: Wrong username/password');
    } else if (error.message.includes('querySrv')) {
      console.error('💡 Issue: DNS SRV lookup failed - cluster may be paused');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 Issue: Connection refused - check IP whitelist');
    } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
      console.error('💡 Issue: DNS resolution failed');
    } else {
      console.error('💡 Issue: Unknown connection problem');
    }

    process.exit(1);
  }
}

testConnection();