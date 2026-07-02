"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import * as actions from "../../../lib/actions";
import { withTimeout } from "../../../lib/with-timeout";
import { Message, UserType } from "../types";

export interface EnqueueMessagePayload {
  text: string;
  files: File[];
  imagePreviewUrls: string[];
  videoPreviewUrls: string[];
  audioPreviewUrls: string[];
  replyingTo: Message | null;
}

interface QueuedSendJob extends EnqueueMessagePayload {
  id: string;
  createdAt: string;
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
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  fetchMessagesOnly: (silent?: boolean) => Promise<void>;
  uploadToCloudinary: (file: File, onProgress: (percent: number) => void) => Promise<string>;
}

function createJobId(seq: number) {
  return `${Date.now()}-${seq}`;
}

function buildOptimisticMessage(
  job: QueuedSendJob,
  currentUser: string
): Message {
  const imageUrls = job.imagePreviewUrls.length > 0 ? job.imagePreviewUrls : undefined;
  const videoUrls = job.videoPreviewUrls.length > 0 ? job.videoPreviewUrls : undefined;
  const audioUrls = job.audioPreviewUrls.length > 0 ? job.audioPreviewUrls : undefined;

  return {
    _id: job.id,
    text: job.text || undefined,
    imageUrls,
    videoUrls,
    audioUrls,
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
  setMessages,
  fetchMessagesOnly,
  uploadToCloudinary,
}: UseMessageSendQueueOptions) {
  const queueRef = useRef<QueuedSendJob[]>([]);
  const processingRef = useRef(false);
  const seqRef = useRef(0);
  const mountedRef = useRef(true);

  const [sendQueueStatus, setSendQueueStatus] = useState<SendQueueStatus>(IDLE_STATUS);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedText, setLastFailedText] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateQueueStatus = useCallback((job: QueuedSendJob | null, waitingCount: number) => {
    if (!job) {
      setSendQueueStatus(IDLE_STATUS);
      return;
    }

    setSendQueueStatus({
      isActive: true,
      waitingCount,
      activeText: job.text,
      isMediaUploading: job.files.length > 0,
      uploadProgress: 0,
    });
  }, []);

  const processJob = useCallback(
    async (job: QueuedSendJob) => {
      const uploadedImageUrls: string[] = [];
      const uploadedVideoUrls: string[] = [];
      const uploadedAudioUrls: string[] = [];

      try {
        if (job.files.length > 0) {
          for (let i = 0; i < job.files.length; i++) {
            const file = job.files[i];
            const url = await withTimeout(
              uploadToCloudinary(file, (percent) => {
                if (!mountedRef.current) return;
                setSendQueueStatus((prev) => ({
                  ...prev,
                  isMediaUploading: true,
                  uploadProgress:
                    job.files.length === 1
                      ? Math.min(Math.round(percent), 99)
                      : Math.min(
                          Math.round(((i + percent / 100) / job.files.length) * 100),
                          99
                        ),
                }));
              }),
              300000,
              "Media upload timed out. Your files were not sent."
            );

            if (file.type.startsWith("video/")) uploadedVideoUrls.push(url);
            else if (file.type.startsWith("audio/")) uploadedAudioUrls.push(url);
            else uploadedImageUrls.push(url);
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
            uploadedAudioUrls
          ),
          35000,
          "Sending timed out after 35 seconds. Your message may not have been delivered."
        );

        if (!mountedRef.current) return;

        if (serverMsg) {
          setMessages((prev) => prev.map((m) => (m._id === job.id ? serverMsg : m)));
        } else {
          await fetchMessagesOnly(true);
        }

        revokePreviewUrls(job);
      } catch (error) {
        if (!mountedRef.current) return;

        console.error("Failed to send queued message:", error);
        setMessages((prev) => prev.filter((m) => m._id !== job.id));
        revokePreviewUrls(job);

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

  const drainQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      while (queueRef.current.length > 0) {
        const job = queueRef.current[0];
        const waitingCount = queueRef.current.length - 1;
        updateQueueStatus(job, waitingCount);
        await processJob(job);
        queueRef.current.shift();
      }
    } finally {
      processingRef.current = false;
      if (mountedRef.current) {
        setSendQueueStatus(IDLE_STATUS);
      }
    }
  }, [processJob, updateQueueStatus]);

  const enqueueMessage = useCallback(
    (payload: EnqueueMessagePayload) => {
      if (!payload.text.trim() && payload.files.length === 0) return;

      const job: QueuedSendJob = {
        id: createJobId(seqRef.current++),
        text: payload.text,
        files: [...payload.files],
        imagePreviewUrls: [...payload.imagePreviewUrls],
        videoPreviewUrls: [...payload.videoPreviewUrls],
        audioPreviewUrls: [...payload.audioPreviewUrls],
        replyingTo: payload.replyingTo,
        createdAt: new Date().toISOString(),
      };

      setSendError(null);
      setLastFailedText("");
      setMessages((prev) => [...prev, buildOptimisticMessage(job, currentUser)]);

      queueRef.current.push(job);
      void drainQueue();
    },
    [currentUser, drainQueue, setMessages]
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
