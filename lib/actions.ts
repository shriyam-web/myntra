"use server";

import dbConnect from "./mongodb";
import { notifyRealtime } from "./realtime-hub";
import { withTimeout } from "./with-timeout";
import { Ticket, Wishlist, Plan, TimelineDate, Message, User, CallLog, AppSettings } from "../models/schemas";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { v2 as cloudinary } from "cloudinary";
import { APP_SETTINGS_KEY } from "./maintenance";
import { requireUser } from "./auth/session";
import * as callService from "./calls/service";
import type { CallEndReason, CallSignalType } from "./calls/types";
import {
  buildProtectedMediaUrl,
  parseCloudinaryUrl,
  parseProtectedMediaUrl,
  protectMediaUrlList,
  toProtectedMediaUrl,
} from "./media-url";

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

interface CloudinaryUploadResult extends CloudinaryResult {
  public_id?: string;
  resource_type?: string;
  type?: string;
  bytes?: number;
  original_filename?: string;
}

// IMAGE/VIDEO UPLOAD (authenticated delivery — unsigned CDN URLs return 401)
export async function uploadImage(file: string, resourceType: "image" | "video" | "raw" | "auto" = "auto") {
  const start = Date.now();
  try {
    await requireUser();
    const isVideo = resourceType === "video" || (typeof file === 'string' && file.startsWith('data:video/'));
    const isRaw = resourceType === "raw";
    const actualResourceType = isRaw ? "raw" : isVideo ? "video" : (resourceType === "auto" ? "auto" : "image");
    // Raw/docs stay as public upload type (Cloudinary PDF policy handled by download route).
    // Photos/videos/audio use authenticated so only signed/proxy access works.
    const deliveryType = isRaw ? "upload" : "authenticated";
    
    console.log(`📸 Starting Cloudinary ${actualResourceType}/${deliveryType} upload (file size: ${Math.round(file.length / 1024)}KB)`);
    
    // Cloudinary upload with timeout and better options
    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const timeoutMs = actualResourceType === "video" || actualResourceType === "raw" ? 300000 : 60000;
      
      const uploadTimeout = setTimeout(() => {
        reject(new Error(`Cloudinary upload timed out after ${timeoutMs/1000} seconds`));
      }, timeoutMs);

      cloudinary.uploader.upload(file, {
        folder: "messaging",
        resource_type: actualResourceType,
        type: deliveryType,
        timeout: timeoutMs,
      }, (error, result) => {
        clearTimeout(uploadTimeout);
        if (error) {
          console.error("❌ Cloudinary callback error:", error);
          reject(error);
        } else {
          resolve(result as CloudinaryUploadResult);
        }
      });
    });

    const duration = Date.now() - start;
    const publicId = result.public_id || "";
    const protectedUrl = publicId
      ? buildProtectedMediaUrl({
          publicId,
          resourceType: (result.resource_type as "image" | "video" | "raw") || (actualResourceType === "auto" ? "image" : actualResourceType),
          deliveryType: (result.type as "upload" | "authenticated") || deliveryType,
        })
      : result.secure_url;
    console.log(`✅ Cloudinary upload successful in ${duration}ms: ${protectedUrl}`);
    return protectedUrl;
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
export async function getCloudinarySignature(opts?: { authenticated?: boolean }) {
  await requireUser();
  const timestamp = Math.round((new Date()).getTime() / 1000);
  const folder = "messaging";
  // Photos/videos/audio: authenticated. Documents (raw): leave as upload.
  const useAuthenticated = opts?.authenticated !== false;
  const params: Record<string, string | number> = {
    timestamp,
    folder,
  };
  if (useAuthenticated) {
    params.type = "authenticated";
  }

  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET!
  );

  return { 
    timestamp, 
    signature, 
    apiKey: process.env.CLOUDINARY_API_KEY, 
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    type: useAuthenticated ? "authenticated" : "upload",
  };
}

