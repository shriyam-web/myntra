"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import * as actions from "../../../lib/actions";
import { withTimeout } from "../../../lib/with-timeout";
import { classifyFile } from "../../../lib/attachments";
import { DocumentAttachment, LocationAttachment, Message, UserType } from "../types";

export interface UploadResult {
  url: string;
  publicId?: string;
  resourceType?: string;
  bytes?: number;
  originalFilename?: string;
}

export interface EnqueueMessagePayload {
  text: string;
  files: File[];
  imagePreviewUrls: string[];
  videoPreviewUrls: string[];
  audioPreviewUrls: string[];
  documentPreviews?: DocumentAttachment[];
  location?: LocationAttachment | null;
  replyingTo: Message | null;
}

interface QueuedSendJob extends EnqueueMessagePayload {
  id: string;
  createdAt: string;
  disappearing: boolean;
}

export interface SendQueueStatus {
  isActive: boolean;
  waitingCount: number;
  activeText: string;
  isMediaUploading: boolean;
  uploadProgress: number;
}

interface UseMessageSendQueueOptions {
  currentUser: string;
  disappearingMode?: boolean;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  fetchMessagesOnly: (silent?: boolean) => Promise<void>;
  uploadToCloudinary: (file: File, onProgress: (percent: number) => void) => Promise<UploadResult>;
}

function createJobId(seq: number) {
  return `${Date.now()}-${seq}`;
}

function buildOptimisticMessage(job: QueuedSendJob, currentUser: string): Message {
  const imageUrls = job.imagePreviewUrls.length > 0 ? job.imagePreviewUrls : undefined;
  const videoUrls = job.videoPreviewUrls.length > 0 ? job.videoPreviewUrls : undefined;
  const audioUrls = job.audioPreviewUrls.length > 0 ? job.audioPreviewUrls : undefined;
  const documents = job.documentPreviews?.length ? job.documentPreviews : undefined;

  return {
    _id: job.id,
    clientMessageId: job.id,
    text: job.text || undefined,
    imageUrls,
    videoUrls,
    audioUrls,
    documents,
    location: job.location || undefined,
    kind: job.location ? "location" : "message",
    disappearing: job.disappearing || undefined,
    imageUrl: imageUrls?.[0],
    videoUrl: videoUrls?.[0],
    audioUrl: audioUrls?.[0],
    createdAt: job.createdAt,
    createdBy: currentUser as UserType,
    repliedTo: job.replyingTo
      ? {
          _id: job.replyingTo._id,
          text: job.replyingTo.text,
          imageUrl: job.replyingTo.imageUrl,
          imageUrls: job.replyingTo.imageUrls,
          videoUrl: job.replyingTo.videoUrl,
          videoUrls: job.replyingTo.videoUrls,
          audioUrl: job.replyingTo.audioUrl,
          audioUrls: job.replyingTo.audioUrls,
          documents: job.replyingTo.documents,
          location: job.replyingTo.location,
          createdBy: job.replyingTo.createdBy,
        }
      : undefined,
  };
}

function revokePreviewUrls(job: QueuedSendJob) {
  [...job.imagePreviewUrls, ...job.videoPreviewUrls, ...job.audioPreviewUrls].forEach((url) => {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  });
}

const IDLE_STATUS: SendQueueStatus = {
  isActive: false,
  waitingCount: 0,
  activeText: "",
  isMediaUploading: false,
  uploadProgress: 0,
};

