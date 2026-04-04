import React from "react";
import { PlanItem } from "../types";

interface PlansTabProps {
  plans: PlanItem[];
  newPlan: string;
  setNewPlan: (value: string) => void;
  handleCreatePlan: () => void;
  editingPlan: string | null;
  setEditingPlan: (id: string | null) => void;
  editingPlanText: string;
  setEditingPlanText: (text: string) => void;
  handleUpdatePlan: (id: string, text: string) => void;
  handleDeletePlan: (id: string) => void;
}

export const PlansTab: React.FC<PlansTabProps> = ({
  plans,
  newPlan,
  setNewPlan,
  handleCreatePlan,
  editingPlan,
  setEditingPlan,
  editingPlanText,
  setEditingPlanText,
  handleUpdatePlan,
  handleDeletePlan,
}) => {
  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h2 className="text-sm font-black text-white px-1 uppercase tracking-[0.3em] flex items-center gap-3">
        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
        Tactical Ops
      </h2>
      <div className="bg-zinc-900 p-8 rounded-[3rem] border border-zinc-800 shadow-2xl space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[80px] -mr-16 -mt-16 rounded-full"></div>
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <input
            autoComplete="off"
            spellCheck={false}
            value={newPlan}
            onChange={(e) => setNewPlan(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none focus:border-zinc-600 placeholder:text-zinc-800"
            placeholder="Objective..."
          />
          <button
            onClick={handleCreatePlan}
            className="bg-white text-black w-full sm:w-16 h-16 flex items-center justify-center rounded-2xl shadow-xl active:scale-90 transition-all hover:bg-zinc-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4 relative z-10">
          {plans.length === 0 ? (
            <p className="text-zinc-800 text-[10px] font-black text-center uppercase tracking-widest py-8 italic">
              No objectives queued
            </p>
          ) : (
            plans.map((p) => (
              <div
                key={p._id}
                className="flex items-center gap-5 text-sm text-white font-black bg-zinc-950/80 p-6 rounded-3xl border border-zinc-800 shadow-lg group hover:border-blue-900/50 transition-all"
              >
                <div className="w-2 h-2 bg-zinc-800 group-hover:bg-blue-500 rounded-full transition-colors"></div>
                {editingPlan === p._id ? (
                  <input
                    value={editingPlanText}
                    onChange={(e) => setEditingPlanText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdatePlan(p._id, editingPlanText);
                      if (e.key === "Escape") {
                        setEditingPlan(null);
                        setEditingPlanText("");
                      }
                    }}
                    className="flex-1 bg-zinc-950 border border-zinc-600 rounded-lg px-3 py-1 text-sm font-bold text-white outline-none"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1">{p.content}</span>
                )}
                <div className="flex gap-2">
                  {editingPlan === p._id ? (
                    <>
                      <button
                        onClick={() => handleUpdatePlan(p._id, editingPlanText)}
                        className="text-green-500 hover:text-green-400 text-xs px-2 py-1 rounded"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setEditingPlan(null);
                          setEditingPlanText("");
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
                          setEditingPlan(p._id);
                          setEditingPlanText(p.content);
                        }}
                        className="text-zinc-500 hover:text-white text-xs px-2 py-1 rounded transition-colors"
                      >
                        ✏
                      </button>
                      <button
                        onClick={() => handleDeletePlan(p._id)}
                        className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded transition-colors"
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
