import React from "react";
import { createPortal } from "react-dom";

export type SafetyMediaKind = "image" | "video" | "audio" | "document" | "location";

export interface MediaSafetyInfo {
  kind: SafetyMediaKind;
  /** True when the file is served through the login-gated proxy (new uploads). */
  protectedDelivery: boolean;
}

interface MediaSafetyModalProps {
  info: MediaSafetyInfo;
  onClose: () => void;
}

const KIND_LABEL: Record<SafetyMediaKind, string> = {
  image: "Photo",
  video: "Video",
  audio: "Voice note",
  document: "Document",
  location: "Location",
};

interface SafetyItem {
  title: string;
  detail: string;
  ok: boolean;
}

function buildItems(info: MediaSafetyInfo): SafetyItem[] {
  const { kind, protectedDelivery } = info;

  if (kind === "location") {
    return [
      {
        title: "Shared once, not tracked",
        detail:
          "Only the exact coordinates at the moment of sharing were sent. There is no live tracking — your position is never updated after sending.",
        ok: true,
      },
      {
        title: "Visible only inside this chat",
        detail:
          "The location is stored with your messages and shown only to the two of you after logging in with the password.",
        ok: true,
      },
      {
        title: "Encrypted in transit",
        detail: "The coordinates travel over an encrypted HTTPS connection.",
        ok: true,
      },
      {
        title: "Map opens externally",
        detail:
          "Tapping the card opens Google Maps with the coordinates. Google will see the coordinates you open, like any maps search.",
        ok: false,
      },
    ];
  }

  const items: SafetyItem[] = [];

  if (kind === "document") {
    items.push({
      title: "Login required to open",
      detail:
        "This file is delivered only through the app's own server, which checks your login session first. The link is useless to anyone who is not signed in to this chat.",
      ok: true,
    });
    items.push({
      title: "Dangerous file types blocked",
      detail:
        "Executables, scripts, and other risky file types are rejected before upload, so files shared here can't carry those threats.",
      ok: true,
    });
  } else if (protectedDelivery) {
    items.push({
      title: "Login required to view",
      detail:
        "This file only loads through the app's own server after checking your login session. If someone gets the link, it shows \u201cUnauthorized\u201d instead of the file.",
      ok: true,
    });
    items.push({
      title: "Private cloud storage",
      detail:
        "The file is stored as a protected asset. Direct storage links without a valid cryptographic signature are rejected (401).",
      ok: true,
    });
  } else {
    items.push({
      title: "Older file — limited link protection",
      detail:
        "This was shared before the security upgrade. Inside the app it needs login, but its original storage link may still open directly. Re-send the file to give it full protection.",
      ok: false,
    });
  }

  items.push({
    title: "Encrypted in transit",
    detail:
      "The file always travels over an encrypted HTTPS connection between your device, the server, and storage.",
    ok: true,
  });

  items.push({
    title: "Unlisted and not searchable",
    detail:
      "Storage names are long random strings. The file is not indexed by search engines and cannot be guessed.",
    ok: true,
  });

  items.push({
    title: "Deletable everywhere",
    detail:
      "When the sender deletes this message, they can also permanently erase the file from cloud storage — not just hide it from the chat.",
    ok: true,
  });

  items.push({
    title: "Not end-to-end encrypted",
    detail:
      "Unlike WhatsApp, the file is not encrypted with keys only you two hold. The storage provider technically holds the file bytes. Avoid sharing anything you wouldn't store in a private cloud drive.",
    ok: false,
  });

  return items;
}

export const MediaSafetyModal: React.FC<MediaSafetyModalProps> = ({ info, onClose }) => {
  if (typeof document === "undefined") return null;

  const items = buildItems(info);

  return createPortal(
    <div
      className="fixed inset-0 z-[220] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[80vh] overflow-y-auto no-scrollbar bg-zinc-900 border border-zinc-700/60 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur px-5 pt-5 pb-3 border-b border-zinc-800 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-white font-bold text-base tracking-tight flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
              </span>
              {KIND_LABEL[info.kind]} Safety
            </h3>
            <p className="text-[11px] text-zinc-500 mt-1">
              How this {KIND_LABEL[info.kind].toLowerCase()} is protected in your chat
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3">
              <span
                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  item.ok ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                }`}
              >
                {item.ok ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-zinc-100 leading-snug">{item.title}</p>
                <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-semibold transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
