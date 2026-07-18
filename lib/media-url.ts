/** Helpers for locking chat media behind our authenticated proxy. */

export type CloudinaryResourceType = "image" | "video" | "raw";
export type CloudinaryDeliveryType = "upload" | "authenticated" | "private";

export interface ParsedCloudinaryRef {
  publicId: string;
  resourceType: CloudinaryResourceType;
  deliveryType: CloudinaryDeliveryType;
}

const MEDIA_PROXY_PATH = "/api/attachments/media";

export function isAppMediaProxyUrl(url: string): boolean {
  return typeof url === "string" && url.startsWith(MEDIA_PROXY_PATH);
}

export function isCloudinaryUrl(url: string): boolean {
  return typeof url === "string" && /^https:\/\/res\.cloudinary\.com\//.test(url);
}

/** Build a same-origin media URL that only works when the user is logged in. */
export function buildProtectedMediaUrl(opts: {
  publicId: string;
  resourceType?: CloudinaryResourceType;
  deliveryType?: CloudinaryDeliveryType;
  poster?: boolean;
}): string {
  const params = new URLSearchParams({
    publicId: opts.publicId,
    resourceType: opts.resourceType || "image",
    deliveryType: opts.deliveryType || "authenticated",
  });
  if (opts.poster) params.set("poster", "1");
  return `${MEDIA_PROXY_PATH}?${params.toString()}`;
}

/**
 * Parse a Cloudinary delivery URL into publicId + types.
 * Handles /upload/, /authenticated/, /private/ and optional /s--sig--/ segments.
 */
export function parseCloudinaryUrl(url: string): ParsedCloudinaryRef | null {
  try {
    if (!isCloudinaryUrl(url)) return null;
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    // [cloudName, resourceType, deliveryType, ...rest]
    if (parts.length < 4) return null;
    const resourceType = parts[1] as CloudinaryResourceType;
    const deliveryType = parts[2] as CloudinaryDeliveryType;
    if (!["image", "video", "raw"].includes(resourceType)) return null;
    if (!["upload", "authenticated", "private"].includes(deliveryType)) return null;

    let rest = parts.slice(3);
    // Drop signature segment if present: s--xxxxx--
    if (rest[0]?.startsWith("s--")) rest = rest.slice(1);
    // Drop version: v123456
    if (rest[0]?.match(/^v\d+$/)) rest = rest.slice(1);
    if (!rest.length) return null;

    let publicId = decodeURIComponent(rest.join("/"));
    // Image/video public IDs usually omit the extension in Cloudinary APIs
    if (resourceType !== "raw") {
      publicId = publicId.replace(/\.[^/.]+$/, "");
    }
    if (!publicId.startsWith("messaging/")) return null;

    return { publicId, resourceType, deliveryType };
  } catch {
    return null;
  }
}

/** Parse our proxy URL back to Cloudinary refs (for delete, etc.). */
export function parseProtectedMediaUrl(url: string): ParsedCloudinaryRef | null {
  try {
    if (!isAppMediaProxyUrl(url)) return null;
    const u = new URL(url, "http://local");
    const publicId = u.searchParams.get("publicId") || "";
    if (!publicId.startsWith("messaging/") || publicId.includes("..")) return null;
    const resourceTypeParam = u.searchParams.get("resourceType") || "image";
    const deliveryTypeParam = u.searchParams.get("deliveryType") || "authenticated";
    const resourceType = (
      resourceTypeParam === "video" || resourceTypeParam === "raw" ? resourceTypeParam : "image"
    ) as CloudinaryResourceType;
    const deliveryType = (
      deliveryTypeParam === "upload" || deliveryTypeParam === "private"
        ? deliveryTypeParam
        : "authenticated"
    ) as CloudinaryDeliveryType;
    return { publicId, resourceType, deliveryType };
  } catch {
    return null;
  }
}

/**
 * Rewrite any chat media URL to a login-gated proxy URL.
 * Blob/data URLs (optimistic local previews) are left untouched.
 */
export function toProtectedMediaUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  if (isAppMediaProxyUrl(url)) return url;

  const fromCloudinary = parseCloudinaryUrl(url);
  if (fromCloudinary) {
    return buildProtectedMediaUrl(fromCloudinary);
  }

  const fromProxy = parseProtectedMediaUrl(url);
  if (fromProxy) return buildProtectedMediaUrl(fromProxy);

  return url;
}

export function protectMediaUrlList(urls?: string[] | null): string[] | undefined {
  if (!urls?.length) return urls || undefined;
  return urls.map((u) => toProtectedMediaUrl(u));
}
