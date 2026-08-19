/** Read a picker File fully and reject truncated camera/gallery payloads. */

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readWithFileReader(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error("Could not read that photo."));
    };
    reader.onerror = () => reject(reader.error || new Error("Could not read that photo."));
    reader.readAsArrayBuffer(file);
  });
}

export async function readFileBytes(file: File): Promise<Uint8Array> {
  let last: Uint8Array | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      let buffer: ArrayBuffer;
      try {
        buffer = await file.arrayBuffer();
      } catch {
        buffer = await readWithFileReader(file);
      }
      const bytes = new Uint8Array(buffer);
      last = bytes;
      if (bytes.byteLength === 0) {
        await sleep(200 * (attempt + 1));
        continue;
      }
      if (file.size > 0 && bytes.byteLength < file.size) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      return bytes;
    } catch {
      await sleep(200 * (attempt + 1));
    }
  }
  if (last && last.byteLength > 0) return last;
  throw new Error("Could not read the full photo. Try attaching it again from Gallery.");
}

/**
 * Walk JPEG markers and return the first complete still (SOI…EOI).
 * Android Motion Photos append an MP4 after EOI — this strips that trailer.
 */
export function extractJpegStill(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) return null;
    while (i < bytes.length && bytes[i] === 0xff) i++;
    if (i >= bytes.length) return null;
    const marker = bytes[i]!;
    i += 1;

    if (marker === 0xd9) return bytes.subarray(0, i);
    if (marker === 0xd8) continue;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;

    if (i + 1 >= bytes.length) return null;
    const len = (bytes[i]! << 8) | bytes[i + 1]!;
    if (len < 2 || i + len > bytes.length) return null;
    i += len;

    if (marker === 0xda) {
      while (i < bytes.length - 1) {
        if (bytes[i] === 0xff && bytes[i + 1] !== 0x00 && !(bytes[i + 1]! >= 0xd0 && bytes[i + 1]! <= 0xd7)) {
          if (bytes[i + 1] === 0xd9) return bytes.subarray(0, i + 2);
          break;
        }
        i += 1;
      }
      return null;
    }
  }
  return null;
}

/** Largest complete JPEG inside a buffer (skips tiny EXIF thumbs when a real still exists). */
export function extractLargestJpeg(bytes: Uint8Array): Uint8Array | null {
  let best: Uint8Array | null = null;
  for (let i = 0; i < bytes.length - 3; i++) {
    if (bytes[i] !== 0xff || bytes[i + 1] !== 0xd8 || bytes[i + 2] !== 0xff) continue;
    const still = extractJpegStill(bytes.subarray(i));
    if (still && (!best || still.length > best.length)) best = still;
    i += still ? Math.max(still.length - 1, 1) : 1;
  }
  return best;
}

export function getJpegOrientation(bytes: Uint8Array): number {
  if (bytes.length < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  let i = 2;
  while (i + 8 < bytes.length) {
    if (bytes[i] !== 0xff) break;
    const marker = bytes[i + 1]!;
    const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (marker === 0xe1 && i + 4 + 6 < bytes.length && ascii(bytes, i + 4, 4) === "Exif") {
      const view = bytes.subarray(i + 10);
      const little = ascii(view, 0, 2) === "II";
      const u16 = (o: number) =>
        little ? view[o]! | (view[o + 1]! << 8) : (view[o]! << 8) | view[o + 1]!;
      const u32 = (o: number) =>
        little
          ? view[o]! | (view[o + 1]! << 8) | (view[o + 2]! << 16) | (view[o + 3]! << 24)
          : (view[o]! << 24) | (view[o + 1]! << 16) | (view[o + 2]! << 8) | view[o + 3]!;
      if (view.length < 8) return 1;
      const ifd = u32(4);
      if (ifd + 2 > view.length) return 1;
      const entries = u16(ifd);
      for (let e = 0; e < entries; e++) {
        const off = ifd + 2 + e * 12;
        if (off + 12 > view.length) break;
        if (u16(off) === 0x0112 && u16(off + 2) === 3) {
          const value = u16(off + 8);
          return value >= 1 && value <= 8 ? value : 1;
        }
      }
      return 1;
    }
    if (len < 2) break;
    i += 2 + len;
    if (marker === 0xda) break;
  }
  return 1;
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
  if (mime.includes("jpeg") || mime.includes("jpg")) {
    return extractJpegStill(bytes) !== null || extractLargestJpeg(bytes) !== null;
  }
  if (mime.includes("png")) return hasPngEnd(bytes);
  if (mime.includes("gif")) return hasGifEnd(bytes);
  if (mime.includes("webp")) return hasWebpEnd(bytes);
  if (mime.includes("heic") || mime.includes("heif")) {
    return looksLikeHeic(bytes) && (extractLargestJpeg(bytes)?.length || 0) > 20_000;
  }
  return bytes[0] === 0xff || bytes[0] === 0x89 || looksLikeHeic(bytes) || looksLikeMp4(bytes);
}

export function needsJpegDelivery(mimeType: string): boolean {
  const mime = (mimeType || "").toLowerCase();
  return mime.includes("heic") || mime.includes("heif") || mime.includes("tiff");
}

/**
 * Copy picker bytes into a real in-memory File (Android Gallery can stream).
 */
export async function materializeFile(file: File): Promise<File> {
  const bytes = await readFileBytes(file);
  if (bytes.byteLength === 0) {
    throw new Error("That file is empty. Attach it again from Gallery.");
  }
  const type = file.type || sniffMediaMime(bytes) || "application/octet-stream";
  return new File([bytes.slice()], file.name || "upload", {
    type,
    lastModified: file.lastModified || Date.now(),
  });
}
