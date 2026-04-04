import React from "react";
import { TimelineDate } from "../types";

interface TimelineTabProps {
  dates: TimelineDate[];
  newEvent: string;
  setNewEvent: (value: string) => void;
  newDate: string;
  setNewDate: (value: string) => void;
  handleCreateDate: () => void;
  editingDate: string | null;
  setEditingDate: (id: string | null) => void;
  editingDateText: string;
  setEditingDateText: (text: string) => void;
  editingEventText: string;
  setEditingEventText: (text: string) => void;
  handleUpdateDate: (id: string, event: string, date: string) => void;
  handleDeleteDate: (id: string) => void;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({
  dates,
  newEvent,
  setNewEvent,
  newDate,
  setNewDate,
  handleCreateDate,
  editingDate,
  setEditingDate,
  editingDateText,
  setEditingDateText,
  editingEventText,
  setEditingEventText,
  handleUpdateDate,
  handleDeleteDate,
}) => {
  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h2 className="text-sm font-black text-white px-1 uppercase tracking-[0.3em] flex items-center gap-3">
        <span className="w-2 h-2 bg-zinc-500 rounded-full"></span>
        Neural Timeline
      </h2>
      <div className="bg-zinc-900 p-8 rounded-[3rem] border border-zinc-800 shadow-2xl space-y-8 relative overflow-hidden">
        <div className="flex flex-col gap-4 relative z-10">
          <input
            autoComplete="off"
            spellCheck={false}
            value={newEvent}
            onChange={(e) => setNewEvent(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none focus:border-zinc-600 placeholder:text-zinc-800"
            placeholder="Event description..."
          />
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none focus:border-zinc-600 [color-scheme:dark]"
            />
            <button
              onClick={handleCreateDate}
              className="bg-white text-black px-10 py-5 flex items-center justify-center rounded-2xl shadow-xl active:scale-90 transition-all font-black uppercase tracking-widest text-[10px] hover:bg-zinc-200"
            >
              Commit Date
            </button>
          </div>
        </div>
        <div className="space-y-6 relative z-10">
          {dates.length === 0 ? (
            <p className="text-zinc-800 text-[10px] font-black text-center uppercase tracking-widest py-8 italic">
              History log empty
            </p>
          ) : (
            [...dates]
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((d) => (
                <div key={d._id} className="relative pl-10 group">
                  <div className="absolute left-[3px] top-0 bottom-0 w-px bg-zinc-800 group-last:bg-transparent"></div>
                  <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-zinc-700 border-2 border-zinc-950 group-hover:bg-white transition-colors"></div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/40 p-6 rounded-3xl border border-zinc-800/50 group-hover:border-zinc-700 transition-all">
                    {editingDate === d._id ? (
                      <div className="flex-1 flex flex-col gap-3">
                        <input
                          value={editingEventText}
                          onChange={(e) => setEditingEventText(e.target.value)}
                          className="bg-zinc-950 border border-zinc-600 rounded-lg px-3 py-1 text-sm font-bold text-white outline-none"
                        />
                        <input
                          type="date"
                          value={editingDateText}
                          onChange={(e) => setEditingDateText(e.target.value)}
                          className="bg-zinc-950 border border-zinc-600 rounded-lg px-3 py-1 text-sm font-bold text-white outline-none [color-scheme:dark]"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">
                          {new Date(d.date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-white font-black tracking-tight">{d.event}</p>
                      </div>
                    )}
                    <div className="flex gap-2 self-end sm:self-center">
                      {editingDate === d._id ? (
                        <>
                          <button
                            onClick={() => handleUpdateDate(d._id, editingEventText, editingDateText)}
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
              ))
          )}
        </div>
      </div>
    </section>
  );
};
