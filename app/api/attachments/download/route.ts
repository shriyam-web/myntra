import { v2 as cloudinary } from "cloudinary";
import { getSession } from "../../../../lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Map file extensions to MIME types. Cloudinary serves auto-generated raw
// public IDs (no extension) as application/octet-stream, which stops browsers
// from previewing them, so we set the correct type ourselves.
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  json: "application/json; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
};

// Types that browsers can render inline. Others always download.
const INLINE_PREVIEWABLE = new Set([
  "pdf", "txt", "csv", "md", "json", "xml", "png", "jpg", "jpeg", "gif", "webp",
]);

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/**
 * Cloudinary blocks direct public delivery of PDF/ZIP "raw" files on free
 * accounts (the stored URL returns 401 → "Webpage not available"). This route
 * streams any chat attachment to a logged-in user through a short-lived
 * authenticated Cloudinary link, either inline (preview) or as a download.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const publicId = searchParams.get("publicId") || "";
  const resourceTypeParam = searchParams.get("resourceType") || "raw";
  const name = (searchParams.get("name") || "file").slice(0, 255);
  const mode = searchParams.get("mode") === "inline" ? "inline" : "download";

  // Only allow assets from this app's upload folder.
  if (!publicId.startsWith("messaging/") || publicId.includes("..")) {
    return new Response("Invalid attachment", { status: 400 });
  }
  const resourceType =
    resourceTypeParam === "image" || resourceTypeParam === "video" ? resourceTypeParam : "raw";

  const ext = extOf(name);
  const canInline = mode === "inline" && INLINE_PREVIEWABLE.has(ext);
  const disposition = canInline ? "inline" : "attachment";

  try {
    const downloadUrl = cloudinary.utils.private_download_url(publicId, null as unknown as string, {
      resource_type: resourceType,
      type: "upload",
      attachment: true,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 10,
    });

    const upstream = await fetch(downloadUrl);
    if (!upstream.ok || !upstream.body) {
      console.error("Attachment download failed upstream:", upstream.status);
      return new Response("Attachment unavailable", { status: 502 });
    }

    const safeName = name.replace(/[\r\n"\\]/g, "_");
    const contentType =
      MIME_BY_EXT[ext] || upstream.headers.get("content-type") || "application/octet-stream";

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        ...(upstream.headers.get("content-length")
          ? { "Content-Length": upstream.headers.get("content-length") as string }
          : {}),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Attachment download failed:", error);
    return new Response("Attachment unavailable", { status: 500 });
  }
}