/** Rewrite message media fields so clients never receive raw Cloudinary CDN URLs. */
function protectMessageMedia<T extends Record<string, unknown>>(message: T): T {
  const m = { ...message } as Record<string, unknown>;
  if (typeof m.imageUrl === "string") m.imageUrl = toProtectedMediaUrl(m.imageUrl);
  if (typeof m.videoUrl === "string") m.videoUrl = toProtectedMediaUrl(m.videoUrl);
  if (typeof m.audioUrl === "string") m.audioUrl = toProtectedMediaUrl(m.audioUrl);
  if (Array.isArray(m.imageUrls)) m.imageUrls = protectMediaUrlList(m.imageUrls as string[]);
  if (Array.isArray(m.videoUrls)) m.videoUrls = protectMediaUrlList(m.videoUrls as string[]);
  if (Array.isArray(m.audioUrls)) m.audioUrls = protectMediaUrlList(m.audioUrls as string[]);
  if (m.repliedTo && typeof m.repliedTo === "object" && m.repliedTo !== null) {
    m.repliedTo = protectMessageMedia(m.repliedTo as Record<string, unknown>);
  }
  return m as T;
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
    const sortedMessages = messages.reverse().map((m) => protectMessageMedia(m as Record<string, unknown>));
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
      messages: JSON.parse(
        JSON.stringify(messages.reverse().map((m) => protectMessageMedia(m as Record<string, unknown>)))
      ),
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

export interface SendMessageExtras {
  documents?: Array<{
    url: string;
    name: string;
    mimeType?: string;
    size?: number;
    publicId?: string;
    resourceType?: string;
  }>;
  location?: { latitude: number; longitude: number; accuracy?: number };
  clientMessageId?: string;
}

/** Extract the Cloudinary public ID from a delivery URL (keeps extension for raw resources). */
function publicIdFromCloudinaryUrl(url: string, resourceType: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return "";
    let rest = parts.slice(uploadIndex + 1);
    if (rest[0]?.match(/^v\d+$/)) rest = rest.slice(1);
    let publicId = rest.join("/");
    if (resourceType !== "raw") publicId = publicId.replace(/\.[^/.]+$/, "");
    return decodeURIComponent(publicId);
  } catch {
    return "";
  }
}

function validateDocuments(documents: SendMessageExtras["documents"]) {
  if (!documents?.length) return undefined;
  if (documents.length > 10) throw new Error("Too many documents (max 10 per message).");
  return documents.map((d) => {
    if (!d.url || !/^https:\/\/res\.cloudinary\.com\//.test(d.url)) {
      throw new Error("Invalid document URL.");
    }
    const name = String(d.name || "file").slice(0, 255);
    const resourceType =
      d.resourceType === "raw" || d.resourceType === "image" || d.resourceType === "video" ? d.resourceType : "raw";
    // publicId is required for the authenticated download route
    // (Cloudinary blocks direct public delivery of PDF/ZIP raw files).
    const publicId =
      String(d.publicId || "").slice(0, 300) || publicIdFromCloudinaryUrl(d.url, resourceType);

    return {
      url: d.url,
      name,
      mimeType: String(d.mimeType || "").slice(0, 120),
      size: Math.max(0, Number(d.size) || 0),
      publicId,
      resourceType,
    };
  });
}

function validateLocation(location: SendMessageExtras["location"]) {
  if (!location) return undefined;
  const { latitude, longitude, accuracy } = location;
  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    throw new Error("Invalid location coordinates.");
  }
  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? Math.max(0, accuracy as number) : undefined,
  };
}

