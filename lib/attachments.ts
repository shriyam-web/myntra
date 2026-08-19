/** Shared attachment validation + classification for chat media. */

/** Images/docs stay smaller; videos use Cloudinary chunked-upload capacity (Plus plan max). */
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_ATTACHMENT_BYTES = MAX_VIDEO_BYTES;
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "com", "msi", "scr", "pif", "jar", "js", "mjs", "cjs",
  "vbs", "vbe", "wsf", "wsh", "ps1", "sh", "bash", "html", "htm", "shtml",
  "xhtml", "svg", "php", "asp", "aspx", "cgi", "dll", "sys", "apk", "ipa",
]);

const DOCUMENT_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "csv",
  "odt", "ods", "odp", "zip", "rar", "7z", "tar", "gz", "json", "xml", "md",
  "epub", "pages", "numbers", "key",
]);

const DOCUMENT_MIME_PREFIXES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats",
  "application/vnd.ms-",
  "application/vnd.oasis.opendocument",
  "application/zip",
  "application/x-zip",
  "application/x-rar",
  "application/x-7z",
  "application/gzip",
  "application/x-tar",
  "application/json",
  "application/xml",
  "text/plain",
  "text/csv",
  "text/rtf",
  "text/markdown",
  "text/xml",
];

export type AttachmentKind = "image" | "video" | "audio" | "document";

export function getFileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function isBlockedAttachment(file: File): boolean {
  const ext = getFileExtension(file.name);
  if (ext && BLOCKED_EXTENSIONS.has(ext)) return true;
  const mime = (file.type || "").toLowerCase();
  if (
    mime.includes("javascript") ||
    mime.includes("html") ||
    mime === "image/svg+xml" ||
    mime === "application/x-msdownload" ||
    mime === "application/x-msdos-program"
  ) {
    return true;
  }
  return false;
}

export function isDocumentFile(file: File): boolean {
  if (isBlockedAttachment(file)) return false;
  const mime = (file.type || "").toLowerCase();
  if (DOCUMENT_MIME_PREFIXES.some((p) => mime.startsWith(p))) return true;
  const ext = getFileExtension(file.name);
  return DOCUMENT_EXTENSIONS.has(ext);
}

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "avif", "bmp"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "m4v", "avi", "mkv", "3gp"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "wav", "aac", "ogg", "oga", "flac", "webm"]);

export function classifyFile(file: File): AttachmentKind | null {
  if (isBlockedAttachment(file)) return null;
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (isDocumentFile(file)) return "document";
  const ext = getFileExtension(file.name);
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (DOCUMENT_EXTENSIONS.has(ext)) return "document";
  return null;
}

export function cloudinaryResourceForKind(kind: AttachmentKind): "image" | "video" | "raw" {
  if (kind === "image") return "image";
  if (kind === "video" || kind === "audio") return "video";
  return "raw";
}

export function maxBytesForKind(kind: AttachmentKind): number {
  if (kind === "video") return MAX_VIDEO_BYTES;
  if (kind === "audio") return MAX_AUDIO_BYTES;
  if (kind === "image") return MAX_IMAGE_BYTES;
  return MAX_DOCUMENT_BYTES;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  }
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(gb < 10 ? 1 : 0)} GB`;
}

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
