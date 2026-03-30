"use server";

import dbConnect from "./mongodb";
import { Ticket, Wishlist, Plan, TimelineDate, Message, User } from "../models/schemas";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryResult {
  secure_url: string;
}

interface UserDocument {
  username: string;
  lastSeen: Date | string;
  chatBackgroundColor?: string;
  chatBubbleColor?: string;
  themeName?: string;
  chatWallpaper?: string;
}

// IMAGE UPLOAD
export async function uploadImage(file: string) {
  const start = Date.now();
  try {
    console.log(`📸 Starting Cloudinary upload (file size: ${Math.round(file.length / 1024)}KB)`);
    
    // Cloudinary upload with timeout and better options
    const result = await new Promise<CloudinaryResult>((resolve, reject) => {
      const uploadTimeout = setTimeout(() => {
        reject(new Error("Cloudinary upload timed out after 30 seconds"));
      }, 30000);

      cloudinary.uploader.upload(file, {
        folder: "messaging",
        resource_type: "auto",
        timeout: 60000, // internal cloudinary timeout
      }, (error, result) => {
        clearTimeout(uploadTimeout);
        if (error) {
          console.error("❌ Cloudinary callback error:", error);
          reject(error);
        } else {
          resolve(result as CloudinaryResult);
        }
      });
    });

    const duration = Date.now() - start;
    console.log(`✅ Cloudinary upload successful in ${duration}ms: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Cloudinary upload failed after ${duration}ms:`, error);
    if (error instanceof Error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    throw new Error("Failed to upload image. Please try a smaller image or check your connection.");
  }
}

// FETCH ALL DATA
export async function fetchData(messageLimit = 50, currentUser?: string) {
  noStore();
  try {
    await dbConnect();

    // Log the number of users found to debug
    const userCount = await User.countDocuments();
    console.log(`🔍 fetchData: Found ${userCount} users in database`);

    const messageQuery: Record<string, unknown> = {};
    if (currentUser) {
      messageQuery.deletedFor = { $ne: currentUser };
    }

    const [tickets, wishlist, plans, dates, messages, rawUsers] = await Promise.all([
      Ticket.find({}).sort({ createdAt: -1 }).lean(),
      Wishlist.find({}).lean(),
      Plan.find({}).lean(),
      TimelineDate.find({}).lean(),
      Message.find(messageQuery).sort({ createdAt: -1 }).limit(messageLimit).populate('repliedTo').lean(),
      User.find({}).lean()
    ]);

    // Deduplicate users by username (lowercase)
    const userMap = new Map<string, UserDocument>();
    (rawUsers as UserDocument[]).forEach((u: UserDocument) => {
      const uname = u.username.trim().toLowerCase();
      const existing = userMap.get(uname);
      if (!existing || new Date(u.lastSeen) > new Date(existing.lastSeen)) {
        userMap.set(uname, u);
      }
    });
    const users = Array.from(userMap.values());

    // Debug users
    console.log("👥 Users found:", users.map(u => ({ username: u.username, lastSeen: u.lastSeen })));

    // Reverse messages to show chronological order (oldest to newest)
    const sortedMessages = messages.reverse();

    return {
      tickets: JSON.parse(JSON.stringify(tickets)),
      wishlist: JSON.parse(JSON.stringify(wishlist)),
      plans: JSON.parse(JSON.stringify(plans)),
      dates: JSON.parse(JSON.stringify(dates)),
      messages: JSON.parse(JSON.stringify(sortedMessages)),
      users: JSON.parse(JSON.stringify(users))
    };
  } catch (error) {
    console.error('Database fetch error:', error);
    throw new Error('Unable to connect to database. Please check your MongoDB connection and try again.');
  }
}

// TICKETS (Complaints)
export async function createTicket(data: { description: string; createdBy: string }) {
  try {
    await dbConnect();
    const ticket = await Ticket.create(data);
    revalidatePath('/');
    return JSON.parse(JSON.stringify(ticket));
  } catch (error) {
    console.error('Failed to create ticket:', error);
    throw new Error('Failed to submit complaint. Database connection error.');
  }
}

export async function updateTicket(id: string, updates: Record<string, unknown>) {
  try {
    await dbConnect();
    const ticket = await Ticket.findByIdAndUpdate(id, updates, { new: true });
    revalidatePath('/');
    return JSON.parse(JSON.stringify(ticket));
  } catch (error) {
    console.error('Failed to update ticket:', error);
    throw new Error('Failed to update ticket status. Database connection error.');
  }
}

export async function deleteTicket(id: string) {
  try {
    await dbConnect();
    await Ticket.findByIdAndDelete(id);
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to delete ticket:', error);
    throw new Error('Failed to delete ticket. Database connection error.');
  }
}

// WISHLIST
export async function createWish(data: { content: string; createdBy: string }) {
  try {
    await dbConnect();
    const wish = await Wishlist.create(data);
    revalidatePath('/');
    return JSON.parse(JSON.stringify(wish));
  } catch (error) {
    console.error('Failed to create wish:', error);
    throw new Error('Failed to add to wishlist. Database connection error.');
  }
}

export async function updateWish(id: string, content: string) {
  try {
    await dbConnect();
    const wish = await Wishlist.findByIdAndUpdate(id, { content }, { new: true });
    revalidatePath('/');
    return JSON.parse(JSON.stringify(wish));
  } catch (error) {
    console.error('Failed to update wish:', error);
    throw new Error('Failed to update wishlist item. Database connection error.');
  }
}

export async function deleteWish(id: string) {
  try {
    await dbConnect();
    await Wishlist.findByIdAndDelete(id);
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to delete wish:', error);
    throw new Error('Failed to delete wishlist item. Database connection error.');
  }
}

// PLANS
export async function createPlan(data: { content: string; createdBy: string }) {
  try {
    await dbConnect();
    const plan = await Plan.create(data);
    revalidatePath('/');
    return JSON.parse(JSON.stringify(plan));
  } catch (error) {
    console.error('Failed to create plan:', error);
    throw new Error('Failed to add plan. Database connection error.');
  }
}

export async function updatePlan(id: string, content: string) {
  try {
    await dbConnect();
    const plan = await Plan.findByIdAndUpdate(id, { content }, { new: true });
    revalidatePath('/');
    return JSON.parse(JSON.stringify(plan));
  } catch (error) {
    console.error('Failed to update plan:', error);
    throw new Error('Failed to update plan. Database connection error.');
  }
}

export async function deletePlan(id: string) {
  try {
    await dbConnect();
    await Plan.findByIdAndDelete(id);
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to delete plan:', error);
    throw new Error('Failed to delete plan. Database connection error.');
  }
}

// TIMELINE DATES
export async function createDate(data: { event: string; date: string; createdBy: string }) {
  try {
    await dbConnect();
    const dateEntry = await TimelineDate.create(data);
    revalidatePath('/');
    return JSON.parse(JSON.stringify(dateEntry));
  } catch (error) {
    console.error('Failed to create date:', error);
    throw new Error('Failed to add timeline event. Database connection error.');
  }
}

export async function updateDate(id: string, updates: Record<string, unknown>) {
  try {
    await dbConnect();
    const dateEntry = await TimelineDate.findByIdAndUpdate(id, updates, { new: true });
    revalidatePath('/');
    return JSON.parse(JSON.stringify(dateEntry));
  } catch (error) {
    console.error('Failed to update date:', error);
    throw new Error('Failed to update timeline event. Database connection error.');
  }
}

export async function deleteDate(id: string) {
  try {
    await dbConnect();
    await TimelineDate.findByIdAndDelete(id);
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to delete date:', error);
    throw new Error('Failed to delete timeline event. Database connection error.');
  }
}

// MESSAGES
async function sendTelegramNotification(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('Telegram notification skipped: Credentials missing.');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
}

export async function createMessage(data: { text?: string; imageUrl?: string; createdBy: string; repliedTo?: string }) {
  try {
    await dbConnect();
    const message = await Message.create(data);

    // Send Telegram notification if alpha 1 sends a message
    if (data.createdBy === "alpha 1") {
      // Check if delta 1 is online (last seen within 15 seconds)
      const delta1 = await User.findOne({ username: "delta 1" }).lean() as UserDocument | null;
      const isDelta1Online = delta1 && (Date.now() - new Date(delta1.lastSeen).getTime() < 15000);
      
      if (!isDelta1Online) {
        const notificationText = data.imageUrl ? "Sent an image" : data.text || "";
        sendTelegramNotification(`Alpha 1 sent a new message: ${notificationText.substring(0, 100)}${notificationText.length > 100 ? "..." : ""}`);
      } else {
        console.log("Telegram notification skipped: Delta 1 is currently online.");
      }
    }

    revalidatePath('/');
    return JSON.parse(JSON.stringify(message));
  } catch (error) {
    console.error('Failed to create message:', error);
    throw new Error('Failed to create message. Database connection error.');
  }
}

export async function updateMessage(id: string, text: string) {
  try {
    await dbConnect();
    const message = await Message.findByIdAndUpdate(id, { text }, { new: true });
    revalidatePath('/');
    return JSON.parse(JSON.stringify(message));
  } catch (error) {
    console.error('Failed to update message:', error);
    throw new Error('Failed to update message. Database connection error.');
  }
}

export async function deleteMessage(id: string) {
  try {
    await dbConnect();
    await Message.findByIdAndDelete(id);
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to delete message:', error);
    throw new Error('Failed to delete message. Database connection error.');
  }
}

export async function toggleSaveMessage(id: string, username: string) {
  try {
    await dbConnect();
    const message = await Message.findById(id);
    if (!message) throw new Error("Message not found");

    const isSaved = message.savedBy.includes(username);
    if (isSaved) {
      await Message.findByIdAndUpdate(id, { $pull: { savedBy: username } });
    } else {
      await Message.findByIdAndUpdate(id, { $addToSet: { savedBy: username } });
    }
    revalidatePath('/');
    return { saved: !isSaved };
  } catch (error) {
    console.error('Failed to toggle save message:', error);
    throw new Error('Failed to toggle save message.');
  }
}

export async function deleteAllMessages(deleteForEveryone = false, username?: string, includeSaved = false) {
  try {
    await dbConnect();
    if (deleteForEveryone) {
      if (includeSaved) {
        await Message.deleteMany({});
      } else {
        // Only delete messages that are NOT saved by anyone
        await Message.deleteMany({ savedBy: { $size: 0 } });
      }
    } else if (username) {
      if (includeSaved) {
        await Message.updateMany(
          { deletedFor: { $ne: username } },
          { $addToSet: { deletedFor: username } }
        );
      } else {
        // Only mark as deleted for me if NOT saved by me
        await Message.updateMany(
          { 
            deletedFor: { $ne: username },
            savedBy: { $ne: username }
          },
          { $addToSet: { deletedFor: username } }
        );
      }
    }
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to clear chat:', error);
    throw new Error('Failed to clear chat. Database connection error.');
  }
}

export async function updatePresence(username: string) {
  noStore();
  try {
    await dbConnect();
    const updatedUser = await User.findOneAndUpdate(
      { username: username.trim().toLowerCase() },
      { lastSeen: new Date() },
      { upsert: true, new: true }
    );
    console.log(`📡 Presence updated for: ${username.trim()} at ${updatedUser.lastSeen}`);
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to update presence:', error);
  }
}

export async function markAllAsRead(username: string) {
  noStore();
  try {
    await dbConnect();
    await User.findOneAndUpdate(
      { username: username.trim().toLowerCase() },
      { lastReadAt: new Date() },
      { upsert: true, new: true }
    );
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to mark as read:', error);
    throw new Error('Failed to mark as read. Database connection error.');
  }
}

export async function updateChatPreferences(username: string, updates: { chatBackgroundColor?: string; chatBubbleColor?: string; themeName?: string; chatWallpaper?: string }) {
  noStore();
  try {
    await dbConnect();
    await User.findOneAndUpdate(
      { username: username.trim().toLowerCase() },
      updates,
      { upsert: true, new: true }
    );
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to update chat preferences:', error);
    throw new Error('Failed to update chat preferences.');
  }
}
