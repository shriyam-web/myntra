import dbConnect from "./mongodb";
import {
  AppSettings,
  Message,
  Plan,
  Reminder,
  CallLog,
  MediaCleanupJob,
} from "../models/schemas";
import { APP_SETTINGS_KEY } from "./maintenance";
import {
  parseCloudinaryUrl,
  parseProtectedMediaUrl,
} from "./media-url";

export const DISAPPEARING_TTL_MS = 60 * 60 * 1000; // 1 hour after first view

export type DisappearingModePayload = {
  disappearingMode: boolean;
  disappearingEnabledAt: string | null;
  disappearingEnabledBy: string | null;
};

export async function getDisappearingModePayload(): Promise<DisappearingModePayload> {
  await dbConnect();
  const settings = await AppSettings.findOne({ key: APP_SETTINGS_KEY }).lean();
  return {
    disappearingMode: Boolean(settings?.disappearingMode),
    disappearingEnabledAt: settings?.disappearingEnabledAt
      ? new Date(settings.disappearingEnabledAt).toISOString()
      : null,
    disappearingEnabledBy: settings?.disappearingEnabledBy ?? null,
  };
}

export async function isDisappearingModeEnabled(): Promise<boolean> {
  const mode = await getDisappearingModePayload();
  return mode.disappearingMode;
}

/** Snapshot fields to attach when creating a message while mode is on. */
export async function disappearingCreateFields(): Promise<{ disappearing: boolean }> {
  const enabled = await isDisappearingModeEnabled();
  return { disappearing: enabled };
}

/** Mongo filter: hide messages that have already expired (and are still marked disappearing). */
export function notExpiredMessageFilter(now = new Date()) {
  return {
    $or: [
      { disappearing: { $ne: true } },
      { expiresAt: null },
      { expiresAt: { $gt: now } },
    ],
  };
}

/** Messages with neither a pin nor a legacy save are eligible to expire. */
function noPermanentProtectionFilter() {
  return {
    $and: [
      { $or: [{ pinnedBy: { $exists: false } }, { pinnedBy: { $size: 0 } }] },
      { $or: [{ savedBy: { $exists: false } }, { savedBy: { $size: 0 } }] },
    ],
  };
}

export function notExpiredSharedFilter(now = new Date()) {
  return {
    $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
  };
}

type MediaAsset = {
  publicId: string;
  resourceType: string;
  deliveryType: string;
};

function collectMessageAssets(message: Record<string, unknown>): MediaAsset[] {
  const assets: MediaAsset[] = [];
  const urls = [
    message.imageUrl,
    ...((message.imageUrls as string[]) || []),
    message.videoUrl,
    ...((message.videoUrls as string[]) || []),
    message.audioUrl,
    ...((message.audioUrls as string[]) || []),
  ].filter(Boolean) as string[];

  for (const url of urls) {
    const ref = parseProtectedMediaUrl(url) || parseCloudinaryUrl(url);
    if (!ref) continue;
    assets.push({
      publicId: ref.publicId,
      resourceType: ref.resourceType,
      deliveryType: ref.deliveryType,
    });
  }

  for (const doc of (message.documents as Array<{ publicId?: string; resourceType?: string }>) || []) {
    if (!doc?.publicId) continue;
    assets.push({
      publicId: doc.publicId,
      resourceType: doc.resourceType || "raw",
      deliveryType: "upload",
    });
  }
  return assets;
}

export async function scheduleMediaCleanup(
  messageId: string,
  message: Record<string, unknown>,
  expiresAt: Date
) {
  const assets = collectMessageAssets(message);
  if (!assets.length) return;
  await MediaCleanupJob.findOneAndUpdate(
    { messageId },
    {
      messageId,
      assets,
      purgeAt: expiresAt,
    },
    { upsert: true }
  );
}

export async function cancelMediaCleanup(messageId: string) {
  await MediaCleanupJob.deleteMany({ messageId });
}

/**
 * Mark incoming disappearing messages as viewed by the partner.
 * Sets viewedAt once and expiresAt = viewedAt + 1h; propagates to linked records.
 */
export async function markDisappearingMessagesViewed(
  viewer: string,
  messageIds: string[]
): Promise<number> {
  const ids = [...new Set(messageIds.map((id) => String(id).trim()).filter(Boolean))].slice(0, 40);
  if (!ids.length) return 0;

  await dbConnect();
  const me = viewer.trim().toLowerCase();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DISAPPEARING_TTL_MS);

  const candidates = await Message.find({
    _id: { $in: ids },
    disappearing: true,
    viewedAt: null,
    createdBy: { $ne: me },
  }).lean();

  // Skip anything pinned by either partner. Legacy saves remain protected during migration.
  const eligible = candidates.filter(
    (m) =>
      !(Array.isArray(m.pinnedBy) && m.pinnedBy.length > 0) &&
      !(Array.isArray(m.savedBy) && m.savedBy.length > 0)
  );

  let updated = 0;
  for (const msg of eligible) {
    const result = await Message.findOneAndUpdate(
      {
        _id: msg._id,
        disappearing: true,
        viewedAt: null,
        ...noPermanentProtectionFilter(),
      },
      { viewedAt: now, expiresAt },
      { new: true }
    );
    if (!result) continue;
    updated += 1;

    const itemId = result.sharedItemMeta?.itemId;
    const itemIds = result.sharedItemMeta?.itemIds as string[] | undefined;
    const listId = result.sharedItemMeta?.listId as string | undefined;
    const itemType = result.sharedItemMeta?.itemType;
    if (itemType === "todo-list") {
      if (listId) {
        await Plan.updateMany({ listId }, { expiresAt });
      } else if (itemIds?.length) {
        await Plan.updateMany({ _id: { $in: itemIds } }, { expiresAt });
      }
    } else if (itemId && itemType === "task") {
      await Plan.updateOne({ _id: itemId }, { expiresAt });
    } else if (itemId && itemType === "reminder") {
      await Reminder.updateOne({ _id: itemId }, { expiresAt });
    }

    if (result.kind === "call-log" && result.relatedCallId) {
      await CallLog.updateOne({ callId: result.relatedCallId }, { expiresAt });
    }

    const plain =
      typeof (result as { toObject?: () => Record<string, unknown> }).toObject === "function"
        ? (result as { toObject: () => Record<string, unknown> }).toObject()
        : (result as unknown as Record<string, unknown>);
    await scheduleMediaCleanup(String(result._id), plain, expiresAt);
  }

  return updated;
}