export async function sendMessage(
  text: string,
  createdBy: string,
  imageUrls?: string[],
  videoUrls?: string[],
  repliedTo?: string,
  audioUrls?: string[],
  extras?: SendMessageExtras
) {
  const MAX_TEXT_LENGTH = 50000;
  if (text && text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Message is too long (${text.length} characters). Please shorten it to under ${MAX_TEXT_LENGTH} characters.`);
  }

  try {
    // Sender identity comes from the authenticated session, never the client arg.
    const me = await requireUser();
    void createdBy;

    await withTimeout(dbConnect(), 15000, "Database connection timed out. Please try again.");

    updatePresence(me).catch(err => console.error("Background presence update error:", err));

    const documents = validateDocuments(extras?.documents);
    const location = validateLocation(extras?.location);

    // Never persist raw Cloudinary CDN URLs for photos/videos/audio — only login-gated proxies.
    const data = {
      text,
      createdBy: me,
      imageUrls: protectMediaUrlList(imageUrls),
      videoUrls: protectMediaUrlList(videoUrls),
      audioUrls: protectMediaUrlList(audioUrls),
      repliedTo,
      ...(documents ? { documents } : {}),
      ...(location ? { location, kind: "location" as const } : {}),
      ...(extras?.clientMessageId ? { clientMessageId: String(extras.clientMessageId).slice(0, 80) } : {}),
    };

    let message;
    try {
      message = await withTimeout(
        Message.create(data),
        20000,
        "Saving message timed out. Please check your connection and try again."
      );
    } catch (err: unknown) {
      // Duplicate clientMessageId → the message already exists (client retry); return it.
      if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000 && data.clientMessageId) {
        const existing = await Message.findOne({ clientMessageId: data.clientMessageId }).lean();
        if (existing) return protectMessageMedia(JSON.parse(JSON.stringify(existing)));
      }
      throw err;
    }

    if (me === "alpha 1") {
      (async () => {
        try {
          // Check if delta 1 is online (last seen within 15 seconds)
          const delta1 = await User.findOne({ username: "delta 1" }).lean() as UserDocument | null;
          const isDelta1Online = delta1 && (Date.now() - new Date(delta1.lastSeen).getTime() < 15000);

          if (!isDelta1Online) {
            const hasMedia =
              (data.imageUrls && data.imageUrls.length > 0) ||
              (data.videoUrls && data.videoUrls.length > 0) ||
              (data.audioUrls && data.audioUrls.length > 0) ||
              (documents && documents.length > 0) ||
              Boolean(location);
            const notificationText = hasMedia ? "Sent media content" : data.text || "";
            await sendTelegramNotification(`Alpha 1 sent a new message: ${notificationText.substring(0, 100)}${notificationText.length > 100 ? "..." : ""}`);
          }
        } catch (err) {
          console.error("Background notification error:", err);
        }
      })();
    }

    notifyRealtime();
    return protectMessageMedia(JSON.parse(JSON.stringify(message)));
  } catch (error) {
    console.error('Failed to create message:', error);
    if (error instanceof Error && /Unauthorized|Invalid|Too many|too long/i.test(error.message)) {
      throw error;
    }
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
            const fromProxy = parseProtectedMediaUrl(url);
            const fromCloudinary = parseCloudinaryUrl(url);
            const ref = fromProxy || fromCloudinary;
            if (!ref) continue;

            console.log(`🗑️ Deleting ${ref.resourceType}/${ref.deliveryType} from Cloudinary: ${ref.publicId}`);
            await cloudinary.uploader.destroy(ref.publicId, {
              resource_type: ref.resourceType,
              type: ref.deliveryType,
            });
          } catch (err) {
            console.error(`Failed to delete media from Cloudinary: ${url}`, err);
          }
        }

        // Document attachments carry their exact public IDs and resource types.
        for (const doc of (message.documents || []) as Array<{ publicId?: string; resourceType?: string; url?: string }>) {
          if (!doc?.publicId) continue;
          try {
            console.log(`🗑️ Deleting document from Cloudinary: ${doc.publicId}`);
            await cloudinary.uploader.destroy(doc.publicId, { resource_type: doc.resourceType || 'raw' });
          } catch (err) {
            console.error(`Failed to delete document from Cloudinary: ${doc.url}`, err);
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

function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  // IPv4 private/reserved ranges
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
  }
  // IPv6 loopback/link-local/unique-local
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("[")) return true;
  return false;
}

export async function getUrlMetadata(url: string) {
  try {
    await requireUser();

    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (isPrivateHostname(parsed.hostname)) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        redirect: 'follow',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) return null;
    // Guard against redirects landing on internal hosts.
    if (isPrivateHostname(new URL(response.url).hostname)) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    // Read at most ~512KB — enough for <head> metadata.
    const reader = response.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let bytes = 0;
      while (bytes < 512 * 1024) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        html += decoder.decode(value, { stream: true });
      }
      void reader.cancel().catch(() => undefined);
    } else {
      html = await response.text();
    }

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

// Authenticated calling API (call-scoped, atomic lifecycle)

export async function getIceServersAuthed(): Promise<IceServerEntry[]> {
  noStore();
  await requireUser();
  return getIceServers();
}

export async function startCallAction(startRequestId: string, offer: string) {
  noStore();
  const me = await requireUser();
  return callService.startCall(me, startRequestId, offer);
}

export async function acceptCallAction(callId: string, answer: string) {
  noStore();
  const me = await requireUser();
  return callService.acceptCall(me, callId, answer);
}

export async function rejectCallAction(callId: string) {
  noStore();
  const me = await requireUser();
  return callService.rejectCall(me, callId);
}

export async function endCallAction(callId: string, reason: CallEndReason = "hangup") {
  noStore();
  const me = await requireUser();
  return callService.endCall(me, callId, reason);
}

export async function pushCallSignalAction(input: {
  callId: string;
  signalId: string;
  type: CallSignalType;
  payload: string;
  revision?: number;
  iceGeneration?: number;
}) {
  noStore();
  const me = await requireUser();
  return callService.pushSignal(me, input);
}

export async function fetchCallSignalsAction(callId: string, afterSeq = 0) {
  noStore();
  const me = await requireUser();
  return callService.fetchSignals(me, callId, afterSeq);
}

export async function getActiveCallAction() {
  noStore();
  const me = await requireUser();
  return callService.getActiveCallForUser(me);
}

export async function reportCallConnectedAction(callId: string) {
  noStore();
  const me = await requireUser();
  return callService.reportConnected(me, callId);
}

export async function heartbeatCallAction(callId: string) {
  noStore();
  const me = await requireUser();
  return callService.heartbeatCall(me, callId);
}

export async function getCallLogs() {
  noStore();
  try {
    await requireUser();
    await dbConnect();
    const logs = await CallLog.find({}).sort({ createdAt: -1 }).limit(50).lean();
    return JSON.parse(JSON.stringify(logs));
  } catch (error) {
    console.error("Failed to fetch call logs:", error);
    throw new Error("Failed to fetch call logs.");
  }
}

/** @deprecated Legacy — kept temporarily for older clients */
export async function pushCallSignal(targetUser: string, kind: string, payload: string) {
  noStore();
  void targetUser;
  void kind;
  void payload;
  throw new Error("Deprecated. Use pushCallSignalAction.");
}

/** @deprecated */
export async function initiateCall(fromUser: string, toUser: string, offer: string) {
  noStore();
  void fromUser;
  void toUser;
  void offer;
  throw new Error("Deprecated. Use startCallAction.");
}

/** @deprecated */
export async function acceptCall(username: string, answer: string) {
  noStore();
  void username;
  void answer;
  throw new Error("Deprecated. Use acceptCallAction.");
}

/** @deprecated */
export async function endCall(
  username: string,
  logData?: { status: "completed" | "missed" | "rejected"; duration: number; from: string; to: string }
) {
  noStore();
  void username;
  void logData;
  throw new Error("Deprecated. Use endCallAction.");
}

/** @deprecated */
export async function fetchCallStatus(username: string) {
  noStore();
  void username;
  const me = await requireUser();
  const session = await callService.getActiveCallForUser(me);
  return session
    ? {
        callStatus: session.state === "ringing" ? "ringing" : session.state === "ended" ? "idle" : "on-call",
        callerId: session.role === "callee" ? session.caller : session.callee,
        callId: session.callId,
        session,
      }
    : { callStatus: "idle", callerId: null, callId: null, session: null };
}
