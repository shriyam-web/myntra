
const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config({ path: './.env.local' });

async function runPerfTest() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const messages = db.collection('messages');
    const users = db.collection('users');

    console.log('--- 🚀 Starting Messaging Performance Test ---');

    // 1. Alpha 1 sends a message
    console.log('\n[Alpha 1] 📤 Sending message...');
    const startSend = Date.now();
    const newMsg = {
      text: 'Performance test message ' + startSend,
      createdBy: 'alpha 1',
      createdAt: new Date(),
      savedBy: [],
      deletedFor: []
    };
    const sendResult = await messages.insertOne(newMsg);
    const sendDuration = Date.now() - startSend;
    console.log(`✅ Message sent in ${sendDuration}ms (ID: ${sendResult.insertedId})`);

    // 2. Delta 1 "polls" for messages
    console.log('\n[Delta 1] 🔍 Polling for new messages...');
    const startPoll = Date.now();
    const latestMessages = await messages.find({ deletedFor: { $ne: 'delta 1' } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    const pollDuration = Date.now() - startPoll;
    console.log(`✅ Fetched ${latestMessages.length} messages in ${pollDuration}ms`);
    
    const found = latestMessages.find(m => m._id.toString() === sendResult.insertedId.toString());
    if (found) {
      console.log('✨ Success: New message correctly received by Delta 1');
    } else {
      console.error('❌ Error: Message not found in polling results');
    }

    // 3. Delta 1 marks as read
    console.log('\n[Delta 1] ✔️ Marking all as read...');
    const startRead = Date.now();
    await users.updateOne(
      { username: 'delta 1' },
      { $set: { lastReadAt: new Date() } },
      { upsert: true }
    );
    const readDuration = Date.now() - startRead;
    console.log(`✅ Marked as read in ${readDuration}ms`);

    // 4. Alpha 1 polls again to see Delta 1 read status
    console.log('\n[Alpha 1] 👥 Checking Delta 1 online/read status...');
    const startStatus = Date.now();
    const delta1 = await users.findOne({ username: 'delta 1' });
    const statusDuration = Date.now() - startStatus;
    console.log(`✅ User status fetched in ${statusDuration}ms`);
    console.log(`📍 Delta 1 last read: ${delta1.lastReadAt}`);

    console.log('\n--- 📊 Performance Summary ---');
    console.log(`Send Message: ${sendDuration}ms`);
    console.log(`Poll Messages: ${pollDuration}ms`);
    console.log(`Mark as Read:  ${readDuration}ms`);
    console.log(`Check Status:  ${statusDuration}ms`);
    
    if (sendDuration + pollDuration + readDuration + statusDuration < 1000) {
      console.log('\n✅ TEST PASSED: Messaging is performing exceptionally fast!');
    } else {
      console.log('\n⚠️ TEST COMPLETED: Performance is acceptable but monitor for slowdowns.');
    }

    // Cleanup: Delete the test message
    await messages.deleteOne({ _id: sendResult.insertedId });
    console.log('\n🧹 Test data cleaned up.');

  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await client.close();
  }
}

runPerfTest();
