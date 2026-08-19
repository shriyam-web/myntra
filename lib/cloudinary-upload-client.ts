import { classifyFile, cloudinaryResourceForKind } from "./attachments";
import { materializeFile } from "./media-file";
import { prepareChatImageFile } from "./rasterize-image";
import { buildProtectedMediaUrl } from "./media-url";

export type CloudinaryUploadResult = {
  url: string;
  publicId?: string;
  resourceType?: string;
  bytes?: number;
  originalFilename?: string;
};

export type CloudinarySignature = {
  timestamp: number;
  signature: string;
  apiKey?: string | null;
  cloudName?: string | null;
  folder: string;
  type?: string;
};

type CloudinaryUploadJson = {
  public_id?: string;
  resource_type?: string;
  type?: string;
  bytes?: number;
  original_filename?: string;
  secure_url?: string;
  error?: { message?: string };
};

const MIN_CHUNK_BYTES = 8 * 1024 * 1024;
const CHUNK_BYTES = 12 * 1024 * 1024;
const MAX_CHUNK_RETRIES = 2;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkTimeoutMs(chunkBytes: number) {
  return Math.min(8 * 60_000, Math.max(90_000, Math.ceil(chunkBytes / (32 * 1024)) * 1000));
}

function buildFormData(
  filePart: Blob,
  fileName: string,
  signature: CloudinarySignature,
  useAuthenticated: boolean
) {
  const formData = new FormData();
  formData.append("file", filePart, fileName);
  formData.append("api_key", signature.apiKey!);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);
  if (useAuthenticated) formData.append("type", "authenticated");
  return formData;
}

function createProgress(report: (percent: number) => void) {
  let max = 0;
  return (percent: number) => {
    const next = Math.max(max, Math.min(99, Math.round(percent)));
    if (next === max) return;
    max = next;
    report(max);
  };
}

function xhrPost(opts: {
  url: string;
  formData: FormData;
  headers?: Record<string, string>;
  timeoutMs: number;
  expectedBytes: number;
  onBytes?: (sentBytes: number) => void;
}): Promise<CloudinaryUploadJson> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", opts.url, true);
    xhr.timeout = opts.timeoutMs;
    if (opts.headers) {
      for (const [key, value] of Object.entries(opts.headers)) {
        xhr.setRequestHeader(key, value);
      }
    }

    const mapLoadedToFileBytes = (loaded: number, total: number) => {
      if (total > 0) {
        return Math.min(opts.expectedBytes, (loaded / total) * opts.expectedBytes);
      }
      return Math.min(opts.expectedBytes, loaded);
    };

    xhr.upload.onprogress = (event) => {
      const total = event.lengthComputable ? event.total : 0;
      opts.onBytes?.(mapLoadedToFileBytes(event.loaded, total));
    };

    xhr.onload = () => {
      opts.onBytes?.(opts.expectedBytes);
      let json: CloudinaryUploadJson = {};
      try {
        json = JSON.parse(xhr.responseText || "{}") as CloudinaryUploadJson;
      } catch {
        reject(new Error("Upload returned an invalid response."));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && !json.error) {
        resolve(json);
        return;
      }
      reject(
        new Error(json.error?.message || `Upload failed (${xhr.status || "network"}).`)
      );
    };
    xhr.onerror = () => reject(new Error("Network error during upload. Try again."));
    xhr.ontimeout = () =>
      reject(new Error("Upload timed out. Try a smaller file or a stronger connection."));
    xhr.onabort = () => reject(new Error("Upload was interrupted."));
    xhr.send(opts.formData);
  });
}