export function useMessageSendQueue({
  currentUser,
  disappearingMode = false,
  setMessages,
  fetchMessagesOnly,
  uploadToCloudinary,
}: UseMessageSendQueueOptions) {
  const queueRef = useRef<QueuedSendJob[]>([]);
  const processingRef = useRef(false);
  const seqRef = useRef(0);
  const mountedRef = useRef(true);
  const disappearingModeRef = useRef(disappearingMode);

  useEffect(() => {
    disappearingModeRef.current = disappearingMode;
  }, [disappearingMode]);

  const [sendQueueStatus, setSendQueueStatus] = useState<SendQueueStatus>(IDLE_STATUS);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedText, setLastFailedText] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const processJob = useCallback(
    async (job: QueuedSendJob) => {
      const uploadedImageUrls: string[] = [];
      const uploadedVideoUrls: string[] = [];
      const uploadedAudioUrls: string[] = [];
      const uploadedDocuments: DocumentAttachment[] = [];

      try {
        if (job.files.length > 0) {
          for (let i = 0; i < job.files.length; i++) {
            const file = job.files[i];
            const kind = classifyFile(file);
            if (!kind) throw new Error(`Unsupported file type: ${file.name}`);

            const result = await withTimeout(
              uploadToCloudinary(file, (percent) => {
                if (!mountedRef.current) return;
                const next =
                  job.files.length === 1
                    ? Math.min(Math.round(percent), 99)
                    : Math.min(
                        Math.round(((i + percent / 100) / job.files.length) * 100),
                        99
                      );
                setSendQueueStatus((prev) => ({
                  ...prev,
                  isMediaUploading: true,
                  uploadProgress: Math.max(prev.uploadProgress, next),
                }));
              }),
              Math.min(
                40 * 60_000,
                Math.max(3 * 60_000, Math.ceil(file.size / (12 * 1024 * 1024)) * 90_000 + 60_000)
              ),
              "Media upload timed out. Your files were not sent."
            );

            if (!result?.url) {
              throw new Error("Upload finished without a file URL. Please try again.");
            }
            if (result.bytes !== undefined && result.bytes <= 0) {
              throw new Error("Upload stored an empty file. Please try again.");
            }

            if (kind === "video") uploadedVideoUrls.push(result.url);
            else if (kind === "audio") uploadedAudioUrls.push(result.url);
            else if (kind === "document") {
              uploadedDocuments.push({
                url: result.url,
                name: file.name,
                mimeType: file.type || "",
                size: file.size,
                publicId: result.publicId,
                resourceType: result.resourceType || "raw",
              });
            } else uploadedImageUrls.push(result.url);
          }

          if (mountedRef.current) {
            setSendQueueStatus((prev) => ({ ...prev, uploadProgress: 99 }));
          }
        }

        const serverMsg = await withTimeout(
          actions.sendMessage(
            job.text,
            currentUser,
            uploadedImageUrls,
            uploadedVideoUrls,
            job.replyingTo?._id,
            uploadedAudioUrls,
            {
              documents: uploadedDocuments.length ? uploadedDocuments : undefined,
              location: job.location || undefined,
              clientMessageId: job.id,
            }
          ),
          job.files.length > 0 ? 25000 : 18000,
          "Sending timed out. Checking whether it was delivered…"
        );

        if (!mountedRef.current) return;

        if (serverMsg) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === job.id || m.clientMessageId === job.id ? serverMsg : m
            )
          );
        } else {
          await fetchMessagesOnly(true);
        }

        revokePreviewUrls(job);
      } catch (error) {
        if (!mountedRef.current) return;

        console.error("Failed to send queued message:", error);

        // Timeout/network errors can fire after the server already saved the message.
        try {
          await fetchMessagesOnly(true);
        } catch {
          // ignore — we'll still inspect local state
        }

        let stillPending = false;
        setMessages((prev) => {
          stillPending = prev.some((m) => m._id === job.id);
          if (!stillPending) return prev;
          return prev.filter((m) => m._id !== job.id);
        });
        revokePreviewUrls(job);
        if (!stillPending) return;

        const message =
          error instanceof Error ? error.message : "Failed to send message. Please try again.";
        const preview = job.text.trim()
          ? ` "${job.text.length > 80 ? `${job.text.slice(0, 80)}…` : job.text}"`
          : "";
        setSendError(
          `${message}${preview ? ` Message${preview} was not sent.` : ""} Use Copy on your draft if you still need it.`
        );
        setLastFailedText(job.text);
      }
    },
    [currentUser, fetchMessagesOnly, setMessages, uploadToCloudinary]
  );

  const textInflightRef = useRef(0);

  const pumpStatus = useCallback((job?: QueuedSendJob | null) => {
    const mediaJob = processingRef.current ? queueRef.current[0] || null : null;
    const active = job || mediaJob;
    const waiting =
      queueRef.current.length +
      textInflightRef.current -
      (mediaJob ? 1 : 0) -
      (job && job.files.length === 0 ? 1 : 0);

    if (!active && textInflightRef.current === 0 && queueRef.current.length === 0) {
      setSendQueueStatus(IDLE_STATUS);
      return;
    }

    setSendQueueStatus((prev) => ({
      isActive: true,
      waitingCount: Math.max(0, waiting),
      activeText: active?.text || prev.activeText,
      isMediaUploading: Boolean(mediaJob && mediaJob.files.length > 0),
      uploadProgress: mediaJob
        ? Math.max(prev.uploadProgress, mediaJob.files.length > 0 ? 1 : 0)
        : 0,
    }));
  }, []);

  const drainQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      while (queueRef.current.length > 0) {
        const job = queueRef.current[0];
        pumpStatus(job);
        await processJob(job);
        queueRef.current.shift();
      }
    } finally {
      processingRef.current = false;
      if (queueRef.current.length > 0) {
        void drainQueue();
      } else {
        pumpStatus();
      }
    }
  }, [processJob, pumpStatus]);

  const enqueueMessage = useCallback(
    (payload: EnqueueMessagePayload) => {
      const hasDocs = (payload.documentPreviews?.length ?? 0) > 0;
      const hasLocation = Boolean(payload.location);
      if (!payload.text.trim() && payload.files.length === 0 && !hasDocs && !hasLocation) return;

      const job: QueuedSendJob = {
        id: createJobId(seqRef.current++),
        text: payload.text,
        files: [...payload.files],
        imagePreviewUrls: [...payload.imagePreviewUrls],
        videoPreviewUrls: [...payload.videoPreviewUrls],
        audioPreviewUrls: [...payload.audioPreviewUrls],
        documentPreviews: payload.documentPreviews ? [...payload.documentPreviews] : [],
        location: payload.location || null,
        replyingTo: payload.replyingTo,
        createdAt: new Date().toISOString(),
        disappearing: disappearingModeRef.current,
      };

      setSendError(null);
      setLastFailedText("");
      setMessages((prev) => [...prev, buildOptimisticMessage(job, currentUser)]);

      if (job.files.length === 0) {
        textInflightRef.current += 1;
        pumpStatus(job);
        void processJob(job).finally(() => {
          textInflightRef.current = Math.max(0, textInflightRef.current - 1);
          pumpStatus();
        });
        return;
      }

      queueRef.current.push(job);
      void drainQueue();
    },
    [currentUser, drainQueue, processJob, pumpStatus, setMessages]
  );

  const dismissSendError = useCallback(() => setSendError(null), []);

  return {
    enqueueMessage,
    sendQueueStatus,
    sendError,
    lastFailedText,
    dismissSendError,
  };
}
