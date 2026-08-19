import React from "react";
import { ReminderItem, TimelineDate } from "../types";
import { countdownLabel, nextOccurrence } from "../../../lib/date-countdown";

interface TimelineTabProps {
  dates: TimelineDate[];
  reminders: ReminderItem[];
  newEvent: string;
  setNewEvent: (value: string) => void;
  newDate: string;
  setNewDate: (value: string) => void;
  newDateYearly: boolean;
  setNewDateYearly: (value: boolean) => void;
  handleCreateDate: () => void;
  editingDate: string | null;
  setEditingDate: (id: string | null) => void;
  editingDateText: string;
  setEditingDateText: (text: string) => void;
  editingEventText: string;
  setEditingEventText: (text: string) => void;
  editingDateYearly: boolean;
  setEditingDateYearly: (value: boolean) => void;
  handleUpdateDate: (id: string, event: string, date: string, recurringYearly?: boolean) => void;
  handleDeleteDate: (id: string) => void;
  newReminderTitle: string;
  setNewReminderTitle: (value: string) => void;
  newReminderDue: string;
  setNewReminderDue: (value: string) => void;
  handleCreateReminder: () => void;
  handleToggleReminder: (id: string) => void;
  handleDeleteReminder: (id: string) => void;
}

const fieldClass =
  "w-full min-w-0 max-w-full box-border bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-600 placeholder:text-zinc-600 [color-scheme:dark]";

