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
  onOpenSearch: () => void;
}

export function ChatHeader({
  currentUser,
  connectionStatusDisplay,
  isSoundEnabled,
  handleToggleSound,
  fetchInitialData,
  isRefreshing,
  handleLogout,
  onOpenSearch
}: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 py-3 z-50 shadow-2xl">
      <div className="max-w-md mx-auto flex justify-between items-center w-full">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-white leading-none tracking-tight flex items-center gap-2">
              HeyYou
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider border border-zinc-800 px-1.5 py-0.5 rounded-md bg-zinc-950/50">
                {currentUser}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${connectionStatusDisplay ? "text-green-500 bg-green-500/10 border border-green-500/20" : "text-red-500 bg-red-500/10 border border-red-500/20 animate-pulse"}`}>
                {connectionStatusDisplay ? "You're connected" : "Connection Broken"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 items-center">
          <button 
            onClick={handleToggleSound}
            className={`p-2.5 rounded-xl transition-all active:scale-90 border flex items-center gap-2 ${
              isSoundEnabled 
                ? "bg-white text-black border-white shadow-lg shadow-white/5" 
                : "bg-zinc-800/50 text-zinc-500 border-zinc-700/50"
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
            className="p-2.5 bg-zinc-800/50 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all active:scale-90 border border-zinc-700/50"
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
            className="p-2.5 bg-zinc-800/50 rounded-xl text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90 border border-zinc-700/50"
            title="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={`p-2.5 rounded-xl transition-all active:scale-90 border ${
                menuOpen
                  ? "bg-zinc-800 text-white border-zinc-600"
                  : "bg-zinc-800/50 text-zinc-500 hover:text-white hover:bg-zinc-800 border-zinc-700/50"
              }`}
              title="More options"
              aria-label="More options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-[100] min-w-[190px] py-1.5 bg-zinc-900/98 border border-zinc-700/60 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenSearch();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-zinc-200 hover:bg-zinc-800 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <span className="text-xs font-medium">Search Messages</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
