"use client";

import {
  extractJpegStill,
  materializeFile,
  readFileBytes,
  sniffMediaMime,
} from "./media-file";

const MAX_EDGE = 2560;
const MIN_DECODE_PIXELS = 2_500;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size < 32) {
          reject(new Error("Could not encode that photo."));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

function fileFromBlob(blob: Blob, originalName: string, ext: string, type: string): File {
  const base = (originalName || "photo").replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.${ext}`, { type, lastModified: Date.now() });
}

function jpegFileFromBytes(bytes: Uint8Array, originalName: string): File {
  return fileFromBlob(new Blob([bytes.slice()], { type: "image/jpeg" }), originalName, "jpg", "image/jpeg");
}

async function blobFromHeic(file: Blob): Promise<Blob> {
  const mod = await import("heic2any");
  const convert =
    (mod as { default?: (opts: { blob: Blob; toType: string; quality: number }) => Promise<Blob | Blob[]> }).default ||
    (mod as unknown as (opts: { blob: Blob; toType: string; quality: number }) => Promise<Blob | Blob[]>);
  const result = await convert({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const out = Array.isArray(result) ? result[0] : result;
  if (!(out instanceof Blob) || out.size < 32) {
    throw new Error("Could not convert that HEIC photo.");
  }
  return out;
}

/**
 * Last resort only. Canvas/ImageBitmap on Android often returns a gallery
 * display-crop or preview tile instead of the full still.
 */
async function rasterizeToFile(blob: Blob, mime: string, originalName: string): Promise<File | null> {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = "sync";
    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("decode failed"));
        img.src = url;
      });
      try {
        await img.decode?.();
      } catch {
        // decode() is best-effort; onload already fired.
      }
    } finally {
      URL.revokeObjectURL(url);
    }

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (width < 32 || height < 32 || width * height < MIN_DECODE_PIXELS) return null;

    let outW = width;
    let outH = height;
    const edge = Math.max(outW, outH);
    if (edge > MAX_EDGE) {
      const scale = MAX_EDGE / edge;
      outW = Math.max(1, Math.round(outW * scale));
      outH = Math.max(1, Math.round(outH * scale));
    }
    canvas.width = outW;
    canvas.height = outH;
    ctx.drawImage(img, 0, 0, outW, outH);

    const preferPng = mime.includes("png");
    const outType = preferPng ? "image/png" : "image/jpeg";
    const out = await canvasToBlob(canvas, outType, 0.92);
    return fileFromBlob(out, originalName, preferPng ? "png" : "jpg", outType);
  } catch {
    return null;
  }
}

/**
 * Keep Gallery/camera bytes intact. Do not redraw through canvas — Chrome/Android
 * ImageDecoder applies a cropped preview for many camera stills and Motion Photos.
 * Only convert HEIC, and strip a Motion Photo video trailer after JPEG EOI.
 */
export async function prepareChatImageFile(file: File): Promise<File> {
  const materialized = await materializeFile(file);
  const bytes = await readFileBytes(materialized);
  const mime = sniffMediaMime(bytes, materialized.type || file.type || "").toLowerCase();

  if (mime.includes("gif")) {
    return fileFromBlob(new Blob([bytes.slice()], { type: "image/gif" }), file.name, "gif", "image/gif");
  }

  if (mime.includes("png")) {
    return fileFromBlob(new Blob([bytes.slice()], { type: "image/png" }), file.name, "png", "image/png");
  }

  if (mime.includes("webp")) {
    return fileFromBlob(new Blob([bytes.slice()], { type: "image/webp" }), file.name, "webp", "image/webp");
  }

  if (mime.includes("jpeg") || mime.includes("jpg") || (bytes[0] === 0xff && bytes[1] === 0xd8)) {
    const still = extractJpegStill(bytes);
    if (still && still.byteLength >= 32) {
      return jpegFileFromBytes(still, file.name);
    }
    return jpegFileFromBytes(bytes, file.name);
  }

  if (mime.includes("heic") || mime.includes("heif")) {
    try {
      const converted = await blobFromHeic(new Blob([bytes.slice()], { type: file.type || "image/heic" }));
      return fileFromBlob(converted, file.name, "jpg", "image/jpeg");
    } catch {
      throw new Error(
        "This phone sent a HEIC photo this browser can't read. In Gallery, use JPG or take a screenshot."
      );
    }
  }

  const rasterized = await rasterizeToFile(
    new Blob([bytes.slice()], { type: mime || materialized.type || "application/octet-stream" }),
    mime,
    file.name
  );
  if (rasterized) return rasterized;
  return materialized;
}
