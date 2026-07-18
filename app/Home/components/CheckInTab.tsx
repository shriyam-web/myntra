import React from "react";
import { MoodCheckInItem, MoodType, UserType } from "../types";

const MOODS: { id: MoodType; label: string; emoji: string }[] = [
  { id: "love", label: "Love", emoji: "💕" },
  { id: "happy", label: "Happy", emoji: "😊" },
  { id: "calm", label: "Calm", emoji: "😌" },
  { id: "grateful", label: "Grateful", emoji: "🙏" },
  { id: "tired", label: "Tired", emoji: "😴" },
  { id: "stressed", label: "Stressed", emoji: "😤" },
  { id: "sad", label: "Sad", emoji: "😔" },
];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayOffsetKey(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface CheckInTabProps {
  currentUser: UserType;
  moods: MoodCheckInItem[];
  selectedMood: MoodType | null;
  setSelectedMood: (m: MoodType | null) => void;
  moodNote: string;
  setMoodNote: (v: string) => void;
  handleSaveMood: () => void;
  handleShareMoodToChat: () => void;
  isSaving?: boolean;
}

export const CheckInTab: React.FC<CheckInTabProps> = ({
  currentUser,
  moods,
  selectedMood,
  setSelectedMood,
  moodNote,
  setMoodNote,
  handleSaveMood,
  handleShareMoodToChat,
  isSaving = false,
}) => {
  const today = todayKey();
  const partner = currentUser.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1";
  const myToday = moods.find(
    (m) => m.user.trim().toLowerCase() === currentUser.trim().toLowerCase() && m.day === today
  );
  const partnerToday = moods.find(
    (m) => m.user.trim().toLowerCase() === partner && m.day === today
  );

  const moodMeta = (id: MoodType) => MOODS.find((m) => m.id === id);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = dayOffsetKey(i);
    return {
      day,
      mine: moods.find(
        (m) => m.user.trim().toLowerCase() === currentUser.trim().toLowerCase() && m.day === day
      ),
      theirs: moods.find(
        (m) => m.user.trim().toLowerCase() === partner && m.day === day
      ),
    };
  });

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h2 className="text-sm font-black text-white px-1 uppercase tracking-[0.3em] flex items-center gap-3">
        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
        Daily Check-in
      </h2>

      <div className="bg-zinc-900 p-6 sm:p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl space-y-6">
        <p className="text-xs text-zinc-400">How are you feeling today?</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {MOODS.map((m) => {
            const active = (selectedMood || myToday?.mood) === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMood(m.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all active:scale-95 ${
                  active
                    ? "bg-pink-500/20 border-pink-400/50 text-white"
                    : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
              </button>
            );
          })}
        </div>

        <input
          value={moodNote}
          onChange={(e) => setMoodNote(e.target.value)}
          placeholder="Optional note…"
          maxLength={200}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-zinc-600 placeholder:text-zinc-700"
        />

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleSaveMood}
            disabled={(!selectedMood && !myToday) || isSaving}
            className="flex-1 bg-white text-black py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] disabled:opacity-40 active:scale-95"
          >
            {myToday ? "Update Today" : "Check In"}
          </button>
          {myToday && (
            <button
              onClick={handleShareMoodToChat}
              className="px-5 py-3.5 rounded-2xl border border-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800"
            >
              Share to Chat
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">You</p>
          {myToday ? (
            <>
              <p className="text-2xl">{moodMeta(myToday.mood)?.emoji}</p>
              <p className="text-sm font-bold text-white mt-1 capitalize">{myToday.mood}</p>
              {myToday.note ? <p className="text-xs text-zinc-500 mt-1">{myToday.note}</p> : null}
            </>
          ) : (
            <p className="text-xs text-zinc-600">Not checked in yet</p>
          )}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Partner</p>
          {partnerToday ? (
            <>
              <p className="text-2xl">{moodMeta(partnerToday.mood)?.emoji}</p>
              <p className="text-sm font-bold text-white mt-1 capitalize">{partnerToday.mood}</p>
              {partnerToday.note ? <p className="text-xs text-zinc-500 mt-1">{partnerToday.note}</p> : null}
            </>
          ) : (
            <p className="text-xs text-zinc-600">Waiting…</p>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Last 7 days</p>
        <div className="space-y-2">
          {last7.map(({ day, mine, theirs }) => (
            <div key={day} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-zinc-500 w-20 shrink-0">
                {day === today
                  ? "Today"
                  : new Date(day + "T12:00:00").toLocaleDateString([], { weekday: "short", day: "numeric" })}
              </span>
              <span className="flex-1 text-center">{mine ? moodMeta(mine.mood)?.emoji : "·"}</span>
              <span className="flex-1 text-center">{theirs ? moodMeta(theirs.mood)?.emoji : "·"}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[9px] uppercase tracking-widest text-zinc-600 px-20">
          <span>You</span>
          <span>Partner</span>
        </div>
      </div>
    </section>
  );
};
