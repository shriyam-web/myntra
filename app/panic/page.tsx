"use client";

import React, { useEffect, useState } from "react";
import * as actions from "../../lib/actions";
import { MAINTENANCE_REDIRECT_URL } from "../../lib/maintenance";

export default function PanicPage() {
  const [password, setPassword] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [maintenanceOn, setMaintenanceOn] = useState(false);
  const [enabledAt, setEnabledAt] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const status = await actions.getMaintenanceStatus();
      setMaintenanceOn(status.maintenanceMode);
      setEnabledAt(status.maintenanceEnabledAt);
    } catch {
      setMaintenanceOn(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem("panic_alpha") === "1") {
      setIsAuthed(true);
    }
    void loadStatus();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.toLowerCase().trim() === "icai") {
      sessionStorage.setItem("panic_alpha", "1");
      setIsAuthed(true);
      setPassword("");
    }
  };

  const handleToggle = async () => {
    if (!maintenanceOn) return;
    setIsToggling(true);
    try {
      await actions.disableMaintenanceMode("alpha 1");
      setMaintenanceOn(false);
      setEnabledAt(null);
    } catch (error) {
      console.error("Failed to disable maintenance:", error);
      alert("Could not disable maintenance mode.");
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
        Loading…
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
          <div className="text-center mb-6">
            <p className="text-rose-300 text-[11px] font-black uppercase tracking-[0.35em]">
              Panic Control
            </p>
            <p className="text-zinc-500 text-xs mt-2">Alpha 1 access only</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="enter your web token here"
            className="w-full px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white text-center text-sm outline-none focus:border-rose-400/50"
            autoFocus
          />
          <button
            type="submit"
            className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-500 transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[2rem] border border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl space-y-8">
        <div className="text-center space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-300">
            Maintenance Control
          </p>
          <h1 className="text-2xl font-black">Portal Status</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            When maintenance is on, all site visits redirect to the decoy page except this
            control panel.
          </p>
        </div>

        <div
          className={`rounded-2xl border p-5 ${
            maintenanceOn
              ? "border-amber-500/30 bg-amber-500/10"
              : "border-emerald-500/30 bg-emerald-500/10"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
            Current state
          </p>
          <p className={`text-lg font-black ${maintenanceOn ? "text-amber-300" : "text-emerald-300"}`}>
            {maintenanceOn ? "Maintenance ON" : "Normal operation"}
          </p>
          {maintenanceOn && enabledAt && (
            <p className="text-xs text-zinc-500 mt-2">
              Enabled {new Date(enabledAt).toLocaleString()}
            </p>
          )}
          {maintenanceOn && (
            <p className="text-xs text-zinc-500 mt-3 break-all">
              Redirect: {MAINTENANCE_REDIRECT_URL}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleToggle}
          disabled={!maintenanceOn || isToggling}
          className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
            maintenanceOn
              ? "bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98]"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          }`}
        >
          {isToggling ? "Turning off…" : "Turn maintenance off"}
        </button>

        <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
          Use the floating <span className="text-rose-300 font-bold">Eme.</span> button in
          messages to turn maintenance on.
        </p>
      </div>
    </div>
  );
}
