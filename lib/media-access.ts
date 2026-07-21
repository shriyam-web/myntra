import dbConnect from "./mongodb";
import { Message } from "../models/schemas";
import { notExpiredMessageFilter } from "./disappearing-messages";

/**
 * Ensure a Cloudinary publicId still belongs to a non-expired chat message.
 * Blocks media proxy access after disappearing messages expire (or are purged).
 *
 * Messages may store either:
 * - Cloudinary CDN URLs with literal slashes (`.../messaging/foo/bar.jpg`)
 * - Our proxy URLs with URL-encoded publicIds (`?publicId=messaging%2Ffoo%2Fbar`)
 */
export async function assertMediaStillAvailable(publicId: string): Promise<boolean> {
  if (!publicId) return false;
  await dbConnect();
  const escaped = publicId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const encoded = encodeURIComponent(publicId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escaped}|${encoded}`);
  const msg = await Message.findOne({
    $and: [
      notExpiredMessageFilter(),
      {
        $or: [
          { imageUrl: pattern },
          { imageUrls: pattern },
          { videoUrl: pattern },
          { videoUrls: pattern },
          { audioUrl: pattern },
          { audioUrls: pattern },
          { "documents.publicId": publicId },
          { "documents.url": pattern },
        ],
      },
    ],
  })
    .select("_id")
    .lean();
  return Boolean(msg);
}
