import React from "react";
import type { WhatsNewRelease } from "../../../lib/whats-new";

export function WhatsNewModal({
  releases,
  marking,
  onClose,
  onMarkRead,
}: {
  releases: WhatsNewRelease[];
  marking: boolean;
  onClose: () => void;
  onMarkRead: () => void;
}) {
  if (!releases.length) return null;

  return (
    <div
      className="fixed inset-0 z-[240] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-[1.75rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="relative px-6 pt-6 pb-4 border-b border-zinc-800/80">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fuchsia-300/80">
            Update
          </p>
          <h2 id="whats-new-title" className="mt-1 text-xl font-semibold text-white pr-10">
            What&apos;s New
          </h2>
        </div>

        <div className="px-6 py-4 max-h-[min(52vh,22rem)] overflow-y-auto space-y-5">
          {releases.map((release) => (
            <section key={release.id}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {release.date}
              </p>
              <h3 className="mt-0.5 text-sm font-medium text-zinc-100">{release.title}</h3>
              <ul className="mt-2 space-y-1.5">
                {release.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-zinc-300 leading-snug">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-fuchsia-400/80 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="p-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onMarkRead}
            disabled={marking}
            className="py-3 rounded-2xl bg-white text-zinc-950 text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-60"
          >
            {marking ? "Saving…" : "Mark as read"}
          </button>
        </div>
      </div>
    </div>
  );
}
