import React from "react";
import { ViewType } from "../types";

interface ChatHeaderProps {
  currentUser: ViewType;
  connectionStatusDisplay: boolean;
  isSoundEnabled: boolean;
  handleToggleSound: () => void;
  fetchInitialData: () => void;
  isRefreshing: boolean;
  handleLogout: () => void;
}

export function ChatHeader({
  currentUser,
  connectionStatusDisplay,
  isSoundEnabled,
  handleToggleSound,
  fetchInitialData,
  isRefreshing,
  handleLogout
}: ChatHeaderProps) {
  return (
    <header className="relative bg-zinc-950/70 backdrop-blur-2xl z-50 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-fuchsia-600/20 via-violet-500/10 to-cyan-400/20" />
      <div className="relative max-w-md mx-auto flex justify-between items-center w-full px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 flex items-center justify-center">
              <span className="text-[11px] font-black text-white tracking-tight">HY</span>
            </div>
            {connectionStatusDisplay && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-zinc-950" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-[15px] font-semibold text-white leading-none tracking-tight">
              HeyYou
            </h1>
            <div className="flex items-center gap-1.5 mt-1 min-w-0">
              <span className="text-[11px] text-zinc-400 truncate capitalize">
                {currentUser}
              </span>
              <span className="text-zinc-700">·</span>
              <span className={`text-[11px] truncate ${connectionStatusDisplay ? "text-emerald-400" : "text-red-400"}`}>
                {connectionStatusDisplay ? "Connected" : "Reconnecting"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-0.5 items-center p-0.5 rounded-2xl bg-zinc-900/70 border border-white/10">
          <button 
            onClick={handleToggleSound}
            className={`p-2 rounded-xl transition-all active:scale-90 flex items-center ${
              isSoundEnabled 
                ? "bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-white shadow-sm" 
                : "text-zinc-500 hover:text-white hover:bg-white/5"
            }`}
            title={isSoundEnabled ? "Disable Sound" : "Enable Sound"}
          >
            {isSoundEnabled ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            )}
          </button>
          
          <button 
            onClick={() => fetchInitialData()}
            className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all active:scale-90"
            title="Refresh Data"
            disabled={isRefreshing}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className={isRefreshing ? "animate-spin" : ""}
            >
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>

          <button 
            onClick={handleLogout}
            className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
            title="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-fuchsia-500 via-violet-400 to-cyan-400 opacity-80" />
    </header>
  );
}
