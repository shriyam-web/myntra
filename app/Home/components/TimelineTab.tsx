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
      nextOccurrence(b.date, b.recurringYearly).getTime()
  );
  const upcomingReminders = reminders.filter((r) => !r.done);
  const doneReminders = reminders.filter((r) => r.done);

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h2 className="text-sm font-black text-white px-1 uppercase tracking-[0.3em] flex items-center gap-3">
        <span className="w-2 h-2 bg-zinc-500 rounded-full"></span>
        Important Dates
      </h2>

      <div className="bg-zinc-900 p-6 sm:p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="flex flex-col gap-3 relative z-10">
          <input
            autoComplete="off"
            spellCheck={false}
            value={newEvent}
            onChange={(e) => setNewEvent(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-zinc-600 placeholder:text-zinc-800"
            placeholder="Anniversary, birthday, trip…"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-zinc-600 [color-scheme:dark]"
            />
            <button
              onClick={handleCreateDate}
              className="bg-white text-black px-8 py-4 flex items-center justify-center rounded-2xl active:scale-90 transition-all font-black uppercase tracking-widest text-[10px] hover:bg-zinc-200"
            >
              Add Date
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none px-1">
            <input
              type="checkbox"
              checked={newDateYearly}
              onChange={(e) => setNewDateYearly(e.target.checked)}
              className="rounded border-zinc-700"
            />
            Repeats every year
          </label>
        </div>

        <div className="space-y-4 relative z-10">
          {sortedDates.length === 0 ? (
            <p className="text-zinc-600 text-[10px] font-black text-center uppercase tracking-widest py-6 italic">
              No dates yet
            </p>
          ) : (
            sortedDates.map((d) => {
              const label = countdownLabel(d.date, d.recurringYearly);
              const isToday = label === "Today";
              return (
                <div key={d._id} className="relative pl-8 group">
                  <div className="absolute left-[3px] top-0 bottom-0 w-px bg-zinc-800 group-last:bg-transparent"></div>
                  <div className={`absolute left-0 top-2 w-2 h-2 rounded-full border-2 border-zinc-950 ${isToday ? "bg-emerald-400" : "bg-zinc-700 group-hover:bg-white"} transition-colors`}></div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/50 group-hover:border-zinc-700 transition-all">
                    {editingDate === d._id ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <input
                          value={editingEventText}
                          onChange={(e) => setEditingEventText(e.target.value)}
                          className="bg-zinc-950 border border-zinc-600 rounded-lg px-3 py-1.5 text-sm font-bold text-white outline-none"
                        />
                        <input
                          type="date"
                          value={editingDateText}
                          onChange={(e) => setEditingDateText(e.target.value)}
                          className="bg-zinc-950 border border-zinc-600 rounded-lg px-3 py-1.5 text-sm font-bold text-white outline-none [color-scheme:dark]"
                        />
                        <label className="flex items-center gap-2 text-xs text-zinc-400">
                          <input
                            type="checkbox"
                            checked={editingDateYearly}
                            onChange={(e) => setEditingDateYearly(e.target.checked)}
                          />
                          Yearly
                        </label>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                            {new Date(d.date + "T12:00:00").toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "long",
                              year: d.recurringYearly ? undefined : "numeric",
                            })}
                            {d.recurringYearly ? " · yearly" : ""}
                          </p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isToday
                              ? "bg-emerald-500/20 text-emerald-300"
                              : label.includes("ago")
                                ? "bg-zinc-800 text-zinc-500"
                                : "bg-sky-500/15 text-sky-300"
                          }`}>
                            {label}
                          </span>
                        </div>
                        <p className="text-white font-bold tracking-tight">{d.event}</p>
                        {d.note ? <p className="text-xs text-zinc-500 mt-1">{d.note}</p> : null}
                      </div>
                    )}
                    <div className="flex gap-2 self-end sm:self-center shrink-0">
                      {editingDate === d._id ? (
                        <>
                          <button
                            onClick={() => handleUpdateDate(d._id, editingEventText, editingDateText, editingDateYearly)}
                            className="text-green-500 hover:text-green-400 text-xs px-2 py-1 rounded"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              setEditingDate(null);
                              setEditingDateText("");
                              setEditingEventText("");
                            }}
                            className="text-zinc-500 hover:text-zinc-400 text-xs px-2 py-1 rounded"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingDate(d._id);
                              setEditingDateText(d.date);
                              setEditingEventText(d.event);
                              setEditingDateYearly(Boolean(d.recurringYearly));
                            }}
                            className="text-zinc-500 hover:text-white text-xs px-2 py-1 rounded transition-colors"
                          >
                            ✏
                          </button>
                          <button
                            onClick={() => handleDeleteDate(d._id)}
                            className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded transition-colors"
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <h2 className="text-sm font-black text-white px-1 uppercase tracking-[0.3em] flex items-center gap-3">
        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
        Shared Reminders
      </h2>

      <div className="bg-zinc-900 p-6 sm:p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            autoComplete="off"
            value={newReminderTitle}
            onChange={(e) => setNewReminderTitle(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-zinc-600 placeholder:text-zinc-800"
            placeholder="Remind us to…"
          />
          <input
            type="datetime-local"
            value={newReminderDue}
            onChange={(e) => setNewReminderDue(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none [color-scheme:dark]"
          />
          <button
            onClick={handleCreateReminder}
            className="bg-amber-400 text-black px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95"
          >
            Add
          </button>
        </div>

        {upcomingReminders.length === 0 && doneReminders.length === 0 ? (
          <p className="text-zinc-600 text-[10px] font-black text-center uppercase tracking-widest py-4 italic">
            No reminders
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingReminders.map((r) => {
              const itsTime = new Date(r.dueAt).getTime() <= Date.now();
              return (
                <div
                  key={r._id}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border ${
                    itsTime ? "bg-amber-500/10 border-amber-500/30" : "bg-zinc-950/50 border-zinc-800/60"
                  }`}
                >
                  <span className="text-base shrink-0">{itsTime ? "🎉" : "⏰"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{r.title}</p>
                    <p className={`text-[10px] ${itsTime ? "text-amber-300" : "text-zinc-500"}`}>
                      {itsTime ? "It's time! · " : ""}
                      {new Date(r.dueAt).toLocaleString([], {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {itsTime && (
                    <button
                      onClick={() => handleToggleReminder(r._id)}
                      className="text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-zinc-950 px-2.5 py-1.5 rounded-lg active:scale-95 shrink-0"
                    >
                      🎉 Got it
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteReminder(r._id)}
                    className="text-red-500/80 hover:text-red-400 text-xs px-2"
                  >
                    🗑
                  </button>
                </div>
              );
            })}
            {doneReminders.length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 pt-2 px-1">Celebrated 🎉</p>
                {doneReminders.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-950/30 border border-zinc-800/40 opacity-70"
                  >
                    <span className="text-base shrink-0">🎉</span>
                    <p className="min-w-0 flex-1 text-sm text-zinc-400 truncate">{r.title}</p>
                    <button
                      onClick={() => handleDeleteReminder(r._id)}
                      className="text-red-500/70 hover:text-red-400 text-xs px-2"
                    >
                      🗑
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
