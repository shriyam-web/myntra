import React, { useState } from "react";
import { Theme } from "../types";

interface FloatingWidgetProps {
  activeTheme: Theme;
  onDeleteChat: () => void;
  onChangeTheme: () => void;
  onViewMedia: () => void;
}

export const FloatingWidget: React.FC<FloatingWidgetProps> = ({
  activeTheme,
  onDeleteChat,
  onChangeTheme,
  onViewMedia,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-24 left-6 z-[100] flex flex-col items-start gap-3">
      {/* Expanded Menu */}
      {isOpen && (
        <div className="flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => {
              onViewMedia();
              setIsOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all shadow-2xl group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span className="text-[10px] font-black uppercase tracking-widest transition-opacity">Media Gallery</span>
          </button>

          <button
            onClick={() => {
              onChangeTheme();
              setIsOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all shadow-2xl group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
            <span className="text-[10px] font-black uppercase tracking-widest transition-opacity">Wallpaper & Theme</span>
          </button>

          <button
            onClick={() => {
              onDeleteChat();
              setIsOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 bg-red-950/20 border border-red-900/20 rounded-2xl text-red-500 hover:bg-red-900/40 transition-all shadow-2xl group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            <span className="text-[10px] font-black uppercase tracking-widest transition-opacity">Delete Chat</span>
          </button>
        </div>
      )}

      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 border-4 border-zinc-950 ${
          isOpen ? "bg-zinc-800 text-white rotate-45" : `${activeTheme.bubbleMe} text-white`
        }`}
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
  );
};
