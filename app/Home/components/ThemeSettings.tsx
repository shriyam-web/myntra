import React from "react";
import { Theme, Wallpaper } from "../types";

interface ThemeSettingsProps {
  showThemeSettings: boolean;
  setShowThemeSettings: (show: boolean) => void;
  themes: Theme[];
  themeName: string;
  setThemeName: (name: string) => void;
  wallpapers: Wallpaper[];
  chatWallpaper: string;
  setChatWallpaper: (wallpaper: string) => void;
  chatBgColor: string;
  setChatBgColor: (color: string) => void;
  chatBubbleColor: string;
  setChatBubbleColor: (color: string) => void;
  handleUpdateChatPreferences: (updates: { chatBackgroundColor?: string; chatBubbleColor?: string }) => void;
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({
  showThemeSettings,
  setShowThemeSettings,
  themes,
  themeName,
  setThemeName,
  wallpapers,
  chatWallpaper,
  setChatWallpaper,
  chatBgColor,
  setChatBgColor,
  chatBubbleColor,
  setChatBubbleColor,
  handleUpdateChatPreferences,
}) => {
  if (!showThemeSettings) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-3xl animate-in fade-in duration-500">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-500">
        <div className="p-8 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/20">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-1">
              Interface Config
            </h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
              System Visual Environment
            </p>
          </div>
          <button
            onClick={() => setShowThemeSettings(false)}
            className="p-4 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all active:scale-90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
          {/* Themes */}
          <section className="space-y-6">
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] px-1">
              Core Presets
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((t) => (
                <button
                  key={t.name}
                  onClick={() => {
                    setThemeName(t.name);
                    setChatBgColor(t.bg);
                    setChatBubbleColor(t.bubbleMe);
                    handleUpdateChatPreferences({
                      chatBackgroundColor: t.bg,
                      chatBubbleColor: t.bubbleMe,
                    });
                  }}
                  className={`relative p-5 rounded-3xl border transition-all duration-300 group overflow-hidden ${
                    themeName === t.name ? "border-white bg-zinc-900" : "border-zinc-800/50 bg-zinc-950 hover:border-zinc-700"
                  }`}
                >
                  <div className={`absolute inset-0 opacity-10 ${t.bg}`}></div>
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`w-3 h-3 rounded-full ${t.bubbleMe} shadow-lg shadow-black/20`}></div>
                    <span className={`text-xs font-black uppercase tracking-wider ${themeName === t.name ? "text-white" : "text-zinc-500"}`}>
                      {t.name}
                    </span>
                  </div>
                  {themeName === t.name && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-white rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Wallpapers */}
          <section className="space-y-6">
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] px-1">
              Visual Overlays
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {wallpapers.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setChatWallpaper(w.value)}
                  className={`relative aspect-square rounded-2xl border flex items-center justify-center transition-all group overflow-hidden ${
                    chatWallpaper === w.value ? "border-white scale-95" : "border-zinc-800/50 hover:border-zinc-700 active:scale-90"
                  }`}
                  title={w.name}
                >
                  {w.type === "image" ? (
                    <img src={w.value} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                  ) : w.value === "" ? (
                    <span className="text-[9px] font-black text-zinc-700 uppercase">None</span>
                  ) : (
                    <span className="text-xl group-hover:scale-125 transition-transform duration-500">
                      {w.value}
                    </span>
                  )}
                  {chatWallpaper === w.value && (
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]"></div>
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="p-8 bg-zinc-900/20 border-t border-zinc-900">
           <button 
              onClick={() => setShowThemeSettings(false)}
              className="w-full py-5 bg-white text-black rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5"
           >
              Update Environment
           </button>
        </div>
      </div>
    </div>
  );
};
