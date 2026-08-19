"use client";

import {
  extractLargestJpeg,
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

function loadHtmlImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This photo could not be opened. Try another photo from Gallery."));
    };
    img.src = url;
  });
}

type DecodeInfo = { width: number; height: number; pixels: number };

async function decodeInfo(blob: Blob): Promise<DecodeInfo | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" } as ImageBitmapOptions);
      const info = {
        width: bitmap.width,
        height: bitmap.height,
        pixels: bitmap.width * bitmap.height,
      };
      bitmap.close();
      if (info.width >= 32 && info.height >= 32 && info.pixels >= MIN_DECODE_PIXELS) return info;
    } catch {
      // fall through to HTMLImageElement
    }
  }
  try {
    const img = await loadHtmlImage(blob);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    const pixels = width * height;
    if (width >= 32 && height >= 32 && pixels >= MIN_DECODE_PIXELS) {
      return { width, height, pixels };
    }
  } catch {
    return null;
  }
  return null;
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

function fileFromBlob(blob: Blob, originalName: string, ext: string, type: string): File {
  const base = (originalName || "photo").replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.${ext}`, { type, lastModified: Date.now() });
}

function isLikelyThumbnail(extractedLen: number, originalLen: number): boolean {
  if (extractedLen >= originalLen * 0.85) return false;
  if (extractedLen < 160_000 && originalLen > extractedLen * 2) return true;
  return false;
}

async function toDrawableBlob(file: File): Promise<{ blob: Blob; mime: string }> {
  const bytes = await readFileBytes(file);
  const mime = sniffMediaMime(bytes, file.type || "").toLowerCase();
  const original = new Blob([bytes.slice()], { type: mime || file.type || "application/octet-stream" });

  if (mime.includes("gif")) {
    return { blob: new Blob([bytes.slice()], { type: "image/gif" }), mime: "image/gif" };
  }

  const jpegBytes = extractLargestJpeg(bytes);
  const jpegBlob =
    jpegBytes && !isLikelyThumbnail(jpegBytes.length, bytes.byteLength)
      ? new Blob([jpegBytes.slice()], { type: "image/jpeg" })
      : null;

  const originalInfo = await decodeInfo(original);
  const jpegInfo = jpegBlob ? await decodeInfo(jpegBlob) : null;

  if (originalInfo && jpegInfo) {
    // Use extracted still only when it is the same (or larger) photo with a trailer stripped
    // (Motion Photo). Never replace a full decode with an EXIF/gallery thumbnail.
    if (jpegInfo.pixels >= originalInfo.pixels * 0.95 && jpegBytes && jpegBytes.length < bytes.byteLength) {
      return { blob: jpegBlob!, mime: "image/jpeg" };
    }
    return { blob: original, mime: mime || "image/jpeg" };
  }

  if (originalInfo) {
    return { blob: original, mime: mime || file.type || "image/jpeg" };
  }

  if (jpegInfo && jpegBlob) {
    return { blob: jpegBlob, mime: "image/jpeg" };
  }

  if (mime.includes("heic") || mime.includes("heif")) {
    const source = new Blob([bytes.slice()], { type: file.type || "image/heic" });
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" } as ImageBitmapOptions);
        if (bitmap.width >= 32 && bitmap.height >= 32 && bitmap.width * bitmap.height >= 100_000) {
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(bitmap, 0, 0);
            bitmap.close();
            const jpegOut = await canvasToBlob(canvas, "image/jpeg", 0.92);
            return { blob: jpegOut, mime: "image/jpeg" };
          }
        }
        bitmap.close();
      } catch {
        // Chrome on Android often cannot decode HEIC natively.
      }
    }
    try {
      const converted = await blobFromHeic(source);
      return { blob: converted, mime: "image/jpeg" };
    } catch {
      throw new Error("This phone sent a HEIC photo this browser can't read. In Gallery, use JPG or take a screenshot.");
    }
  }

  return { blob: original, mime: mime || file.type || "application/octet-stream" };
}

async function rasterizeToFile(prepared: { blob: Blob; mime: string }, originalName: string): Promise<File | null> {
  try {
    let width = 0;
    let height = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(prepared.blob, { imageOrientation: "from-image" } as ImageBitmapOptions);
        width = bitmap.width;
        height = bitmap.height;
        if (width < 32 || height < 32 || width * height < MIN_DECODE_PIXELS) {
          bitmap.close();
          return null;
        }
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
        ctx.drawImage(bitmap, 0, 0, outW, outH);
        bitmap.close();
      } catch {
        width = 0;
      }
    }

    if (!width) {
      const img = await loadHtmlImage(prepared.blob);
      await img.decode?.().catch(() => undefined);
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;
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
    }

    const preferPng = prepared.mime.includes("png");
    const outType = preferPng ? "image/png" : "image/jpeg";
    const blob = await canvasToBlob(canvas, outType, 0.92);
    return fileFromBlob(blob, originalName, preferPng ? "png" : "jpg", outType);
  } catch {
    return null;
  }
}

/**
 * Decode a Gallery/camera file into a complete JPEG/PNG when possible.
 * Prefers the full original still over EXIF/Motion Photo thumbnails.
 */
export async function prepareChatImageFile(file: File): Promise<File> {
  const materialized = await materializeFile(file);
  try {
    const prepared = await toDrawableBlob(materialized);
    if (prepared.mime.includes("gif")) {
      return fileFromBlob(prepared.blob, file.name, "gif", "image/gif");
    }
    const rasterized = await rasterizeToFile(prepared, file.name);
    if (rasterized) return rasterized;
    if (prepared.blob.size >= 32) {
      const ext = prepared.mime.includes("png")
        ? "png"
        : prepared.mime.includes("webp")
          ? "webp"
          : "jpg";
      return fileFromBlob(prepared.blob, file.name, ext, prepared.mime || materialized.type);
    }
  } catch {
    // Fall through to the original gallery file.
  }
  return materialized;
}
