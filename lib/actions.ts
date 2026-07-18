"use server";

import dbConnect from "./mongodb";
import { notifyRealtime } from "./realtime-hub";
import { withTimeout } from "./with-timeout";
import { Ticket, Wishlist, Plan, TimelineDate, Message, User, CallLog, AppSettings } from "../models/schemas";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { v2 as cloudinary } from "cloudinary";
import { APP_SETTINGS_KEY } from "./maintenance";

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

async function getMaintenancePayload() {
  const settings = await AppSettings.findOne({ key: APP_SETTINGS_KEY }).lean();
  return {
    maintenanceMode: Boolean(settings?.maintenanceMode),
    maintenanceEnabledAt: settings?.maintenanceEnabledAt
      ? new Date(settings.maintenanceEnabledAt).toISOString()
      : null,
    maintenanceEnabledBy: settings?.maintenanceEnabledBy ?? null,
  };
}

export async function getMaintenanceStatus() {
  noStore();
  try {
    await dbConnect();
    return await getMaintenancePayload();
  } catch {
    return {
      maintenanceMode: false,
      maintenanceEnabledAt: null,
      maintenanceEnabledBy: null,
    };
  }
}

export async function enableMaintenanceMode(actor: string) {
  if (actor.trim().toLowerCase() !== "alpha 1") {
    throw new Error("Only Alpha 1 can enable maintenance mode.");
  }

  await dbConnect();
  await AppSettings.findOneAndUpdate(
    { key: APP_SETTINGS_KEY },
    {
      maintenanceMode: true,
      maintenanceEnabledAt: new Date(),
      maintenanceEnabledBy: "alpha 1",
    },
    { upsert: true }
  );

  await Message.create({
    text: "[SYSTEM:MAINTENANCE_ON] Maintenance mode is on. The portal is showing the decoy page.",
    createdBy: "alpha 1",
  });

  notifyRealtime();
  revalidatePath("/");
  return { success: true };
}

export async function disableMaintenanceMode(actor: string) {
  if (actor.trim().toLowerCase() !== "alpha 1") {
    throw new Error("Only Alpha 1 can disable maintenance mode.");
  }

  await dbConnect();
  await AppSettings.findOneAndUpdate(
    { key: APP_SETTINGS_KEY },
    {
      maintenanceMode: false,
      maintenanceEnabledAt: null,
      maintenanceEnabledBy: null,
    },
    { upsert: true }
  );

  notifyRealtime();
  revalidatePath("/");
  return { success: true };
}

