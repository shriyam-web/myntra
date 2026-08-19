import { v2 as cloudinary } from "cloudinary";
import { getSession } from "../../../../lib/auth/session";
import type { CloudinaryDeliveryType, CloudinaryResourceType } from "../../../../lib/media-url";
import { assertMediaStillAvailable } from "../../../../lib/media-access";
import { imageBufferLooksComplete, needsJpegDelivery, sniffMediaMime } from "../../../../lib/media-file";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BUFFER_BYTES = 25 * 1024 * 1024;

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
  opts?: { format?: string; range?: string | null }
) {
  const url = signedMediaUrl(publicId, resourceType, deliveryType, opts);
  const headers: HeadersInit = {};
  if (opts?.range) headers.Range = opts.range;
  return fetch(url, {
    headers,
    signal: AbortSignal.timeout(55_000),
    cache: "no-store",
  });
}

function imageResponse(bytes: Uint8Array, contentType: string, disposition: Record<string, string>) {
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, max-age=120",
      ...disposition,
    },
  });
}

async function fetchCompleteJpeg(
  publicId: string,
  deliveryType: CloudinaryDeliveryType
) {
  const retry = await fetchSigned(publicId, "image", deliveryType, { format: "jpg" });
  if (!retry.ok) return null;
  const jpgBytes = new Uint8Array(await retry.arrayBuffer());
  if (!jpgBytes.byteLength || !imageBufferLooksComplete(jpgBytes, "image/jpeg")) return null;
  return jpgBytes;
}

function copyUpstreamHeaders(upstream: Response, extra?: HeadersInit) {
  const headers = new Headers(extra);
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);
  const acceptRanges = upstream.headers.get("accept-ranges") || "bytes";
  headers.set("Accept-Ranges", acceptRanges);
  return headers;
}

/**
 * Login-gated media delivery for photos / videos / audio.
 * Cloudinary assets are stored as `authenticated` so unsigned CDN URLs return 401.
 * This route checks the session cookie, then streams a short-lived signed fetch.
 *
 * Images are buffered in full so a timeout never returns a truncated JPEG.
 * Videos/audio forward Range so players can seek without downloading the whole file.
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

  const range = request.headers.get("range");

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
      const posterBytes = new Uint8Array(await posterUpstream.arrayBuffer());
      if (!posterBytes.byteLength) {
        return new Response("Poster unavailable", { status: 502 });
      }
      return new Response(Buffer.from(posterBytes), {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(posterBytes.byteLength),
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    const wantsRange = Boolean(range) && resourceType !== "image";
    let upstream: Response | null = null;
    let usedType: CloudinaryDeliveryType = deliveryType;
    let usedFormat: string | undefined;

    for (const type of deliveryFallbacks) {
      const attempt = await fetchSigned(publicId, resourceType, type, {
        range: wantsRange ? range : undefined,
      });
      if ((attempt.ok || attempt.status === 206) && attempt.body) {
        upstream = attempt;
        usedType = type;
        break;
      }
      console.warn("Media proxy signed fetch failed:", attempt.status, publicId, type);
    }

    if (!upstream?.body) {
      return new Response("Media unavailable", { status: 502 });
    }

    let contentType =
      upstream.headers.get("content-type") ||
      (resourceType === "video"
        ? "video/mp4"
        : resourceType === "raw"
          ? "application/octet-stream"
          : "image/jpeg");

    if (resourceType === "image" && needsJpegDelivery(contentType)) {
      let converted: Response | null = null;
      for (const type of deliveryFallbacks) {
        const attempt = await fetchSigned(publicId, resourceType, type, { format: "jpg" });
        if (attempt.ok && attempt.body) {
          converted = attempt;
          usedType = type;
          usedFormat = "jpg";
          break;
        }
      }
      if (converted) {
        upstream = converted;
        contentType = converted.headers.get("content-type") || "image/jpeg";
      }
    }

    const disposition = asDownload
      ? {
          "Content-Disposition": `attachment; filename="${publicId.split("/").pop() || "media"}"`,
        }
      : {
          "Content-Disposition": "inline",
        };

    // Buffer images (and small files) so we never send a truncated body with a lying Content-Length.
    const declaredLength = Number(upstream.headers.get("content-length") || 0);
    const shouldBuffer =
      resourceType === "image" ||
      (declaredLength > 0 && declaredLength <= MAX_BUFFER_BYTES && !wantsRange);

    if (shouldBuffer && upstream.status !== 206) {
      const bytes = new Uint8Array(await upstream.arrayBuffer());
      if (!bytes.byteLength) {
        return new Response("Media unavailable", { status: 502 });
      }

      if (resourceType === "image") {
        const sniffedType = sniffMediaMime(bytes, contentType);
        if (usedFormat !== "jpg" && (needsJpegDelivery(sniffedType) || !imageBufferLooksComplete(bytes, sniffedType))) {
          const jpgBytes = await fetchCompleteJpeg(publicId, usedType);
          if (jpgBytes) return imageResponse(jpgBytes, "image/jpeg", disposition);
          if (needsJpegDelivery(sniffedType) || !imageBufferLooksComplete(bytes, sniffedType)) {
            return new Response("Media incomplete", { status: 502 });
          }
        }
        return imageResponse(bytes, sniffedType || contentType, disposition);
      }

      return imageResponse(bytes, contentType, disposition);
    }

    const headers = copyUpstreamHeaders(upstream, {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=120",
      ...disposition,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error("Media proxy failed:", error);
    return new Response("Media unavailable", { status: 500 });
  }
}
