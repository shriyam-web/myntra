import React, { useState, useCallback } from "react";
import { Message, Theme } from "../types";
import { SendQueueStatus } from "../hooks/useMessageSendQueue";

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
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  sendQueueStatus: SendQueueStatus;
  sendError?: string | null;
  lastFailedText?: string;
  onDismissSendError?: () => void;
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
  selectedFiles,
  setSelectedFiles,
  sendQueueStatus,
  sendError = null,
  lastFailedText = "",
  onDismissSendError,
}) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordLocked, setIsRecordLocked] = useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recordStreamRef = React.useRef<MediaStream | null>(null);
  const recordingChunksRef = React.useRef<BlobPart[]>([]);
  const recordingStartYRef = React.useRef<number | null>(null);
  const recordingPointerIdRef = React.useRef<number | null>(null);
  const keepRecordedClipRef = React.useRef(true);

  const copyableText = newMessage.trim() || lastFailedText.trim();

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

    const newFiles = Array.from(files);
    setSelectedFiles([...selectedFiles, ...newFiles]);

    newFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      if (file.type.startsWith("video/")) {
        setSelectedVideos((prev) => [...prev, url]);
      } else if (file.type.startsWith("audio/")) {
        setSelectedAudios((prev) => [...prev, url]);
      } else {
        setSelectedImages((prev) => [...prev, url]);
      }
    });
  };

  const removeImage = (idx: number) => {
    const urlToRemove = selectedImages[idx];
    setSelectedImages(selectedImages.filter((_, i) => i !== idx));

    let imageCount = 0;
    setSelectedFiles(
      selectedFiles.filter((file) => {
        if (!file.type.startsWith("video/") && !file.type.startsWith("audio/")) {
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
        if (file.type.startsWith("video/")) {
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
        if (file.type.startsWith("audio/")) {
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
        setIsRecordLocked(false);

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
      setIsRecordLocked(false);
    } catch (err) {
      console.error("Failed to start voice recording:", err);
    }
  }, [setSelectedAudios, setSelectedFiles]);

  const handleRecordPointerDown = useCallback(
    async (e: React.PointerEvent<HTMLButtonElement>) => {
      if (isRecording) return;
      recordingStartYRef.current = e.clientY;
      recordingPointerIdRef.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      await startRecording();
    },
    [isRecording, startRecording]
  );

  const handleRecordPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!isRecording || isRecordLocked) return;
      if (recordingPointerIdRef.current !== e.pointerId) return;
      const startY = recordingStartYRef.current;
      if (startY === null) return;
      const deltaY = e.clientY - startY;
      if (deltaY < -60) {
        setIsRecordLocked(true);
        if (window.navigator.vibrate) window.navigator.vibrate(12);
      }
    },
    [isRecording, isRecordLocked]
  );

  const handleRecordPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (recordingPointerIdRef.current !== e.pointerId) return;
      recordingPointerIdRef.current = null;
      recordingStartYRef.current = null;
      if (isRecording && !isRecordLocked) {
        stopRecording();
      }
    },
    [isRecording, isRecordLocked, stopRecording]
  );

  const canSend =
    newMessage.trim().length > 0 ||
    selectedImages.length > 0 ||
    selectedVideos.length > 0 ||
    selectedAudios.length > 0;

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

      {replyingTo && (
        <div className="mb-4 p-4 bg-zinc-950/80 rounded-[2rem] border border-zinc-800 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300 backdrop-blur-xl">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className={`w-1.5 h-10 rounded-full ${activeTheme.bubbleMe} shrink-0`}></div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 mb-1">
                Replying to {replyingTo.createdBy}
              </p>
              <p className="text-xs text-white/80 line-clamp-1 font-normal italic">
                {replyingTo.text || "Media Content"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all active:scale-90"
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
      )}

      {(selectedImages.length > 0 || selectedVideos.length > 0 || selectedAudios.length > 0) && (
        <div className="mb-4 flex gap-3 overflow-x-auto no-scrollbar pb-2 animate-in slide-in-from-bottom-2 duration-300">
          {selectedImages.map((url, idx) => (
            <div key={`img-${idx}`} className="relative group shrink-0">
              <img
                src={url}
                className="w-24 h-24 object-cover rounded-[1.5rem] border-2 border-zinc-800 shadow-2xl group-hover:border-white transition-all"
                alt=""
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute -top-2 -right-2 p-2 bg-red-600 text-white rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
          {selectedVideos.map((url, idx) => (
            <div key={`vid-${idx}`} className="relative group shrink-0">
              <video
                src={url}
                className="w-24 h-24 object-cover rounded-[1.5rem] border-2 border-zinc-800 shadow-2xl group-hover:border-white transition-all"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/40 rounded-full p-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="white"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeVideo(idx)}
                className="absolute -top-2 -right-2 p-2 bg-red-600 text-white rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
          {selectedAudios.map((url, idx) => (
            <div key={`aud-${idx}`} className="relative group shrink-0 w-48 h-24 rounded-[1.5rem] border-2 border-zinc-800 shadow-2xl bg-zinc-950 p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="M8 9v6"/><path d="M16 9v6"/></svg>
              </div>
              <audio src={url} controls className="w-full max-w-[120px] h-8" />
              <button
                type="button"
                onClick={() => removeAudio(idx)}
                className="absolute -top-2 -right-2 p-2 bg-red-600 text-white rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 flex items-center justify-center bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-[1.5rem] text-zinc-700 hover:text-zinc-500 hover:border-zinc-700 transition-all shrink-0 active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
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
          <div className="relative group/input flex items-end bg-zinc-950/90 border border-zinc-700/50 rounded-2xl sm:rounded-[1.5rem] focus-within:border-zinc-500/60 focus-within:ring-1 focus-within:ring-white/10 transition-all shadow-inner overflow-hidden">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 text-zinc-600 hover:text-white transition-all active:scale-90 shrink-0"
              title="Attach Media"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
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
            <button
              type="button"
              onPointerDown={handleRecordPointerDown}
              onPointerMove={handleRecordPointerMove}
              onPointerUp={handleRecordPointerUp}
              onPointerCancel={() => {
                recordingPointerIdRef.current = null;
                recordingStartYRef.current = null;
                if (isRecording && !isRecordLocked) stopRecording();
              }}
              className={`p-3 transition-all active:scale-90 shrink-0 ${isRecording ? "text-red-400 animate-pulse" : "text-zinc-600 hover:text-white"} touch-none`}
              title={isRecording ? (isRecordLocked ? "Recording locked" : "Release to send") : "Hold to record voice note"}
              aria-label={isRecording ? "Recording voice note" : "Hold to record voice note"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v11" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept="image/*,video/*,audio/*"
            />
            <textarea
              ref={messageInputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="w-full bg-transparent text-white text-sm font-normal py-4 px-1 outline-none no-scrollbar resize-none max-h-40 placeholder:text-zinc-800"
              placeholder={
                sendQueueStatus.isActive
                  ? "Type another message…"
                  : "Say, Hello!"
              }
              rows={1}
              autoFocus
              spellCheck={false}
            />
            {copyableText && (
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
          {isRecording && (
            <div className="mt-2 flex items-center justify-between rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-red-200">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                {isRecordLocked ? "Recording locked" : "Recording · slide up to lock"}
              </div>
              {isRecordLocked && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="px-2 py-1 rounded-md bg-zinc-900/70 text-zinc-200 text-[10px] font-bold uppercase tracking-wide"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-2 py-1 rounded-md bg-red-600 text-white text-[10px] font-bold uppercase tracking-wide"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          )}
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
