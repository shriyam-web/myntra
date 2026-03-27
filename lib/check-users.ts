import dotenv from "dotenv";
import path from "path";
import dbConnect from "./mongodb";
import { User } from "../models/schemas";

// Load .env.local explicitly
const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

async function checkUsers() {
  try {
    await dbConnect();
    const users = await User.find({});
    console.log("👥 Users in database:");
    users.forEach(u => {
      console.log(`- Username: "${u.username}", Last Seen: ${u.lastSeen}, ID: ${u._id}`);
    });
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkUsers();
