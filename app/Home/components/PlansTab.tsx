import React from "react";
import { PlanItem } from "../types";

interface PlansTabProps {
  plans: PlanItem[];
  newPlan: string;
  setNewPlan: (value: string) => void;
  newPlanDue: string;
  setNewPlanDue: (value: string) => void;
  handleCreatePlan: () => void;
  editingPlan: string | null;
  setEditingPlan: (id: string | null) => void;
  editingPlanText: string;
  setEditingPlanText: (text: string) => void;
  handleUpdatePlan: (id: string, text: string) => void;
  handleTogglePlan: (id: string) => void;
  handleDeletePlan: (id: string) => void;
}

export const PlansTab: React.FC<PlansTabProps> = ({
  plans,
  newPlan,
  setNewPlan,
  newPlanDue,
  setNewPlanDue,
  handleCreatePlan,
  editingPlan,
  setEditingPlan,
  editingPlanText,
  setEditingPlanText,
  handleUpdatePlan,
  handleTogglePlan,
  handleDeletePlan,
}) => {
  const active = plans.filter((p) => !p.done);
  const done = plans.filter((p) => p.done);

  const renderTask = (p: PlanItem) => (
    <div
      key={p._id}
      className={`flex items-center gap-4 text-sm bg-zinc-950/80 p-4 rounded-2xl border shadow-lg group transition-all ${
        p.done
          ? "border-zinc-800/40 opacity-70"
          : "border-zinc-800 hover:border-blue-900/50"
      }`}
    >
      <button
        onClick={() => handleTogglePlan(p._id)}
        className={`w-5 h-5 rounded-md shrink-0 flex items-center justify-center border transition-colors ${
          p.done
            ? "bg-blue-500 border-blue-500 text-white text-[10px] font-semibold"
            : "border-zinc-600 hover:border-blue-400"
        }`}
        aria-label={p.done ? "Mark active" : "Mark done"}
      >
        {p.done ? "✓" : null}
      </button>

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
          className="flex-1 bg-zinc-950 border border-zinc-600 rounded-lg px-3 py-1 text-sm font-normal text-white outline-none"
          autoFocus
        />
      ) : (
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-white ${p.done ? "line-through text-zinc-500" : ""}`}>
            {p.content}
          </p>
          {p.dueAt && (
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Due {new Date(p.dueAt).toLocaleDateString([], { day: "numeric", month: "short" })}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-1 shrink-0">
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
            {!p.done && (
              <button
                onClick={() => {
                  setEditingPlan(p._id);
                  setEditingPlanText(p.content);
                }}
                className="text-zinc-500 hover:text-white text-xs px-2 py-1 rounded transition-colors"
              >
                ✏
              </button>
            )}
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
  );

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h2 className="text-[15px] font-semibold text-white px-1 tracking-tight flex items-center gap-3">
        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
        Shared Tasks
      </h2>
      <div className="bg-zinc-900 p-6 sm:p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="flex flex-col gap-3 relative z-10">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              autoComplete="off"
              spellCheck={false}
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreatePlan();
              }}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm font-normal text-white outline-none focus:border-zinc-600 placeholder:text-zinc-600"
              placeholder="Add a shared task…"
            />
            <button
              onClick={handleCreatePlan}
              className="bg-white text-black w-full sm:w-14 h-14 flex items-center justify-center rounded-2xl active:scale-90 transition-all hover:bg-zinc-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
          <input
            type="date"
            value={newPlanDue}
            onChange={(e) => setNewPlanDue(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-xs font-medium text-zinc-400 outline-none [color-scheme:dark] w-full sm:w-auto"
            title="Optional due date"
          />
        </div>

        <div className="space-y-3 relative z-10">
          {plans.length === 0 ? (
            <p className="text-zinc-500 text-sm font-medium text-center py-8">
              No tasks yet
            </p>
          ) : (
            <>
              {active.map(renderTask)}
              {done.length > 0 && (
                <>
                  <p className="text-xs font-medium text-zinc-500 pt-3 px-1">
                    Done ({done.length})
                  </p>
                  {done.map(renderTask)}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};
