import React from "react";
import { ReminderItem } from "../types";

interface DueReminderModalProps {
  reminder: ReminderItem | null;
  onClose: () => void;
  onDone: (id: string) => void;
  onOpenDates: () => void;
}

export function DueReminderModal({
  reminder,
  onClose,
  onDone,
  onOpenDates,
}: DueReminderModalProps) {
  if (!reminder) return null;

  const due = new Date(reminder.dueAt);
  const dueTime = due.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="fixed inset-0 z-[245] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="due-reminder-title"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-amber-500/30 bg-zinc-950 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent px-6 pb-4 pt-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/20 text-xl">
            ⏰
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
            Shared reminder
          </p>
          <h2 id="due-reminder-title" className="mt-1 text-lg font-bold tracking-tight text-white">
            This is due today
          </h2>
        </div>

        <div className="px-6 py-5">
          <p className="text-base font-semibold leading-snug text-white">{reminder.title}</p>
          <p className="mt-2 text-xs text-zinc-400">Scheduled for {dueTime}. Both partners receive this notice.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 px-6 pb-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDates();
            }}
            className="rounded-xl bg-white/10 py-3 text-xs font-bold text-zinc-200 active:scale-[0.98]"
          >
            View reminder
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onDone(reminder._id);
            }}
            className="rounded-xl bg-amber-400 py-3 text-xs font-black text-zinc-950 active:scale-[0.98]"
          >
            Mark done
          </button>
        </div>

        <div className="px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-[11px] font-semibold text-zinc-500 hover:text-zinc-300"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
