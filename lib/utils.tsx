import React, { useState, useEffect } from 'react';
import * as actions from './actions';
import { toProtectedMediaUrl } from './media-url';

interface Metadata {
  title: string;
  description: string;
  image: string;
  url: string;
}

const UrlPreview = ({ url }: { url: string }) => {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        const data = await actions.getUrlMetadata(url);
        if (isMounted && data) {
          setMetadata(data);
        }
      } catch (err) {
        console.error('Error fetching metadata:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMetadata();
    return () => { isMounted = false; };
  }, [url]);

  if (loading) return null;
  if (!metadata || (!metadata.title && !metadata.description)) return null;

  return (
    <a
      href={metadata.url || url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-2 bg-black/20 rounded-xl overflow-hidden border border-white/10 flex flex-col sm:flex-row w-full max-w-full sm:max-w-sm hover:bg-black/30 transition-colors"
    >
      {metadata.image && (
        <div className="w-full h-32 sm:w-32 sm:h-auto flex-shrink-0">
          <img 
            src={metadata.image} 
            alt={metadata.title} 
            className="w-full h-full object-cover" 
          />
        </div>
      )}
      <div className="p-3 flex flex-col justify-center min-w-0 flex-1">
        {metadata.title && (
          <h4 className="text-sm font-bold text-white line-clamp-2 break-words mb-1">
            {metadata.title}
          </h4>
        )}
        {metadata.description && (
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed break-words">
            {metadata.description}
          </p>
        )}
      </div>
    </a>
  );
};

