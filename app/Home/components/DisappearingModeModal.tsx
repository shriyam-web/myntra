import React from "react";

interface DisappearingModeModalProps {
  open: boolean;
  enabledBy: string | null;
  enabledAt: string | null;
  onClose: () => void;
}

export function DisappearingModeModal({
  open,
  enabledBy,
  enabledAt,
  onClose,
}: DisappearingModeModalProps) {
  if (!open) return null;

  const when = enabledAt
    ? new Date(enabledAt).toLocaleString([], {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="fixed inset-0 z-[240] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-[1.75rem] border border-violet-500/30 bg-zinc-950 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-violet-600/25 via-fuchsia-600/10 to-transparent">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-violet-200 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Disappearing messages on</h2>
          <p className="text-xs text-violet-200/80 mt-1.5 leading-relaxed">
            {enabledBy ? (
              <>
                <span className="font-semibold text-violet-100 capitalize">{enabledBy}</span>
                {when ? ` turned this on · ${when}` : " turned this on"}
              </>
            ) : (
              "This chat is now in disappearing mode."
            )}
          </p>
        </div>

        <div className="px-6 py-5 space-y-3.5 text-sm text-zinc-300 leading-relaxed">
          <p>
            New messages (including media, polls, tasks, reminders, and call logs) stay until your partner
            <span className="text-white font-medium"> views </span>
            them, then delete automatically
            <span className="text-white font-medium"> 1 hour later</span>.
          </p>
          <p className="text-zinc-400 text-xs">
            Save a message before it expires and it becomes a regular, permanent message — even if you later unsave it.
          </p>
          <p className="text-zinc-500 text-[11px]">
            Turning the mode off only affects future messages. Ones already marked to disappear still expire on schedule unless saved.
          </p>
        </div>

        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-violet-500 text-white text-xs font-black uppercase tracking-widest active:scale-[0.98] hover:bg-violet-400 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
