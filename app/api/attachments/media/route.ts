import { v2 as cloudinary } from "cloudinary";
import { getSession } from "../../../../lib/auth/session";
import type { CloudinaryDeliveryType, CloudinaryResourceType } from "../../../../lib/media-url";
import { assertMediaStillAvailable } from "../../../../lib/media-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function signedMediaUrl(
  publicId: string,
  resourceType: CloudinaryResourceType,
  deliveryType: CloudinaryDeliveryType,
  opts?: { format?: string }
) {
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: deliveryType,
    secure: true,
    sign_url: true,
    ...(opts?.format ? { format: opts.format } : {}),
  });
}

async function fetchSigned(
  publicId: string,
  resourceType: CloudinaryResourceType,
  deliveryType: CloudinaryDeliveryType,
  opts?: { format?: string }
) {
  const url = signedMediaUrl(publicId, resourceType, deliveryType, opts);
  return fetch(url);
}

/**
 * Login-gated media delivery for photos / videos / audio.
 * Cloudinary assets are stored as `authenticated` so unsigned CDN URLs return 401.
 * This route checks the session cookie, then streams a short-lived signed fetch.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const publicId = searchParams.get("publicId") || "";
  const resourceTypeParam = searchParams.get("resourceType") || "image";
  const deliveryTypeParam = searchParams.get("deliveryType") || "authenticated";
  const asPoster = searchParams.get("poster") === "1";
  const asDownload = searchParams.get("mode") === "download";

  if (!publicId.startsWith("messaging/") || publicId.includes("..")) {
    return new Response("Invalid media", { status: 400 });
  }

  const stillAvailable = await assertMediaStillAvailable(publicId);
  if (!stillAvailable) {
    return new Response("Media expired", { status: 410 });
  }

  const resourceType: CloudinaryResourceType =
    resourceTypeParam === "video" || resourceTypeParam === "raw" ? resourceTypeParam : "image";
  const deliveryType: CloudinaryDeliveryType =
    deliveryTypeParam === "upload" || deliveryTypeParam === "private"
      ? deliveryTypeParam
      : "authenticated";

  // Prefer the requested delivery type, then fall back for older/migrated assets.
  const deliveryFallbacks: CloudinaryDeliveryType[] =
    deliveryType === "authenticated"
      ? ["authenticated", "upload", "private"]
      : deliveryType === "upload"
        ? ["upload", "authenticated", "private"]
        : ["private", "authenticated", "upload"];

  try {
    // Video poster = jpg frame via signed authenticated/public delivery URL.
    if (asPoster && resourceType === "video") {
      let posterUpstream: Response | null = null;
      for (const type of deliveryFallbacks) {
        const attempt = await fetchSigned(publicId, "video", type, { format: "jpg" });
        if (attempt.ok && attempt.body) {
          posterUpstream = attempt;
          break;
        }
      }
      if (!posterUpstream?.body) {
        return new Response("Poster unavailable", { status: 502 });
      }
      return new Response(posterUpstream.body, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    let upstream: Response | null = null;
    for (const type of deliveryFallbacks) {
      const attempt = await fetchSigned(publicId, resourceType, type);
      if (attempt.ok && attempt.body) {
        upstream = attempt;
        break;
      }
      console.warn("Media proxy signed fetch failed:", attempt.status, publicId, type);
    }

    if (!upstream?.body) {
      return new Response("Media unavailable", { status: 502 });
    }

    const contentType =
      upstream.headers.get("content-type") ||
      (resourceType === "video"
        ? "video/mp4"
        : resourceType === "raw"
          ? "application/octet-stream"
          : "image/jpeg");

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...(asDownload
          ? {
              "Content-Disposition": `attachment; filename="${publicId.split("/").pop() || "media"}"`,
            }
          : {
              "Content-Disposition": "inline",
            }),
        ...(upstream.headers.get("content-length")
          ? { "Content-Length": upstream.headers.get("content-length") as string }
          : {}),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Media proxy failed:", error);
    return new Response("Media unavailable", { status: 500 });
  }
}
