import React, { useState, useCallback, useEffect, useRef } from "react";
import { DocumentAttachment, LocationAttachment, Message, Theme } from "../types";
import { SendQueueStatus } from "../hooks/useMessageSendQueue";
import {
  getMessagePreviewText,
  getReplyPreviewKind,
  getReplyThumbUrl,
} from "../../../lib/utils";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
  classifyFile,
  formatFileSize,
} from "../../../lib/attachments";

interface ChatInputProps {
  newMessage: string;
  setNewMessage: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: (e?: React.FormEvent) => void;
  replyingTo: Message | null;
  setReplyingTo: React.Dispatch<React.SetStateAction<Message | null>>;
  activeTheme: Theme;
  isMessageExpanded?: boolean;
  messageInputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectedImages: string[];
  setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>;
  selectedVideos: string[];
  setSelectedVideos: React.Dispatch<React.SetStateAction<string[]>>;
  selectedAudios: string[];
  setSelectedAudios: React.Dispatch<React.SetStateAction<string[]>>;
  selectedDocuments: DocumentAttachment[];
  setSelectedDocuments: React.Dispatch<React.SetStateAction<DocumentAttachment[]>>;
  pendingLocation: LocationAttachment | null;
  setPendingLocation: React.Dispatch<React.SetStateAction<LocationAttachment | null>>;
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  sendQueueStatus: SendQueueStatus;
  sendError?: string | null;
  lastFailedText?: string;
  onDismissSendError?: () => void;
  onTypingActivity?: (hasContent: boolean) => void;
  onStopTyping?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  newMessage,
  setNewMessage,
  handleSendMessage,
  replyingTo,
  setReplyingTo,
  activeTheme,
  isMessageExpanded = false,
  messageInputRef,
  fileInputRef,
  selectedImages,
  setSelectedImages,
  selectedVideos,
  setSelectedVideos,
  selectedAudios,
  setSelectedAudios,
  selectedDocuments,
  setSelectedDocuments,
  pendingLocation,
  setPendingLocation,
  selectedFiles,
  setSelectedFiles,
  sendQueueStatus,
  sendError = null,
  lastFailedText = "",
  onDismissSendError,
  onTypingActivity,
  onStopTyping,
}) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "acquiring" | "ready" | "error">("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recordStreamRef = React.useRef<MediaStream | null>(null);
  const recordingChunksRef = React.useRef<BlobPart[]>([]);
  const keepRecordedClipRef = React.useRef(true);
  const docInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const copyableText = newMessage.trim() || lastFailedText.trim();
  useEffect(() => {
    if (!isRecording || !recordingStartedAt) {
      setRecordingElapsedSec(0);
      return;
    }
    const tick = () => {
      const seconds = Math.floor((Date.now() - recordingStartedAt) / 1000);
      setRecordingElapsedSec(seconds);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [isRecording, recordingStartedAt]);

  const copyDraft = useCallback(async () => {
    const text = newMessage || lastFailedText;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback("Copied!");
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopyFeedback("Copied!");
      } catch {
        setCopyFeedback("Copy failed");
      }
    }
    setTimeout(() => setCopyFeedback(null), 2000);
  }, [newMessage, lastFailedText]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setAttachMenuOpen(false);
    setAttachError(null);

    const incoming = Array.from(files);
    const remainingSlots =
      MAX_ATTACHMENTS_PER_MESSAGE -
      (selectedImages.length + selectedVideos.length + selectedAudios.length + selectedDocuments.length);
    if (remainingSlots <= 0) {
      setAttachError(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`);
      e.target.value = "";
      return;
    }

    const accepted: File[] = [];
    const errors: string[] = [];

    for (const file of incoming.slice(0, remainingSlots)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        errors.push(`${file.name} is over 50 MB`);
        continue;
      }
      const kind = classifyFile(file);
      if (!kind) {
        errors.push(`${file.name} is not allowed`);
        continue;
      }
      accepted.push(file);
    }

    if (errors.length) setAttachError(errors[0]);
    if (!accepted.length) {
      e.target.value = "";
      return;
    }

    setSelectedFiles((prev) => [...prev, ...accepted]);

    accepted.forEach((file) => {
      const kind = classifyFile(file)!;
      if (kind === "video") {
        setSelectedVideos((prev) => [...prev, URL.createObjectURL(file)]);
      } else if (kind === "audio") {
        setSelectedAudios((prev) => [...prev, URL.createObjectURL(file)]);
      } else if (kind === "document") {
        setSelectedDocuments((prev) => [
          ...prev,
          {
            url: "",
            name: file.name,
            mimeType: file.type,
            size: file.size,
          },
        ]);
      } else {
        setSelectedImages((prev) => [...prev, URL.createObjectURL(file)]);
      }
    });

    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    const urlToRemove = selectedImages[idx];
    setSelectedImages(selectedImages.filter((_, i) => i !== idx));

    let imageCount = 0;
    setSelectedFiles(
      selectedFiles.filter((file) => {
        if (classifyFile(file) === "image") {
          if (imageCount === idx) {
            imageCount++;
            return false;
          }
          imageCount++;
        }
        return true;
      })
    );

    URL.revokeObjectURL(urlToRemove);
  };

  const removeVideo = (idx: number) => {
    const urlToRemove = selectedVideos[idx];
    setSelectedVideos(selectedVideos.filter((_, i) => i !== idx));

    let videoCount = 0;
    setSelectedFiles(
      selectedFiles.filter((file) => {
        if (classifyFile(file) === "video") {
          if (videoCount === idx) {
            videoCount++;
            return false;
          }
          videoCount++;
        }
        return true;
      })
    );

    URL.revokeObjectURL(urlToRemove);
  };

  const removeAudio = (idx: number) => {
    const urlToRemove = selectedAudios[idx];
    setSelectedAudios(selectedAudios.filter((_, i) => i !== idx));

    let audioCount = 0;
    setSelectedFiles(
      selectedFiles.filter((file) => {
        if (classifyFile(file) === "audio") {
          if (audioCount === idx) {
            audioCount++;
            return false;
          }
          audioCount++;
        }
        return true;
      })
    );

    URL.revokeObjectURL(urlToRemove);
  };

  const removeDocument = (idx: number) => {
    setSelectedDocuments(selectedDocuments.filter((_, i) => i !== idx));
    let docCount = 0;
    setSelectedFiles(
      selectedFiles.filter((file) => {
        if (classifyFile(file) === "document") {
          if (docCount === idx) {
            docCount++;
            return false;
          }
          docCount++;
        }
        return true;
      })
    );
  };

  const shareLocation = useCallback(() => {
    setAttachMenuOpen(false);
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Location is not supported on this device.");
      return;
    }
    setLocationStatus("acquiring");
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPendingLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocationStatus("ready");
      },
      (err) => {
        setLocationStatus("error");
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("Location permission denied. Enable it in browser settings.");
        } else if (err.code === err.TIMEOUT) {
          setLocationError("Timed out getting location. Try again.");
        } else {
          setLocationError("Couldn't get your location. Try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [setPendingLocation]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    keepRecordedClipRef.current = false;
    stopRecording();
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const stream = recordStreamRef.current;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        recordStreamRef.current = null;
        setIsRecording(false);
        setRecordingStartedAt(null);

        if (!keepRecordedClipRef.current) {
          keepRecordedClipRef.current = true;
          recordingChunksRef.current = [];
          return;
        }

        const audioBlob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (audioBlob.size < 1200) return;
        const extension = (recorder.mimeType || "audio/webm").includes("ogg") ? "ogg" : "webm";
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.${extension}`, {
          type: recorder.mimeType || "audio/webm",
        });
        const previewUrl = URL.createObjectURL(audioBlob);
        setSelectedFiles((prev) => [...prev, audioFile]);
        setSelectedAudios((prev) => [...prev, previewUrl]);
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      recordStreamRef.current = stream;
      keepRecordedClipRef.current = true;
      setIsRecording(true);
      setRecordingStartedAt(Date.now());
    } catch (err) {
      console.error("Failed to start voice recording:", err);
    }
  }, [setSelectedAudios, setSelectedFiles]);

  const handleMicClick = useCallback(() => {
    if (isRecording) return;
    void startRecording();
  }, [isRecording, startRecording]);

  const canSend =
    newMessage.trim().length > 0 ||
    selectedImages.length > 0 ||
    selectedVideos.length > 0 ||
    selectedAudios.length > 0 ||
    selectedDocuments.length > 0 ||
    Boolean(pendingLocation);

  const replyKind = getReplyPreviewKind(replyingTo);
  const replyThumb = getReplyThumbUrl(replyingTo);
  const replyPreview = getMessagePreviewText(replyingTo) || "Media";

  const queueLabel = sendQueueStatus.isActive
    ? sendQueueStatus.waitingCount > 0
      ? `Sending · ${sendQueueStatus.waitingCount} more queued`
      : sendQueueStatus.isMediaUploading
        ? "Uploading media…"
        : "Sending message…"
    : null;

  return (
    <div
      className={`shrink-0 bg-zinc-900/70 backdrop-blur-3xl border-t border-zinc-800/50 z-20 ${
        isMessageExpanded
          ? "p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          : "p-4 sm:p-5"
      }`}
    >
      {sendError && (
        <div className="mb-3 p-3 rounded-2xl border border-red-500/30 bg-red-500/10 flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-300">
          <p className="text-xs text-red-200/90 leading-relaxed flex-1">{sendError}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            {lastFailedText.trim() && (
              <button
                type="button"
                onClick={copyDraft}
                className="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-[10px] font-bold uppercase tracking-wider text-red-200 hover:bg-red-500/30 transition-colors"
              >
                {copyFeedback || "Copy"}
              </button>
            )}
            <button
              type="button"
              onClick={onDismissSendError}
              className="p-1.5 rounded-lg text-red-300/70 hover:text-red-200 transition-colors"
              aria-label="Dismiss error"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {attachError && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
          {attachError}
        </div>
      )}

      {locationStatus === "acquiring" && (
        <div className="mb-3 px-3 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 flex items-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
          Getting your location…
        </div>
      )}

      {locationError && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-200 flex items-center justify-between gap-2">
          <span>{locationError}</span>
          <button type="button" onClick={() => { setLocationError(null); setLocationStatus("idle"); }} className="text-red-300/70 hover:text-red-200">Dismiss</button>
        </div>
      )}

      {pendingLocation && (
        <div className="mb-3 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-200">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white">Current location ready</p>
            <p className="text-[10px] text-zinc-500 truncate">
              {pendingLocation.latitude.toFixed(5)}, {pendingLocation.longitude.toFixed(5)}
              {pendingLocation.accuracy ? ` · ±${Math.round(pendingLocation.accuracy)}m` : ""}
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Tap send to share. Precise coordinates will be sent.</p>
          </div>
          <button
            type="button"
            onClick={() => { setPendingLocation(null); setLocationStatus("idle"); }}
            className="p-2 rounded-full text-zinc-500 hover:text-white hover:bg-white/5"
            aria-label="Remove location"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {replyingTo && (
        <div className="mb-3 flex items-stretch overflow-hidden rounded-2xl bg-zinc-950/90 border border-zinc-800/80 animate-in slide-in-from-bottom-2 duration-200">
          <div className={`w-1 shrink-0 ${activeTheme.bubbleMe}`} />
          <div className="flex-1 min-w-0 px-3 py-2.5 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className={`text-[11px] font-semibold truncate ${activeTheme.accent || "text-indigo-400"}`}>
                {replyingTo.createdBy}
              </p>
              <p className="text-[12px] text-zinc-300/90 line-clamp-1 font-normal leading-snug mt-0.5">
                {replyKind === "image" && "📷 "}
                {replyKind === "video" && "🎬 "}
                {replyKind === "audio" && "🎵 "}
                {replyKind === "document" && "📄 "}
                {replyKind === "location" && "📍 "}
                {replyKind === "call" && "📞 "}
                {replyPreview}
              </p>
            </div>
            {replyThumb && (
              <div className="w-11 h-11 rounded-lg overflow-hidden bg-zinc-900 shrink-0 relative">
                {replyKind === "video" ? (
                  <video src={replyThumb} className="w-full h-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={replyThumb} alt="" className="w-full h-full object-cover" />
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="px-3 text-zinc-500 hover:text-white transition-colors self-stretch"
            aria-label="Cancel reply"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}

      {(selectedImages.length > 0 || selectedVideos.length > 0 || selectedAudios.length > 0 || selectedDocuments.length > 0) && (
        <div className="mb-4 flex gap-3 overflow-x-auto no-scrollbar pb-2 animate-in slide-in-from-bottom-2 duration-300">
          {selectedImages.map((url, idx) => (
            <div key={`img-${idx}`} className="relative group shrink-0">
              <img
                src={url}
                className="w-24 h-24 object-cover rounded-[1.5rem] border-2 border-zinc-800 group-hover:border-white transition-all"
                alt=""
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute -top-2 -right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))}
          {selectedVideos.map((url, idx) => (
            <div key={`vid-${idx}`} className="relative group shrink-0">
              <video
                src={url}
                className="w-24 h-24 object-cover rounded-[1.5rem] border-2 border-zinc-800 group-hover:border-white transition-all"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/40 rounded-full p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeVideo(idx)}
                className="absolute -top-2 -right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))}
          {selectedAudios.map((url, idx) => (
            <div key={`aud-${idx}`} className="relative group shrink-0 w-52 h-24 rounded-[1.5rem] border-2 border-zinc-800 bg-zinc-950 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="M8 9v6"/><path d="M16 9v6"/></svg>
              </div>
              <audio src={url} controls className="w-full max-w-[128px] h-8" />
              <button
                type="button"
                onClick={() => removeAudio(idx)}
                className="absolute -top-2 -right-2 p-2 bg-red-600 text-white rounded-full opacity-100 transition-all hover:scale-110 active:scale-90"
                title="Remove recording"
                aria-label="Remove recording"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))}
          {selectedDocuments.map((doc, idx) => (
            <div key={`doc-${idx}`} className="relative group shrink-0 w-52 h-24 rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white font-medium truncate">{doc.name}</p>
                <p className="text-[10px] text-zinc-500">{formatFileSize(doc.size || 0) || "Document"}</p>
              </div>
              <button
                type="button"
                onClick={() => removeDocument(idx)}
                className="absolute -top-2 -right-2 p-2 bg-red-600 text-white rounded-full"
                aria-label="Remove document"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-end gap-3 max-w-2xl mx-auto"
      >
        <div className="flex-1 flex flex-col gap-2">
          {queueLabel && (
            <div className="w-full flex flex-col gap-1 mb-1">
              <div className="flex justify-between items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-zinc-500 px-1">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {queueLabel}
                </span>
                {sendQueueStatus.isMediaUploading && (
                  <span>{sendQueueStatus.uploadProgress}%</span>
                )}
              </div>
              {sendQueueStatus.isMediaUploading && (
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${activeTheme.bubbleMe} transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.2)]`}
                    style={{ width: `${sendQueueStatus.uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}
          <div className="relative group/input flex items-center bg-zinc-950/90 border border-zinc-700/50 rounded-2xl sm:rounded-[1.5rem] focus-within:border-zinc-500/60 focus-within:ring-1 focus-within:ring-white/10 transition-all shadow-inner overflow-hidden px-1.5">
            <div className="flex items-center gap-1 pr-1.5 relative">
              <button
                type="button"
                onClick={() => setAttachMenuOpen((v) => !v)}
                className="h-10 w-10 flex items-center justify-center rounded-full text-zinc-600 hover:text-white hover:bg-white/5 transition-all active:scale-90 shrink-0"
                title="Attach"
                aria-label="Attach"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.59a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              {attachMenuOpen && (
                <div className="absolute bottom-12 left-0 z-30 w-48 rounded-2xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-none">
                  <button type="button" onClick={() => { setAttachMenuOpen(false); mediaInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-zinc-200 hover:bg-white/5">
                    <span className="w-8 h-8 rounded-full bg-pink-500/15 text-pink-400 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    </span>
                    Photo &amp; Video
                  </button>
                  <button type="button" onClick={() => { setAttachMenuOpen(false); audioInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-zinc-200 hover:bg-white/5">
                    <span className="w-8 h-8 rounded-full bg-violet-500/15 text-violet-400 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    </span>
                    Audio file
                  </button>
                  <button type="button" onClick={() => { setAttachMenuOpen(false); docInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-zinc-200 hover:bg-white/5">
                    <span className="w-8 h-8 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </span>
                    Document
                  </button>
                  <button type="button" onClick={shareLocation} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-zinc-200 hover:bg-white/5">
                    <span className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    </span>
                    Location
                  </button>
                </div>
              )}
              {isRecording && (
                <div className="h-10 w-10 flex items-center justify-center rounded-full text-red-300 bg-red-500/12 ring-1 ring-red-400/40 animate-pulse shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 15a3.5 3.5 0 0 0 3.5-3.5V6.5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15Z" />
                    <path d="M18 11.5a1 1 0 1 0-2 0 4 4 0 0 1-8 0 1 1 0 1 0-2 0 6 6 0 0 0 5 5.91V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.59a6 6 0 0 0 5-5.91Z" />
                  </svg>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv,.zip,.rar,.7z,.json,.xml,.md" />
            <input type="file" ref={mediaInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*,video/*" />
            <input type="file" ref={audioInputRef} onChange={handleFileChange} className="hidden" multiple accept="audio/*" />
            <input type="file" ref={docInputRef} onChange={handleFileChange} className="hidden" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv,.odt,.ods,.odp,.zip,.rar,.7z,.tar,.gz,.json,.xml,.md,.epub" />
            <textarea
              ref={messageInputRef}
              value={newMessage}
              onChange={(e) => {
                const value = e.target.value;
                setNewMessage(value);
                onTypingActivity?.(value.trim().length > 0);
              }}
              onBlur={() => onStopTyping?.()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  onStopTyping?.();
                  handleSendMessage();
                }
              }}
              className="w-full bg-transparent text-white text-sm font-normal py-3.5 px-1 outline-none no-scrollbar resize-none max-h-40 placeholder:text-zinc-800"
              placeholder={
                isRecording
                  ? ""
                  : sendQueueStatus.isActive
                  ? "Type another message…"
                  : "Say, Hello!"
              }
              rows={1}
              autoFocus
              spellCheck={false}
            />
            {isRecording && (
              <div className="flex items-center gap-2 pr-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/12 border border-red-400/35 text-[10px] font-bold tracking-wide text-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span>
                    {Math.floor(recordingElapsedSec / 60)
                      .toString()
                      .padStart(2, "0")}
                    :
                    {(recordingElapsedSec % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="h-8 w-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-500 active:scale-95"
                  title="Stop recording"
                  aria-label="Stop recording"
                >
                  <span className="h-2.5 w-2.5 rounded-sm bg-white" />
                </button>
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="px-2 py-1 rounded-md bg-zinc-900/70 text-zinc-200 text-[10px] font-bold uppercase tracking-wide"
                  title="Discard recording"
                >
                  Discard
                </button>
              </div>
            )}
            {!isRecording && (
              <button
                type="button"
                onClick={handleMicClick}
                className="h-10 w-10 flex items-center justify-center rounded-full text-zinc-600 hover:text-white hover:bg-white/5 transition-all active:scale-90 shrink-0 mr-0.5"
                title="Start voice recording"
                aria-label="Start voice recording"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 15a3.5 3.5 0 0 0 3.5-3.5V6.5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15Z" />
                  <path d="M18 11.5a1 1 0 1 0-2 0 4 4 0 0 1-8 0 1 1 0 1 0-2 0 6 6 0 0 0 5 5.91V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.59a6 6 0 0 0 5-5.91Z" />
                </svg>
              </button>
            )}
            {copyableText && !isRecording && (
              <button
                type="button"
                onClick={copyDraft}
                className="p-3 text-zinc-600 hover:text-white transition-all active:scale-90 shrink-0"
                title="Copy message"
                aria-label="Copy message"
              >
                {copyFeedback ? (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                    OK
                  </span>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className={`relative h-12 w-12 flex items-center justify-center rounded-full shrink-0 transition-all duration-300 ease-out ${
            canSend
              ? `${activeTheme.bubbleMe} text-white shadow-lg ${activeTheme.shadow} hover:brightness-110 active:scale-90`
              : "bg-zinc-800/35 text-zinc-600 opacity-45 cursor-not-allowed"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`w-5 h-5 transition-transform duration-300 ${canSend ? "translate-x-px" : ""}`}
            aria-hidden
          >
            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
          </svg>
        </button>
      </form>
    </div>
  );
};
