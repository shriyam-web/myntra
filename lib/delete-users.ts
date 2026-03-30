import dotenv from "dotenv";
import path from "path";
import dbConnect from "./mongodb";
import { User } from "../models/schemas";

// Load .env.local explicitly
const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

async function deleteUsers() {
  try {
    await dbConnect();
    console.log("Connecting to database...");
    
    const usernamesToDelete = ["saba", "shriyam"];
    
    // Check if they exist first
    const existing = await User.find({ username: { $in: usernamesToDelete } });
    console.log(`Found ${existing.length} users to delete:`, existing.map(u => u.username));
    
    const result = await User.deleteMany({ username: { $in: usernamesToDelete } });
    console.log(`Successfully deleted ${result.deletedCount} users.`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error deleting users:", error);
    process.exit(1);
  }
}

deleteUsers();
