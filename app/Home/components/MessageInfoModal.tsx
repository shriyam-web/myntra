import React from "react";
import { Message } from "../types";

function formatFull(iso?: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function kindLabel(message: Message) {
  if (message.kind === "poll") return "Poll";
  if (message.kind === "task" || message.kind === "reminder") return "Shared item";
  if (message.kind === "call-log") return "Call log";
  if (message.location) return "Location";
  const hasMedia =
    Boolean(message.imageUrl) ||
    (message.imageUrls && message.imageUrls.length > 0) ||
    Boolean(message.videoUrl) ||
    (message.videoUrls && message.videoUrls.length > 0) ||
    Boolean(message.audioUrl) ||
    (message.audioUrls && message.audioUrls.length > 0) ||
    (message.documents && message.documents.length > 0);
  if (hasMedia && message.text) return "Text + media";
  if (hasMedia) return "Media";
  return "Text";
}

function InfoRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-zinc-800/80 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 pt-0.5 shrink-0">
        {label}
      </p>
      <p className={`text-sm text-right leading-snug ${muted ? "text-zinc-500" : "text-zinc-100"}`}>
        {value}
      </p>
    </div>
  );
}

export function MessageInfoModal({
  message,
  isMe,
  isRead,
  isOptimistic,
  onClose,
}: {
  message: Message;
  isMe: boolean;
  isRead: boolean;
  isOptimistic: boolean;
  onClose: () => void;
}) {
  const sent = formatFull(message.createdAt);
  const seenExact = formatFull(message.seenAt);
  const opened = formatFull(message.viewedAt);
  const expires = formatFull(message.expiresAt);
  const pinnedBy = (message.pinnedBy || []).length
    ? (message.pinnedBy || []).join(", ")
    : null;

  let status = "Sent";
  let seenValue = "Not seen yet";
  let seenMuted = true;

  if (isOptimistic) {
    status = "Sending…";
    seenValue = "—";
  } else if (isMe) {
    if (seenExact) {
      status = "Seen";
      seenValue = seenExact;
      seenMuted = false;
    } else if (isRead) {
      status = "Seen";
      seenValue = "Seen";
      seenMuted = false;
    } else {
      status = "Sent";
      seenValue = "Not seen yet";
    }
  } else if (opened) {
    seenValue = opened;
    seenMuted = false;
  } else if (isRead) {
    seenValue = "Opened";
    seenMuted = false;
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-[1.75rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800/80">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Message info
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {isMe ? "Your message" : `${message.createdBy}'s message`}
          </h2>
        </div>

        <div className="px-6 py-1">
          <InfoRow label="Type" value={kindLabel(message)} />
          <InfoRow label="From" value={message.createdBy} />
          <InfoRow label="Status" value={status} />
          <InfoRow label="Sent" value={sent || "—"} />
          <InfoRow
            label={isMe ? "Seen" : "Opened"}
            value={seenValue}
            muted={seenMuted}
          />
          {message.disappearing && (
            <InfoRow label="Disappearing" value={expires ? `Until ${expires}` : "1h after opened"} />
          )}
          {pinnedBy && <InfoRow label="Pinned by" value={pinnedBy} />}
        </div>

        <div className="p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
