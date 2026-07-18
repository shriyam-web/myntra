import React from "react";
import { PlanItem, ReminderItem } from "../types";

type SharedItemCardProps =
  | {
      kind: "task";
      item?: PlanItem;
      items?: PlanItem[];
      listTitle?: string;
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

export const SharedItemCard: React.FC<SharedItemCardProps> = (props) => {
  const { kind, fallbackTitle, onToggle, onOpen } = props;
  const isTask = kind === "task";

  if (isTask) {
    const listItems = (props.items && props.items.length > 0
      ? props.items
      : props.item
        ? [props.item]
        : []) as PlanItem[];
    const isList = listItems.length > 1 || Boolean(props.listTitle);
    const title = props.listTitle || props.item?.content || fallbackTitle;
    const doneCount = listItems.filter((item) => item.done).length;
    const allDone = listItems.length > 0 && doneCount === listItems.length;

    return (
      <div className="mt-1.5 min-w-[230px] max-w-[300px] overflow-hidden rounded-2xl border border-white/15 bg-black/20">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-white/5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-400/20 text-blue-100">
            ✓
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
              Shared {isList ? "todo list" : "task"}
            </span>
            <span className={`mt-0.5 block text-sm font-semibold leading-snug text-white ${allDone ? "line-through opacity-55" : ""}`}>
              {title}
            </span>
            {isList && listItems.length > 0 && (
              <span className="mt-1 block text-[10px] text-white/55">
                {doneCount}/{listItems.length} done
              </span>
            )}
          </span>
        </button>

        {isList ? (
          <div className="space-y-0.5 border-t border-white/10 px-2 py-2">
            {listItems.length === 0 ? (
              <p className="px-1.5 py-1 text-[10px] text-white/45">No longer available</p>
            ) : (
              listItems.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle(item._id);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left active:bg-white/5"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px] font-black ${
                      item.done
                        ? "border-blue-400 bg-blue-400 text-zinc-950"
                        : "border-white/35 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className={`min-w-0 flex-1 text-[12px] leading-snug text-white ${item.done ? "line-through opacity-50" : ""}`}>
                    {item.content}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between border-t border-white/10 px-3.5 py-2">
            <span className="text-[10px] text-white/45">
              {!props.item ? "No longer available" : props.item.done ? "Completed" : "Shared with both of you"}
            </span>
            {props.item && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle(props.item!._id);
                }}
                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider active:scale-95 ${
                  props.item.done ? "bg-white/10 text-white/70" : "bg-white text-zinc-950"
                }`}
              >
                {props.item.done ? "Undo" : "Done"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const item = props.item;
  const title = item ? item.title : fallbackTitle;
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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-100">
          ⏰
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
            Shared reminder
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