// IMAGE/VIDEO UPLOAD
export async function uploadImage(file: string, resourceType: "image" | "video" | "auto" = "auto") {
  const start = Date.now();
  try {
    const isVideo = resourceType === "video" || (typeof file === 'string' && file.startsWith('data:video/'));
    const actualResourceType = isVideo ? "video" : (resourceType === "auto" ? "auto" : "image");
    
    console.log(`📸 Starting Cloudinary ${actualResourceType} upload (file size: ${Math.round(file.length / 1024)}KB)`);
    
    // Cloudinary upload with timeout and better options
    const result = await new Promise<CloudinaryResult>((resolve, reject) => {
      const timeoutMs = actualResourceType === "video" ? 300000 : 60000; // 5 mins for video, 1 min for image
      
      const uploadTimeout = setTimeout(() => {
        reject(new Error(`Cloudinary upload timed out after ${timeoutMs/1000} seconds`));
      }, timeoutMs);

      cloudinary.uploader.upload(file, {
        folder: "messaging",
        resource_type: actualResourceType,
        timeout: timeoutMs,
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
    throw new Error("Failed to upload media. Please try a smaller file or check your connection.");
  }
}

// Get Cloudinary signature for client-side upload
export async function getCloudinarySignature() {
  const timestamp = Math.round((new Date()).getTime() / 1000);
  const folder = "messaging";
  
  const signature = cloudinary.utils.api_sign_request({
    timestamp: timestamp,
    folder: folder,
  }, process.env.CLOUDINARY_API_SECRET!);

  return { 
    timestamp, 
    signature, 
    apiKey: process.env.CLOUDINARY_API_KEY, 
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder
  };
}

// FETCH ALL DATA
export async function fetchData(messageLimit = 50, currentUser?: string) {
  noStore();
  try {
    await dbConnect();

    // Update presence if currentUser provided
    if (currentUser && currentUser !== "login") {
      await updatePresence(currentUser);
    }

    // Log the number of users found to debug
    const userCount = await User.countDocuments();
    console.log(`🔍 fetchData: Found ${userCount} users in database`);

    const messageQuery: Record<string, unknown> = {};
    if (currentUser) {
      messageQuery.deletedFor = { $ne: currentUser };
    }

    const [tickets, wishlist, plans, dates, messages, rawUsers, callLogs] = await Promise.all([
      Ticket.find({}).sort({ createdAt: -1 }).lean(),
      Wishlist.find({}).lean(),
      Plan.find({}).lean(),
      TimelineDate.find({}).lean(),
      Message.find(messageQuery).sort({ createdAt: -1 }).limit(messageLimit).populate('repliedTo').lean(),
      User.find({}).select('username lastSeen lastReadAt chatBackgroundColor chatBubbleColor themeName chatWallpaper').lean(),
      CallLog.find({}).sort({ createdAt: -1 }).limit(50).lean()
    ]);

    // Deduplicate users by username (lowercase)
    const userMap = new Map<string, UserDocument>();
    (rawUsers as UserDocument[]).forEach((u: UserDocument) => {
      const uname = u.username.trim().toLowerCase();
      const existing = userMap.get(uname);
      
      const uDate = u.lastSeen ? new Date(u.lastSeen).getTime() : 0;
      const eDate = (existing && existing.lastSeen) ? new Date(existing.lastSeen).getTime() : 0;

      if (!existing || uDate > eDate) {
        userMap.set(uname, u);
      }
    });
    const users = Array.from(userMap.values());

    // Debug users
    console.log("👥 Users found:", users.map(u => ({ username: u.username, lastSeen: u.lastSeen })));

    // Reverse messages to show chronological order (oldest to newest)
    const sortedMessages = messages.reverse();
    const maintenance = await getMaintenancePayload();

    return {
      tickets: JSON.parse(JSON.stringify(tickets)),
      wishlist: JSON.parse(JSON.stringify(wishlist)),
      plans: JSON.parse(JSON.stringify(plans)),
      dates: JSON.parse(JSON.stringify(dates)),
      messages: JSON.parse(JSON.stringify(sortedMessages)),
      users: JSON.parse(JSON.stringify(users)),
      callLogs: JSON.parse(JSON.stringify(callLogs)),
      ...maintenance,
    };
  } catch (error) {
    console.error('Database fetch error:', error);
    throw new Error('Unable to connect to database. Please check your MongoDB connection and try again.');
  }
}

// FETCH ONLY MESSAGES (for faster polling)
export async function fetchMessages(messageLimit = 50, currentUser?: string) {
  noStore();
  try {
    await dbConnect();
    
    // Presence is updated on its own interval in HomeClient — avoid on every poll.
    const messageQuery: Record<string, unknown> = {};
    if (currentUser) {
      messageQuery.deletedFor = { $ne: currentUser };
    }

    const [messages, rawUsers, callLogs] = await Promise.all([
      Message.find(messageQuery).sort({ createdAt: -1 }).limit(messageLimit).populate('repliedTo').lean(),
      User.find({}).select('username lastSeen lastReadAt chatBackgroundColor chatBubbleColor themeName chatWallpaper').lean(),
      CallLog.find({}).sort({ createdAt: -1 }).limit(50).lean()
    ]);

    const userMap = new Map<string, UserDocument>();
    (rawUsers as UserDocument[]).forEach((u: UserDocument) => {
      const uname = u.username.trim().toLowerCase();
      const existing = userMap.get(uname);
      
      const uDate = u.lastSeen ? new Date(u.lastSeen).getTime() : 0;
      const eDate = (existing && existing.lastSeen) ? new Date(existing.lastSeen).getTime() : 0;

      if (!existing || uDate > eDate) {
        userMap.set(uname, u);
      }
    });
    const users = Array.from(userMap.values());
    const maintenance = await getMaintenancePayload();

    return {
      messages: JSON.parse(JSON.stringify(messages.reverse())),
      users: JSON.parse(JSON.stringify(users)),
      callLogs: JSON.parse(JSON.stringify(callLogs)),
      ...maintenance,
    };
  } catch (error) {
    console.error('Fetch messages error:', error);
    throw new Error('Unable to fetch messages.');
  }
}

// TICKETS (Complaints)
export async function createTicket(description: string, createdBy: string) {
  try {
    await dbConnect();
    const ticket = await Ticket.create({ description, createdBy });
    return JSON.parse(JSON.stringify(ticket));
  } catch (error) {
    console.error('Failed to create ticket:', error);
    throw new Error('Failed to submit complaint. Database connection error.');
  }
}

export async function updateTicketStatus(id: string, status: string) {
  try {
    await dbConnect();
    const ticket = await Ticket.findByIdAndUpdate(id, { status }, { new: true });
    return JSON.parse(JSON.stringify(ticket));
  } catch (error) {
    console.error('Failed to update ticket status:', error);
    throw new Error('Failed to update ticket status. Database connection error.');
  }
}

export async function updateTicket(id: string, updates: Record<string, unknown>) {
  try {
    await dbConnect();
    const ticket = await Ticket.findByIdAndUpdate(id, updates, { new: true });
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
  } catch (error) {
    console.error('Failed to delete ticket:', error);
    throw new Error('Failed to delete ticket. Database connection error.');
  }
}

// WISHLIST
export async function createWish(content: string, createdBy: string) {
  try {
    await dbConnect();
    const wish = await Wishlist.create({ content, createdBy });
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
export async function createPlan(content: string, createdBy: string) {
  try {
    await dbConnect();
    const plan = await Plan.create({ content, createdBy });
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
export async function createDate(event: string, date: string, createdBy: string) {
  try {
    await dbConnect();
    const dateEntry = await TimelineDate.create({ event, date, createdBy });
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
}

export async function sendMessage(
  text: string,
  createdBy: string,
  imageUrls?: string[],
  videoUrls?: string[],
  repliedTo?: string,
  audioUrls?: string[]
) {
  const MAX_TEXT_LENGTH = 50000;
  if (text && text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Message is too long (${text.length} characters). Please shorten it to under ${MAX_TEXT_LENGTH} characters.`);
  }

  try {
    await withTimeout(dbConnect(), 15000, "Database connection timed out. Please try again.");

    updatePresence(createdBy).catch(err => console.error("Background presence update error:", err));

    const data = { text, createdBy, imageUrls, videoUrls, audioUrls, repliedTo };
    const message = await withTimeout(
      Message.create(data),
      20000,
      "Saving message timed out. Please check your connection and try again."
    );

    if (data.createdBy === "alpha 1") {
      (async () => {
        try {
          // Check if delta 1 is online (last seen within 15 seconds)
          const delta1 = await User.findOne({ username: "delta 1" }).lean() as UserDocument | null;
          const isDelta1Online = delta1 && (Date.now() - new Date(delta1.lastSeen).getTime() < 15000);
          
          if (!isDelta1Online) {
            const hasMedia =
              (data.imageUrls && data.imageUrls.length > 0) ||
              (data.videoUrls && data.videoUrls.length > 0) ||
              (data.audioUrls && data.audioUrls.length > 0);
            const notificationText = hasMedia ? "Sent media content" : data.text || "";
            await sendTelegramNotification(`Alpha 1 sent a new message: ${notificationText.substring(0, 100)}${notificationText.length > 100 ? "..." : ""}`);
          }
        } catch (err) {
          console.error("Background notification error:", err);
        }
      })();
    }

    notifyRealtime();
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
    notifyRealtime();
    return JSON.parse(JSON.stringify(message));
  } catch (error) {
    console.error('Failed to update message:', error);
    throw new Error('Failed to update message. Database connection error.');
  }
}

export async function deleteMessage(id: string, deleteFromCloudinaryToo: boolean = false) {
  try {
    await dbConnect();
    
    if (deleteFromCloudinaryToo) {
      const message = await Message.findById(id);
      if (message) {
        const allUrls = [
          message.imageUrl,
          ...(message.imageUrls || []),
          message.videoUrl,
          ...(message.videoUrls || []),
          message.audioUrl,
          ...(message.audioUrls || [])
        ].filter(Boolean) as string[];

        for (const url of allUrls) {
          try {
            // Determine resource_type
            const isVideo = url.includes('/video/upload/');
            const resourceType = isVideo ? 'video' : 'image';
            
            // Extract public_id from Cloudinary URL
            const parts = url.split('/');
            const uploadIndex = parts.indexOf('upload');
            if (uploadIndex !== -1) {
              const relevantParts = parts.slice(uploadIndex + 1);
              if (relevantParts[0].match(/^v\d+$/)) {
                relevantParts.shift();
              }
              const lastPart = relevantParts[relevantParts.length - 1];
              const lastPartWithoutExtension = lastPart.split('.')[0];
              relevantParts[relevantParts.length - 1] = lastPartWithoutExtension;
              const publicId = relevantParts.join('/');
              
              console.log(`🗑️ Deleting ${resourceType} from Cloudinary: ${publicId}`);
              await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
            }
          } catch (err) {
            console.error(`Failed to delete media from Cloudinary: ${url}`, err);
          }
        }
      }
    }

    await Message.findByIdAndDelete(id);
    revalidatePath('/');
    notifyRealtime();
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
    notifyRealtime();
    return { saved: !isSaved };
  } catch (error) {
    console.error('Failed to toggle save message:', error);
    throw new Error('Failed to toggle save message.');
  }
}

export async function togglePinMessage(id: string, username: string) {
  try {
    await dbConnect();
    const message = await Message.findById(id);
    if (!message) throw new Error("Message not found");

    const isPinned = (message.pinnedBy || []).includes(username);
    if (isPinned) {
      await Message.findByIdAndUpdate(id, { $pull: { pinnedBy: username } });
    } else {
      await Message.findByIdAndUpdate(id, { $addToSet: { pinnedBy: username } });
    }
    revalidatePath('/');
    notifyRealtime();
    return { pinned: !isPinned };
  } catch (error) {
    console.error('Failed to toggle pin message:', error);
    throw new Error('Failed to toggle pin message.');
  }
}

export async function reactToMessage(id: string, username: string, reactionType: string) {
  try {
    await dbConnect();
    const message = await Message.findById(id);
    if (!message) throw new Error("Message not found");

    const existing = (message.reactions || []).find((r: { user: string }) => r.user === username);
    let updatedReactions;

    if (existing && existing.type === reactionType) {
      updatedReactions = (message.reactions || []).filter((r: { user: string }) => r.user !== username);
    } else if (existing) {
      updatedReactions = (message.reactions || []).map((r: { user: string; type: string }) =>
        r.user === username ? { user: username, type: reactionType } : r
      );
    } else {
      updatedReactions = [...(message.reactions || []), { user: username, type: reactionType }];
    }

    const updated = await Message.findByIdAndUpdate(
      id,
      { reactions: updatedReactions },
      { new: true }
    ).populate('repliedTo');

    revalidatePath('/');
    notifyRealtime();
    return JSON.parse(JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to react to message:', error);
    throw new Error('Failed to react to message.');
  }
}

export async function getUrlMetadata(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await response.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';

    const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) || 
                          html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const description = descriptionMatch ? descriptionMatch[1] : '';

    const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                    html.match(/<link[^>]*rel=["']icon["'][^>]*href=["']([^"']+)["'][^>]*>/i);
    let image = imageMatch ? imageMatch[1] : '';

    if (image && !image.startsWith('http')) {
      const urlObj = new URL(url);
      image = `${urlObj.origin}${image.startsWith('/') ? '' : '/'}${image}`;
    }

    return { title, description, image, url };
  } catch (error) {
    console.error('Failed to fetch URL metadata:', error);
    return null;
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
    notifyRealtime();
  } catch (error) {
    console.error('Failed to clear chat:', error);
    throw new Error('Failed to clear chat. Database connection error.');
  }
}

export async function updatePresence(username: string) {
  noStore();
  if (!username || username === "login") return;
  
  try {
    await dbConnect();
    const uname = username.trim().toLowerCase();
    await User.findOneAndUpdate(
      { username: uname },
      { lastSeen: new Date() },
      { upsert: true, new: true }
    );
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
  } catch (error) {
    console.error('Failed to mark as read:', error);
    throw new Error('Failed to mark as read. Database connection error.');
  }
}

// CONFIG PREFERENCES
export async function checkIncognito() {
  return true;
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
  } catch (error) {
    console.error('Failed to update chat preferences:', error);
    throw new Error('Failed to update chat preferences.');
  }
}

export async function fetchAllMedia(currentUser?: string) {
  noStore();
  try {
    await dbConnect();
    
    const mediaQuery: Record<string, unknown> = {
      $or: [
        { imageUrl: { $exists: true, $nin: [null, ""] } },
        { imageUrls: { $exists: true, $not: { $size: 0 } } },
        { videoUrl: { $exists: true, $nin: [null, ""] } },
        { videoUrls: { $exists: true, $not: { $size: 0 } } }
      ]
    };

    if (currentUser) {
      mediaQuery.deletedFor = { $ne: currentUser };
    }

    const messages = await Message.find(mediaQuery).sort({ createdAt: -1 }).lean();

    return JSON.parse(JSON.stringify(messages));
  } catch (error) {
    console.error('Fetch all media error:', error);
    throw new Error('Unable to fetch media.');
  }
}

// CALLING FEATURE

type IceServerEntry = { urls: string | string[]; username?: string; credential?: string };

// Metered credentials cached in memory so we don't hit their API on every page load.
let cachedIceServers: { servers: IceServerEntry[]; fetchedAt: number } | null = null;
const ICE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Returns ICE servers (STUN + TURN) for WebRTC.
// TURN is required for reliable connections across mobile data / strict NATs.
// Preferred source: Metered credentials API (METERED_DOMAIN + METERED_API_KEY).
// Fallback: static TURN_URLS / TURN_USERNAME / TURN_CREDENTIAL env vars, then STUN-only.
export async function getIceServers(): Promise<IceServerEntry[]> {
  noStore();

  if (cachedIceServers && Date.now() - cachedIceServers.fetchedAt < ICE_CACHE_TTL_MS) {
    return cachedIceServers.servers;
  }

  const meteredDomain = process.env.METERED_DOMAIN;
  const meteredApiKey = process.env.METERED_API_KEY;

  if (meteredDomain && meteredApiKey) {
    try {
      const res = await fetch(
        `https://${meteredDomain}/api/v1/turn/credentials?apiKey=${meteredApiKey}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const servers = (await res.json()) as IceServerEntry[];
        if (Array.isArray(servers) && servers.length > 0) {
          cachedIceServers = { servers, fetchedAt: Date.now() };
          return servers;
        }
      }
      console.error('Metered TURN API returned unexpected response:', res.status);
    } catch (error) {
      console.error('Failed to fetch Metered TURN credentials:', error);
    }
  }

  const iceServers: IceServerEntry[] = [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
      ],
    },
  ];

  const turnUrls = process.env.TURN_URLS;
  const turnUsername = process.env.TURN_USERNAME;
  const turnCredential = process.env.TURN_CREDENTIAL;

  if (turnUrls && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrls.split(',').map((u) => u.trim()).filter(Boolean),
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return iceServers;
}

// Append a signaling message to the target's queue (never overwrites).
export async function pushCallSignal(targetUser: string, kind: string, payload: string) {
  noStore();
  try {
    await dbConnect();
    await User.findOneAndUpdate(
      { username: targetUser.trim().toLowerCase() },
      { $push: { callSignals: { kind, payload } } }
    );
  } catch (error) {
    console.error('Failed to push call signal:', error);
  }
}

export async function initiateCall(fromUser: string, toUser: string, offer: string) {
  noStore();
  try {
    await dbConnect();
    const toUname = toUser.trim().toLowerCase();

    // Seed the callee with a fresh signal queue containing the offer.
    await User.findOneAndUpdate(
      { username: toUname },
      {
        callStatus: 'ringing',
        callerId: fromUser,
        signalData: null,
        callSignals: [{ kind: 'offer', payload: offer }],
        lastCallEndReason: null,
      }
    );

    // Mark caller engaged with a clean queue ready to receive the answer/candidates.
    await User.findOneAndUpdate(
      { username: fromUser.trim().toLowerCase() },
      {
        callStatus: 'on-call',
        callerId: toUser,
        signalData: null,
        callSignals: [],
        lastCallEndReason: null,
      }
    );
  } catch (error) {
    console.error('Failed to initiate call:', error);
    throw new Error('Failed to initiate call.');
  }
}

export async function acceptCall(username: string, answer: string) {
  noStore();
  try {
    await dbConnect();
    const uname = username.trim().toLowerCase();

    // Deliver my answer into the caller's queue.
    const me = await User.findOne({ username: uname });
    if (me && me.callerId) {
      await User.findOneAndUpdate(
        { username: me.callerId.trim().toLowerCase() },
        { $push: { callSignals: { kind: 'answer', payload: answer } } }
      );
    }

    // Set own status to on-call
    await User.findOneAndUpdate(
      { username: uname },
      { callStatus: 'on-call' }
    );
  } catch (error) {
    console.error('Failed to accept call:', error);
    throw new Error('Failed to accept call.');
  }
}

export async function endCall(username: string, logData?: { status: 'completed' | 'missed' | 'rejected', duration: number, from: string, to: string }) {
  noStore();
  try {
    await dbConnect();
    const uname = username.trim().toLowerCase();
    const user = await User.findOne({ username: uname });
    
    const reason = logData?.status || 'completed';

    if (user && user.callerId) {
      // Reset the other person and set reason
      await User.findOneAndUpdate(
        { username: user.callerId.trim().toLowerCase() },
        { callStatus: 'idle', callerId: null, signalData: null, callSignals: [], lastCallEndReason: reason }
      );
    }

    // Reset self and set reason
    await User.findOneAndUpdate(
      { username: uname },
      { callStatus: 'idle', callerId: null, signalData: null, callSignals: [], lastCallEndReason: reason }
    );

    // Log the call if data is provided
    if (logData) {
      await CallLog.create({
        from: logData.from,
        to: logData.to,
        status: logData.status,
        duration: logData.duration,
        createdAt: new Date()
      });

      // Also send a message to the chat
      await Message.create({
        text: `[CALL_LOG:${logData.status}:${logData.duration}:${logData.from}:${logData.to}]`,
        createdBy: logData.from,
        createdAt: new Date()
      });
    }
  } catch (error) {
    console.error('Failed to end call:', error);
    throw new Error('Failed to end call.');
  }
}

export async function getCallLogs() {
  noStore();
  try {
    await dbConnect();
    const logs = await CallLog.find({}).sort({ createdAt: -1 }).limit(50).lean();
    return JSON.parse(JSON.stringify(logs));
  } catch (error) {
    console.error('Failed to fetch call logs:', error);
    throw new Error('Failed to fetch call logs.');
  }
}

export async function fetchCallStatus(username: string) {
  noStore();
  try {
    await dbConnect();
    const user = await User.findOne({ username: username.trim().toLowerCase() }).select('callStatus callerId callSignals lastCallEndReason').lean();
    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    console.error('Failed to fetch call status:', error);
    return null;
  }
}