export const getVideoPoster = (url: string) => {
  if (!url) return undefined;
  // Login-gated proxy: ask the media route for a signed jpg frame.
  if (url.startsWith("/api/attachments/media")) {
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}poster=1`;
  }
  if (url.includes("cloudinary.com") && url.includes("/video/")) {
    // Legacy public Cloudinary video URL — replace extension with jpg.
    return url.replace(/\.[^/.]+$/, ".jpg");
  }
  return undefined;
};

const formatCallDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

const callStatusLabel = (status: string) => {
  switch (status) {
    case 'completed':
    case 'disconnected':
      return 'Voice Call';
    case 'missed':
    case 'timeout':
      return 'Missed Call';
    case 'rejected':
      return 'Call Declined';
    case 'cancelled':
      return 'Call Cancelled';
    case 'failed':
      return 'Call Failed';
    default:
      return 'Voice Call';
  }
};

export type PreviewableMessage = {
  text?: string | null;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  videoUrls?: string[];
  audioUrl?: string;
  audioUrls?: string[];
  documents?: Array<{ name?: string; url?: string }>;
  location?: { latitude: number; longitude: number };
  pollMeta?: { question?: string };
  kind?: string;
  sharedItemMeta?: {
    itemType?: string;
    itemIds?: string[];
    listTitle?: string;
  };
};

export type ReplyPreviewKind =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "location"
  | "call"
  | "poll"
  | "task"
  | "reminder";

/** Human-readable one-line preview for a message (used in reply banners/quotes). */
export const getMessagePreviewText = (
  textOrMsg?: string | null | PreviewableMessage,
  maybeMsg?: PreviewableMessage
): string => {
  const msg: PreviewableMessage | undefined =
    typeof textOrMsg === "object" && textOrMsg !== null
      ? textOrMsg
      : maybeMsg;
  const text =
    typeof textOrMsg === "string" || textOrMsg == null
      ? textOrMsg
      : textOrMsg.text;

  if (msg?.location) return "Location";
  if (msg?.kind === "poll" || msg?.pollMeta?.question) {
    return `Poll · ${msg.pollMeta?.question || "Vote"}`;
  }
  if (msg?.kind === "task") {
    if (msg.sharedItemMeta?.itemType === "todo-list" || (msg.sharedItemMeta?.itemIds?.length ?? 0) > 1) {
      const count = msg.sharedItemMeta?.itemIds?.length;
      return `Todo list · ${text || msg.sharedItemMeta?.listTitle || "Shared list"}${count ? ` (${count})` : ""}`;
    }
    return `Task · ${text || "Shared task"}`;
  }
  if (msg?.kind === "reminder") return `Reminder · ${text || "Shared reminder"}`;
  if (msg?.documents?.length) {
    const name = msg.documents[0]?.name;
    return name ? `📄 ${name}` : "Document";
  }
  if (msg?.audioUrl || (msg?.audioUrls && msg.audioUrls.length > 0)) return "Audio";
  if (msg?.videoUrl || (msg?.videoUrls && msg.videoUrls.length > 0)) return "Video";
  if (msg?.imageUrl || (msg?.imageUrls && msg.imageUrls.length > 0)) return "Photo";

  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.toUpperCase().startsWith('[CALL_LOG:')) {
    const parts = trimmed.replace(/\]$/, '').split(':');
    const status = (parts[1] || '').toLowerCase();
    const duration = parseInt(parts[2]) || 0;
    const label = callStatusLabel(status);
    if ((status === 'completed' || status === 'disconnected') && duration > 0) {
      return `${label} · ${formatCallDuration(duration)}`;
    }
    return label;
  }
  return trimmed;
};

export const getReplyPreviewKind = (msg?: PreviewableMessage | null): ReplyPreviewKind => {
  if (!msg) return "text";
  if (msg.location) return "location";
  if (msg.kind === "poll" || msg.pollMeta?.question) return "poll";
  if (msg.kind === "task") return "task";
  if (msg.kind === "reminder") return "reminder";
  if (msg.documents?.length) return "document";
  if (msg.audioUrl || (msg.audioUrls && msg.audioUrls.length > 0)) return "audio";
  if (msg.videoUrl || (msg.videoUrls && msg.videoUrls.length > 0)) return "video";
  if (msg.imageUrl || (msg.imageUrls && msg.imageUrls.length > 0)) return "image";
  if (msg.text?.trim().toUpperCase().startsWith("[CALL_LOG:")) return "call";
  return "text";
};

export const getReplyThumbUrl = (msg?: PreviewableMessage | null): string | null => {
  if (!msg) return null;
  const raw =
    msg.imageUrls?.[0] ||
    msg.imageUrl ||
    msg.videoUrls?.[0] ||
    msg.videoUrl ||
    null;
  return raw ? toProtectedMediaUrl(raw) : null;
};

export const renderMessage = (text: string) => {
  const trimmedText = text.trim();
  const upperText = trimmedText.toUpperCase();
  if (upperText.startsWith('[CALL_LOG:')) {
    const parts = trimmedText.split(':');
    const status = parts[1].toLowerCase();
    const duration = parseInt(parts[2]) || 0;

    const formatDuration = formatCallDuration;

    return (
      <div className="flex items-center gap-3 py-1">
        <div className={`p-2.5 rounded-2xl ${
          status === 'missed' ? 'bg-red-500/20 text-red-400' : 
          status === 'rejected' ? 'bg-zinc-500/20 text-zinc-400' : 
          'bg-green-500/20 text-green-400'
        }`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {status === 'missed' ? (
              <>
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 .94-.94"/>
                <line x1="22" y1="2" x2="2" y2="22"/>
              </>
            ) : (
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            )}
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-black uppercase tracking-widest opacity-90">
            {callStatusLabel(status)}
          </span>
          <span className="text-[10px] font-bold opacity-50 tracking-tight">
            {(status === 'completed' || status === 'disconnected') && duration > 0
              ? formatDuration(duration)
              : status === 'cancelled'
                ? 'Cancelled before pickup'
                : status === 'rejected'
                  ? 'Declined'
                  : status === 'failed'
                    ? 'Could not connect'
                    : 'No Answer'}
          </span>
        </div>
      </div>
    );
  }

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  const urls: string[] = [];

  const renderedText = parts.map((part, index) => {
    if (part.match(urlRegex)) {
      urls.push(part);
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="whitespace-pre-wrap break-words">{renderedText}</div>
      {urls.map((url, index) => (
        <UrlPreview key={index} url={url} />
      ))}
    </div>
  );
};
