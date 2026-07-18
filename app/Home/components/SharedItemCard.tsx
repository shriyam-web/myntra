import React from "react";
import { PlanItem, ReminderItem } from "../types";

type SharedItemCardProps =
  | {
      kind: "task";
      item?: PlanItem;
      fallbackTitle: string;
      onToggle: (id: string) => void;
      onOpen: () => void;
    }
  | {
      kind: "reminder";
      item?: ReminderItem;
      fallbackTitle: string;
      onToggle: (id: string) => void;
      onOpen: () => void;
    };

function formatDue(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const SharedItemCard: React.FC<SharedItemCardProps> = ({
  kind,
  item,
  fallbackTitle,
  onToggle,
  onOpen,
}) => {
  const isTask = kind === "task";
  const title = item ? (isTask ? (item as PlanItem).content : (item as ReminderItem).title) : fallbackTitle;
  const done = Boolean(item?.done);
  const dueAt = item?.dueAt;
  const dueLabel = formatDue(dueAt);
  const overdue = Boolean(!done && dueAt && new Date(dueAt).getTime() <= Date.now());

  return (
    <div className="mt-1.5 min-w-[230px] max-w-[290px] overflow-hidden rounded-2xl border border-white/15 bg-black/20">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-white/5"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isTask ? "bg-blue-400/20 text-blue-100" : "bg-amber-400/20 text-amber-100"
          }`}
        >
          {isTask ? "✓" : "⏰"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
            Shared {isTask ? "task" : "reminder"}
          </span>
          <span className={`mt-0.5 block text-sm font-semibold leading-snug text-white ${done ? "line-through opacity-55" : ""}`}>
            {title}
          </span>
          {dueLabel && (
            <span className={`mt-1 block text-[10px] ${overdue ? "font-semibold text-amber-200" : "text-white/55"}`}>
              {overdue ? "Overdue · " : "Due · "}
              {dueLabel}
            </span>
          )}
        </span>
      </button>

      <div className="flex items-center justify-between border-t border-white/10 px-3.5 py-2">
        <span className="text-[10px] text-white/45">
          {!item ? "No longer available" : done ? "Completed" : "Shared with both of you"}
        </span>
        {item && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggle(item._id);
            }}
            className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider active:scale-95 ${
              done ? "bg-white/10 text-white/70" : "bg-white text-zinc-950"
            }`}
          >
            {done ? "Undo" : "Done"}
          </button>
        )}
      </div>
    </div>
  );
};