async function withRetries<T>(work: () => Promise<T>, retries: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await work();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await sleep(700 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Upload failed.");
}

async function uploadSingle(
  file: File,
  url: string,
  signature: CloudinarySignature,
  useAuthenticated: boolean,
  onBytes: (sent: number) => void
) {
  return withRetries(
    () =>
      xhrPost({
        url,
        formData: buildFormData(file, file.name, signature, useAuthenticated),
        timeoutMs: chunkTimeoutMs(file.size),
        expectedBytes: file.size,
        onBytes,
      }),
    MAX_CHUNK_RETRIES
  );
}

async function uploadChunked(
  file: File,
  url: string,
  signature: CloudinarySignature,
  useAuthenticated: boolean,
  uniqueUploadId: string,
  onBytes: (sent: number) => void
) {
  let lastResponse: CloudinaryUploadJson = {};
  for (let start = 0; start < file.size; start += CHUNK_BYTES) {
    const end = Math.min(start + CHUNK_BYTES, file.size);
    const chunkLen = end - start;
    const chunk = file.slice(start, end);
    lastResponse = await withRetries(
      () =>
        xhrPost({
          url,
          formData: buildFormData(chunk, file.name, signature, useAuthenticated),
          headers: {
            "X-Unique-Upload-Id": uniqueUploadId,
            "Content-Range": `bytes ${start}-${end - 1}/${file.size}`,
          },
          timeoutMs: chunkTimeoutMs(chunkLen),
          expectedBytes: chunkLen,
          onBytes: (sentInChunk) => onBytes(start + sentInChunk),
        }),
      MAX_CHUNK_RETRIES
    );
    onBytes(end);
  }
  return lastResponse;
}

export async function uploadFileToCloudinary(
  file: File,
  opts: {
    getSignature: (args: { authenticated: boolean }) => Promise<CloudinarySignature>;
    waitUntilReady?: (args: {
      publicId: string;
      resourceType: string;
      deliveryType: string;
    }) => Promise<{ bytes: number }>;
    onProgress: (percent: number) => void;
  }
): Promise<CloudinaryUploadResult> {
  const kind = classifyFile(file);
  if (!kind) throw new Error(`Unsupported file: ${file.name}`);
  const endpointResource = cloudinaryResourceForKind(kind);
  const useAuthenticated = kind !== "document";
  const report = createProgress(opts.onProgress);

  report(1);

  const readyFile =
    kind === "image"
      ? await prepareChatImageFile(file)
      : kind === "video" || file.size > MIN_CHUNK_BYTES
        ? file
        : await materializeFile(file);

  report(2);

  let signature: CloudinarySignature | null = null;
  let signatureError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      signature = await opts.getSignature({ authenticated: useAuthenticated });
      break;
    } catch (error) {
      signatureError = error;
      await sleep(400 * (attempt + 1));
    }
  }
  if (!signature?.apiKey || !signature.cloudName) {
    throw new Error(
      signatureError instanceof Error
        ? signatureError.message
        : "Could not start upload. Check your connection and try again."
    );
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${signature.cloudName}/${endpointResource}/upload`;
  const uniqueUploadId = `${Date.now()}${Math.floor(Math.random() * 1e9)}`;
  const totalBytes = Math.max(readyFile.size, 1);
  const onBytes = (sent: number) => {
    report(Math.min(99, (sent / totalBytes) * 100));
  };

  const response =
    readyFile.size > MIN_CHUNK_BYTES
      ? await uploadChunked(
          readyFile,
          uploadUrl,
          signature,
          useAuthenticated,
          uniqueUploadId,
          onBytes
        )
      : await uploadSingle(readyFile, uploadUrl, signature, useAuthenticated, onBytes);

  const publicId = response.public_id;
  const resourceType = (response.resource_type || endpointResource) as "image" | "video" | "raw";
  const deliveryType = (response.type ||
    signature.type ||
    (useAuthenticated ? "authenticated" : "upload")) as "upload" | "authenticated";
  const bytes = Number(response.bytes) || 0;

  if (!publicId) throw new Error("Upload finished but Cloudinary did not store the file.");
  if (bytes <= 0) throw new Error("Upload finished but the stored file was empty.");

  if (opts.waitUntilReady && (kind === "video" || kind === "audio")) {
    void opts.waitUntilReady({ publicId, resourceType, deliveryType }).catch((error) => {
      console.warn("Cloudinary ready-check timed out; original upload already stored.", error);
    });
  }

  const url =
    useAuthenticated && publicId
      ? buildProtectedMediaUrl({ publicId, resourceType, deliveryType })
      : String(response.secure_url || "");
  if (!url) throw new Error("Upload finished but no media URL was returned.");

  opts.onProgress(100);
  return {
    url,
    publicId,
    resourceType,
    bytes,
    originalFilename: response.original_filename,
  };
}
