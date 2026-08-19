/** Read a picker File fully and reject truncated camera/iCloud payloads. */

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function hasJpegEnd(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  const from = Math.max(2, bytes.length - 8192);
  for (let i = bytes.length - 2; i >= from; i--) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) return true;
  }
  return false;
}

function hasPngEnd(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  if (bytes[0] !== 0x89 || ascii(bytes, 1, 3) !== "PNG") return false;
  return ascii(bytes, bytes.length - 8, 4) === "IEND";
}

function hasGifEnd(bytes: Uint8Array): boolean {
  if (bytes.length < 7 || ascii(bytes, 0, 3) !== "GIF") return false;
  return bytes[bytes.length - 1] === 0x3b;
}

function hasWebpEnd(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return false;
  const declared = bytes[4]! | (bytes[5]! << 8) | (bytes[6]! << 16) | (bytes[7]! << 24);
  const expected = 8 + declared;
  return bytes.length >= expected && bytes.length - expected < 16;
}

function looksLikeHeic(bytes: Uint8Array): boolean {
  if (bytes.length < 12 || ascii(bytes, 4, 4) !== "ftyp") return false;
  const brand = ascii(bytes, 8, 4).toLowerCase();
  return ["heic", "heif", "mif1", "msf1", "hevx", "hevc"].includes(brand);
}

function looksLikeMp4(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && ascii(bytes, 4, 4) === "ftyp";
}

export function sniffMediaMime(bytes: Uint8Array, fallback = ""): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG") return "image/png";
  if (bytes.length >= 6 && ascii(bytes, 0, 3) === "GIF") return "image/gif";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }
  if (looksLikeHeic(bytes)) return "image/heic";
  if (looksLikeMp4(bytes)) return fallback.startsWith("audio/") ? fallback : "video/mp4";
  return fallback;
}

export function imageBufferLooksComplete(bytes: Uint8Array, mimeType: string): boolean {
  if (bytes.length < 32) return false;
  const mime = sniffMediaMime(bytes, mimeType || "").toLowerCase();
  if (mime.includes("jpeg") || mime.includes("jpg")) return hasJpegEnd(bytes);
  if (mime.includes("png")) return hasPngEnd(bytes);
  if (mime.includes("gif")) return hasGifEnd(bytes);
  if (mime.includes("webp")) return hasWebpEnd(bytes);
  if (mime.includes("heic") || mime.includes("heif")) return looksLikeHeic(bytes);
  return bytes[0] === 0xff || bytes[0] === 0x89 || looksLikeHeic(bytes) || looksLikeMp4(bytes);
}

export function needsJpegDelivery(mimeType: string): boolean {
  const mime = (mimeType || "").toLowerCase();
  return mime.includes("heic") || mime.includes("heif") || mime.includes("tiff");
}

/**
 * Force the OS to download iCloud/Photos originals into a real in-memory File.
 * Rejects empty or truncated payloads before they are uploaded.
 */
export async function materializeFile(file: File): Promise<File> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength === 0) {
    throw new Error(
      `${file.name || "File"} is empty. Wait for it to finish downloading from Photos/iCloud, then attach it again.`
    );
  }
  if (file.size > 0 && bytes.byteLength !== file.size) {
    throw new Error(
      `${file.name || "File"} was only partly read (${bytes.byteLength} of ${file.size} bytes). Attach the original again.`
    );
  }

  const type = file.type || sniffMediaMime(bytes) || "application/octet-stream";

  return new File([buffer], file.name || "upload", {
    type,
    lastModified: file.lastModified || Date.now(),
  });
}
