import dotenv from "dotenv";
import path from "path";
import dbConnect from "./mongodb";
import { Ticket, Message } from "../models/schemas";

// Load .env.local explicitly
const envPath = path.resolve(process.cwd(), ".env.local");
const config = dotenv.config({ path: envPath });

if (config.error) {
  console.error("⚠️  Error loading .env.local:", config.error);
} else {
  console.log("✅ Loaded environment from .env.local");
  console.log("📄 Config parsed:", config.parsed?.MONGODB_URI?.substring(0, 60) + '...');
  console.log("🔐 process.env.MONGODB_URI:", process.env.MONGODB_URI?.substring(0, 60) + '...');
}

async function testMongoDB() {
  console.log("\n🧪 Starting MongoDB Connection Test...\n");

  let retries = 3;
  let connected = false;

  // Retry logic for connection
  while (retries > 0 && !connected) {
    try {
      console.log(`📍 Connection attempt ${4 - retries}/3...`);
      await dbConnect();
      connected = true;
      console.log("✅ Successfully connected to MongoDB\n");
      break;
    } catch (error) {
      retries--;
      if (retries > 0) {
        console.log(`⏳ Retrying in 2 seconds... (${retries} attempts left)\n`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error("\n❌ Failed to connect after 3 attempts");
        
        if (error instanceof Error) {
          const errorMsg = error.message;
          
          if (errorMsg.includes('whitelisted') || errorMsg.includes('IP')) {
            console.error("\n🔐 IP WHITELIST ISSUE DETECTED:");
            console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.error("\n✅ Good news: Your MongoDB URI is correct!");
            console.error("❌ Issue: Your current IP is not whitelisted in MongoDB Atlas\n");
            console.error("📍 To fix this:");
            console.error("1. Go to https://cloud.mongodb.com/");
            console.error("2. Select your project and cluster");
            console.error("3. Go to Security → Network Access");
            console.error("4. Click 'Add IP Address'");
            console.error("5. Choose:");
            console.error("   • Enter your current IP (find it with: curl ifconfig.me)");
            console.error("   • OR click '0.0.0.0/0' to allow all IPs (development only)");
            console.error("6. Click 'Confirm'");
            console.error("7. Wait a few seconds for changes to apply");
            console.error("8. Run again: npm run test:mongodb\n");
            console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          } else {
            console.error("Error:", errorMsg);
          }
        } else {
          console.error("Error:", error);
        }
        process.exit(1);
      }
    }
  }

  if (!connected) {
    process.exit(1);
  }

  try {
    // Test 2: Create test ticket
    console.log("📍 Test 2: Creating test ticket...");
    const newTicket = await Ticket.create({
      description: `Test ticket - ${new Date().toISOString()}`,
      createdBy: "test-user",
      status: "open"
    });
    console.log("✅ Ticket created:", { id: newTicket._id, description: newTicket.description });

    // Test 3: Create test message
    console.log("\n📍 Test 3: Creating test message...");
    const newMessage = await Message.create({
      text: "Test message from MongoDB connection test",
      createdBy: "test-user"
    });
    console.log("✅ Message created:", { id: newMessage._id, text: newMessage.text });

    // Test 4: Fetch all data
    console.log("\n📍 Test 4: Fetching all data...");
    const allTickets = await Ticket.find({}).sort({ createdAt: -1 });
    const allMessages = await Message.find({}).sort({ createdAt: 1 });
    console.log(`✅ Found ${allTickets.length} tickets in database`);
    console.log(`✅ Found ${allMessages.length} messages in database`);

    // Test 5: Update test ticket
    console.log("\n📍 Test 5: Updating test ticket...");
    const updatedTicket = await Ticket.findByIdAndUpdate(
      newTicket._id,
      { status: "closed" },
      { new: true }
    );
    console.log("✅ Ticket updated:", { id: updatedTicket?._id, status: updatedTicket?.status });

    // Test 6: Delete test data
    console.log("\n📍 Test 6: Cleaning up test data...");
    await Ticket.findByIdAndDelete(newTicket._id);
    await Message.findByIdAndDelete(newMessage._id);
    console.log("✅ Test data deleted");

    console.log("\n✨ All MongoDB tests passed!\n");
    console.log("🎉 Your MongoDB connection is working correctly!\n");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Test operation failed:");
    if (error instanceof Error) {
      console.error("Error:", error.message);
      
      // Check for specific error types
      if (error.message.includes('whitelisted') || error.message.includes('IP whitelist')) {
        console.error("\n🔐 IP WHITELIST ISSUE DETECTED:");
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.error("Your MongoDB credentials are correct, but your IP is not whitelisted.\n");
        console.error("📍 To fix this:");
        console.error("1. Go to https://cloud.mongodb.com/");
        console.error("2. Navigate to Security → Network Access");
        console.error("3. Click 'Add IP Address'");
        console.error("4. Option A: Enter your current IP address");
        console.error("   Option B: Click '0.0.0.0/0' to allow all IPs (dev only)");
        console.error("5. Click 'Confirm'");
        console.error("6. Re-run: npm run test:mongodb\n");
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      }
    } else {
      console.error("Error:", error);
    }
    process.exit(1);
  }
}

// Run test
testMongoDB();
