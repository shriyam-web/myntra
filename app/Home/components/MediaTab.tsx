"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Message, Theme } from "../types";
import { getVideoPoster } from "../../../lib/utils";
import { toProtectedMediaUrl } from "../../../lib/media-url";

const PAGE_SIZE = 12;

interface MediaItem {
  url: string;
  type: "image" | "video";
  message: Message;
  originalIndex: number;
}

interface MediaTabProps {
  messages: Message[];
  activeTheme: Theme;
  handleDownloadMedia: (url: string) => void;
  setPreviewMessage: (m: Message | null) => void;
  setPreviewImageIndex: (index: number) => void;
  isLoading?: boolean;
}

function MediaTile({
  item,
  onBroken,
  onOpen,
  onDownload,
}: {
  item: MediaItem;
  onBroken: (url: string) => void;
  onOpen: () => void;
  onDownload: () => void;
}) {
  const [ready, setReady] = useState(false);
  const thumbSrc =
    item.type === "video" ? getVideoPoster(item.url) || "" : item.url;

  useEffect(() => {
    if (!thumbSrc) onBroken(item.url);
  }, [thumbSrc, item.url, onBroken]);

  if (!thumbSrc) return null;

  return (
    <div
      className="relative aspect-square group cursor-pointer overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-950"
      onClick={onOpen}
    >
      {!ready && <div className="absolute inset-0 bg-zinc-900 animate-pulse" />}
      <img
        src={thumbSrc}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setReady(true)}
        onError={() => onBroken(item.url)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />
      {item.type === "video" && ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>
      )}
      {ready && (
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="p-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export const MediaTab: React.FC<MediaTabProps> = ({
  messages,
  activeTheme,
  handleDownloadMedia,
  setPreviewMessage,
  setPreviewImageIndex,
  isLoading = false,
}) => {
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const mediaItems = useMemo(() => {
    const items: MediaItem[] = [];
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    sortedMessages.forEach((m) => {
      const images = (m.imageUrls || (m.imageUrl ? [m.imageUrl] : [])).filter(Boolean);
      const videos = (m.videoUrls || (m.videoUrl ? [m.videoUrl] : [])).filter(Boolean);

      images.forEach((url, idx) => {
        const protectedUrl = toProtectedMediaUrl(url);
        if (!protectedUrl) return;
        items.push({ url: protectedUrl, type: "image", message: m, originalIndex: idx });
      });

      videos.forEach((url, idx) => {
        const protectedUrl = toProtectedMediaUrl(url);
        if (!protectedUrl) return;
        items.push({
          url: protectedUrl,
          type: "video",
          message: m,
          originalIndex: idx + images.length,
        });
      });
    });

    return items;
  }, [messages]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setBrokenUrls(new Set());
  }, [messages]);

  const markBroken = useCallback((url: string) => {
    setBrokenUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);

  const availableItems = useMemo(
    () => mediaItems.filter((item) => !brokenUrls.has(item.url)),
    [mediaItems, brokenUrls]
  );

  const shownItems = availableItems.slice(0, visibleCount);
  const remaining = Math.max(0, availableItems.length - shownItems.length);

  if (isLoading && mediaItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-4">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-white rounded-full animate-spin mb-3" />
        <p className="text-zinc-500 text-sm">Fetching media…</p>
      </div>
    );
  }

  if (mediaItems.length === 0 || availableItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-4">
        <div className="w-16 h-16 bg-zinc-950 rounded-2xl flex items-center justify-center border border-zinc-800 mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={activeTheme.accent}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <h3 className="text-white font-semibold text-lg mb-1 tracking-tight">No media found</h3>
        <p className="text-zinc-500 text-sm max-w-[240px] leading-relaxed">
          Photos and videos shared in this chat will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white tracking-tight">Media gallery</h2>
        <p className="text-xs font-medium text-zinc-500 mt-0.5">
          {shownItems.length}
          {availableItems.length !== shownItems.length
            ? ` of ${availableItems.length}`
            : ""}{" "}
          {availableItems.length === 1 ? "item" : "items"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {shownItems.map((item) => (
          <MediaTile
            key={`${item.message._id}-${item.originalIndex}-${item.url}`}
            item={item}
            onBroken={markBroken}
            onOpen={() => {
              setPreviewMessage(item.message);
              setPreviewImageIndex(item.originalIndex);
            }}
            onDownload={() => handleDownloadMedia(item.url)}
          />
        ))}
      </div>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          className="w-full mt-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:text-white active:scale-[0.99]"
        >
          View more ({remaining} left)
        </button>
      )}
    </div>
  );
};