export const TimelineTab: React.FC<TimelineTabProps> = ({
  dates,
  reminders,
  newEvent,
  setNewEvent,
  newDate,
  setNewDate,
  newDateYearly,
  setNewDateYearly,
  handleCreateDate,
  editingDate,
  setEditingDate,
  editingDateText,
  setEditingDateText,
  editingEventText,
  setEditingEventText,
  editingDateYearly,
  setEditingDateYearly,
  handleUpdateDate,
  handleDeleteDate,
  newReminderTitle,
  setNewReminderTitle,
  newReminderDue,
  setNewReminderDue,
  handleCreateReminder,
  handleToggleReminder,
  handleDeleteReminder,
}) => {
  const sortedDates = [...dates].sort(
    (a, b) =>
      nextOccurrence(a.date, a.recurringYearly).getTime() -
      nextOccurrence(b.date, a.recurringYearly).getTime()
  );
  const upcomingReminders = reminders.filter((r) => !r.done);
  const doneReminders = reminders.filter((r) => r.done);

  return (
    <section className="w-full min-w-0 max-w-full overflow-x-hidden space-y-5">
      <div className="space-y-2.5">
        <h2 className="text-sm font-semibold text-white tracking-tight px-0.5">
          Important dates
        </h2>

        <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 space-y-2.5 min-w-0">
          <input
            autoComplete="off"
            spellCheck={false}
            value={newEvent}
            onChange={(e) => setNewEvent(e.target.value)}
            className={fieldClass}
            placeholder="Anniversary, birthday, trip…"
          />
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className={fieldClass}
          />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none min-w-0">
              <input
                type="checkbox"
                checked={newDateYearly}
                onChange={(e) => setNewDateYearly(e.target.checked)}
                className="rounded border-zinc-700 shrink-0"
              />
              Repeats yearly
            </label>
            <button
              onClick={handleCreateDate}
              className="shrink-0 bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold hover:bg-zinc-200 active:scale-[0.98]"
            >
              Add
            </button>
          </div>
        </div>

        {sortedDates.length === 0 ? (
          <p className="text-zinc-600 text-xs text-center py-3 border border-dashed border-zinc-800 rounded-xl">
            No dates yet
          </p>
        ) : (
          <div className="space-y-1.5">
            {sortedDates.map((d) => {
              const label = countdownLabel(d.date, d.recurringYearly);
              const isToday = label === "Today";
              return (
                <div
                  key={d._id}
                  className="w-full min-w-0 px-3 py-2.5 bg-zinc-900/70 border border-zinc-800 rounded-xl"
                >
                  {editingDate === d._id ? (
                    <div className="space-y-2 min-w-0">
                      <input
                        value={editingEventText}
                        onChange={(e) => setEditingEventText(e.target.value)}
                        className={fieldClass}
                      />
                      <input
                        type="date"
                        value={editingDateText}
                        onChange={(e) => setEditingDateText(e.target.value)}
                        className={fieldClass}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-xs text-zinc-400">
                          <input
                            type="checkbox"
                            checked={editingDateYearly}
                            onChange={(e) => setEditingDateYearly(e.target.checked)}
                          />
                          Yearly
                        </label>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() =>
                              handleUpdateDate(
                                d._id,
                                editingEventText,
                                editingDateText,
                                editingDateYearly
                              )
                            }
                            className="text-green-500 text-xs px-2 py-1"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingDate(null);
                              setEditingDateText("");
                              setEditingEventText("");
                            }}
                            className="text-zinc-500 text-xs px-2 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <p className="text-sm font-medium text-white leading-snug break-words min-w-0">
                          {d.event}
                        </p>
                        <span
                          className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                            isToday
                              ? "bg-emerald-500/20 text-emerald-300"
                              : label.includes("ago")
                                ? "bg-zinc-800 text-zinc-500"
                                : "bg-sky-500/15 text-sky-300"
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1 break-words">
                        {new Date(d.date + "T12:00:00").toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: d.recurringYearly ? undefined : "numeric",
                        })}
                        {d.recurringYearly ? " · yearly" : ""}
                      </p>
                      {d.note ? (
                        <p className="text-xs text-zinc-500 mt-1 break-words">{d.note}</p>
                      ) : null}
                      <div className="flex justify-end gap-1 mt-1.5">
                        <button
                          onClick={() => {
                            setEditingDate(d._id);
                            setEditingDateText(d.date);
                            setEditingEventText(d.event);
                            setEditingDateYearly(Boolean(d.recurringYearly));
                          }}
                          className="text-zinc-500 hover:text-white text-xs px-2 py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDate(d._id)}
                          className="text-red-500 hover:text-red-400 text-xs px-2 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        <h2 className="text-sm font-semibold text-white tracking-tight px-0.5">
          Shared reminders
        </h2>

        <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 space-y-2.5 min-w-0">
          <input
            autoComplete="off"
            value={newReminderTitle}
            onChange={(e) => setNewReminderTitle(e.target.value)}
            className={fieldClass}
            placeholder="Remind us to…"
          />
          <input
            type="datetime-local"
            value={newReminderDue}
            onChange={(e) => setNewReminderDue(e.target.value)}
            className={fieldClass}
          />
          <button
            onClick={handleCreateReminder}
            className="w-full bg-amber-400 text-black py-2 rounded-xl text-sm font-semibold active:scale-[0.98]"
          >
            Add reminder
          </button>
        </div>

        {upcomingReminders.length === 0 && doneReminders.length === 0 ? (
          <p className="text-zinc-600 text-xs text-center py-3 border border-dashed border-zinc-800 rounded-xl">
            No reminders
          </p>
        ) : (
          <div className="space-y-1.5">
            {upcomingReminders.map((r) => {
              const itsTime = new Date(r.dueAt).getTime() <= Date.now();
              return (
                <div
                  key={r._id}
                  className={`w-full min-w-0 px-3 py-2.5 rounded-xl border ${
                    itsTime
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-zinc-900/70 border-zinc-800"
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-base shrink-0 leading-none mt-0.5">
                      {itsTime ? "🎉" : "⏰"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white leading-snug break-words">
                        {r.title}
                      </p>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          itsTime ? "text-amber-300" : "text-zinc-500"
                        }`}
                      >
                        {itsTime ? "It's time · " : ""}
                        {new Date(r.dueAt).toLocaleString([], {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5 mt-2">
                    {itsTime && (
                      <button
                        onClick={() => handleToggleReminder(r._id)}
                        className="text-xs font-semibold bg-amber-400 text-zinc-950 px-2.5 py-1 rounded-lg active:scale-95"
                      >
                        Got it
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteReminder(r._id)}
                      className="text-red-500/80 hover:text-red-400 text-xs px-2 py-1"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {doneReminders.length > 0 && (
              <>
                <p className="text-xs font-medium text-zinc-500 pt-1 px-0.5">
                  Celebrated
                </p>
                {doneReminders.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800/50 opacity-70 min-w-0"
                  >
                    <span className="shrink-0">🎉</span>
                    <p className="min-w-0 flex-1 text-sm text-zinc-400 truncate">
                      {r.title}
                    </p>
                    <button
                      onClick={() => handleDeleteReminder(r._id)}
                      className="text-red-500/70 hover:text-red-400 text-xs px-2 shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