/** Permanently convert a disappearing message into a regular one (save exemption). */
export async function permanentlyKeepMessage(messageId: string) {
  await dbConnect();
  const result = await Message.findOneAndUpdate(
    { _id: messageId, disappearing: true },
    {
      disappearing: false,
      viewedAt: null,
      expiresAt: null,
    },
    { new: true }
  );
  if (!result) return null;

  const itemId = result.sharedItemMeta?.itemId;
  const itemIds = result.sharedItemMeta?.itemIds as string[] | undefined;
  const listId = result.sharedItemMeta?.listId as string | undefined;
  const itemType = result.sharedItemMeta?.itemType;
  if (itemType === "todo-list") {
    if (listId) {
      await Plan.updateMany({ listId }, { expiresAt: null });
    } else if (itemIds?.length) {
      await Plan.updateMany({ _id: { $in: itemIds } }, { expiresAt: null });
    }
  } else if (itemId && itemType === "task") {
    await Plan.updateOne({ _id: itemId }, { expiresAt: null });
  } else if (itemId && itemType === "reminder") {
    await Reminder.updateOne({ _id: itemId }, { expiresAt: null });
  }
  if (result.kind === "call-log" && result.relatedCallId) {
    await CallLog.updateOne({ callId: result.relatedCallId }, { expiresAt: null });
  }
  await cancelMediaCleanup(String(result._id));
  return result;
}

export async function processMediaCleanupJobs(limit = 40): Promise<number> {
  await dbConnect();
  const due = await MediaCleanupJob.find({ purgeAt: { $lte: new Date() } })
    .sort({ purgeAt: 1 })
    .limit(limit)
    .lean();

  // Lazy import cloudinary to keep this module usable without cloudinary config in unit contexts
  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  let processed = 0;
  for (const job of due) {
    // Only purge if the message is gone or still marked disappearing+expired
    const msg = await Message.findById(job.messageId)
      .select("disappearing expiresAt pinnedBy savedBy")
      .lean();
    const stillProtected =
      msg &&
      (!msg.disappearing ||
        (Array.isArray(msg.pinnedBy) && msg.pinnedBy.length > 0) ||
        (Array.isArray(msg.savedBy) && msg.savedBy.length > 0) ||
        (msg.expiresAt && new Date(msg.expiresAt).getTime() > Date.now()));
    if (stillProtected) {
      await MediaCleanupJob.deleteOne({ _id: job._id });
      continue;
    }

    for (const asset of job.assets || []) {
      try {
        await cloudinary.uploader.destroy(asset.publicId, {
          resource_type: asset.resourceType || "image",
          type: asset.deliveryType || "authenticated",
        });
      } catch (err) {
        console.error("Media cleanup destroy failed:", asset.publicId, err);
      }
    }

    // Hard-delete expired message if TTL hasn't yet
    if (msg) {
      await Message.deleteOne({
        _id: job.messageId,
        disappearing: true,
        expiresAt: { $lte: new Date() },
        ...noPermanentProtectionFilter(),
      });
    }
    await MediaCleanupJob.deleteOne({ _id: job._id });
    processed += 1;
  }
  return processed;
}

/** Soft-hide already-expired disappearing messages on every fetch (before TTL fires). */
export async function purgeExpiredDisappearingMessages(): Promise<number> {
  await dbConnect();
  const now = new Date();
  const expired = await Message.find({
    disappearing: true,
    expiresAt: { $lte: now },
    ...noPermanentProtectionFilter(),
  })
    .limit(50)
    .lean();

  let count = 0;
  for (const msg of expired) {
    await scheduleMediaCleanup(String(msg._id), msg as Record<string, unknown>, now);
    const meta = (msg as { sharedItemMeta?: { itemId?: string; itemIds?: string[]; listId?: string; itemType?: string } }).sharedItemMeta;
    const itemId = meta?.itemId;
    const itemIds = meta?.itemIds;
    const listId = meta?.listId;
    const itemType = meta?.itemType;
    if (itemType === "todo-list") {
      if (listId) await Plan.deleteMany({ listId });
      else if (itemIds?.length) await Plan.deleteMany({ _id: { $in: itemIds } });
    } else if (itemId && itemType === "task") {
      await Plan.deleteOne({ _id: itemId });
    } else if (itemId && itemType === "reminder") {
      await Reminder.deleteOne({ _id: itemId });
    }
    if ((msg as { kind?: string; relatedCallId?: string }).kind === "call-log" && (msg as { relatedCallId?: string }).relatedCallId) {
      await CallLog.deleteOne({ callId: (msg as { relatedCallId?: string }).relatedCallId });
    }
    await Message.deleteOne({
      _id: msg._id,
      disappearing: true,
      expiresAt: { $lte: now },
      ...noPermanentProtectionFilter(),
    });
    count += 1;
  }
  return count;
}
