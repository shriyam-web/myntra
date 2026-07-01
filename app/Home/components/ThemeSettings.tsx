"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  handleUpdateChatPreferences: (updates: {
    chatBackgroundColor?: string;
    chatBubbleColor?: string;
    themeName?: string;
    chatWallpaper?: string;
  }) => void;
}

const THEME_SECTIONS: { key: NonNullable<Theme["mood"]>; label: string }[] = [
  { key: "love", label: "Love & Romance" },
  { key: "peaceful", label: "Peaceful & Calm" },
  { key: "dark", label: "Dark & Moody" },
  { key: "signature", label: "Signature Vibes" },
];

const WALLPAPER_SECTIONS: { key: Wallpaper["category"]; label: string }[] = [
  { key: "love", label: "Love Atmosphere" },
  { key: "peaceful", label: "Peaceful Escape" },
  { key: "gradient", label: "Mood Gradients" },
  { key: "wild", label: "Wild Accents" },
];

function WallpaperPreview({ wallpaper }: { wallpaper: Wallpaper }) {
  if (wallpaper.value === "") {
    return <span className="text-[9px] font-black text-zinc-700 uppercase">None</span>;
  }

  if (wallpaper.type === "image") {
    return (
      <img
        src={wallpaper.value}
        alt={wallpaper.name}
        loading="lazy"
        className="w-full h-full object-cover opacity-80"
      />
    );
  }

  if (wallpaper.type === "gradient" || wallpaper.type === "animated") {
    const gradient = wallpaper.value.replace(/^(gradient|animated):/, "");
    return (
      <div
        className="w-full h-full"
        style={{ background: gradient }}
      />
    );
  }

  return (
    <span className="text-xl sm:text-2xl">
      {wallpaper.preview || wallpaper.value.replace(/^emoji:/, "")}
    </span>
  );
}

function ThemeCard({
  theme,
  isSelected,
  onSelect,
}: {
  theme: Theme;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative p-3 sm:p-4 rounded-2xl sm:rounded-3xl border transition-colors duration-200 overflow-hidden text-left ${
        isSelected
          ? "border-white bg-zinc-900 ring-1 ring-white/20"
          : "border-zinc-800/50 bg-zinc-950 hover:border-zinc-700"
      }`}
    >
      <div className={`absolute inset-0 opacity-25 ${theme.bg}`} />
      {theme.glow && <div className={`absolute inset-0 opacity-35 ${theme.glow}`} />}
      <div className="flex items-center gap-2 relative z-10 min-w-0">
        <div className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 rounded-full ${theme.bubbleMe} shadow-lg ${theme.shadow ?? ""}`} />
        <span
          className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider leading-tight truncate ${
            isSelected ? "text-white" : "text-zinc-500"
          }`}
        >
          {theme.name}
        </span>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-white rounded-full" />
      )}
    </button>
  );
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
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdatesRef = useRef<{
    chatBackgroundColor?: string;
    chatBubbleColor?: string;
    themeName?: string;
    chatWallpaper?: string;
  }>({});

  const flushSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const pending = pendingUpdatesRef.current;
    if (Object.keys(pending).length > 0) {
      handleUpdateChatPreferences(pending);
      pendingUpdatesRef.current = {};
    }
  }, [handleUpdateChatPreferences]);

  const queueSave = useCallback(
    (updates: {
      chatBackgroundColor?: string;
      chatBubbleColor?: string;
      themeName?: string;
      chatWallpaper?: string;
    }) => {
      pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;
        const pending = pendingUpdatesRef.current;
        pendingUpdatesRef.current = {};
        handleUpdateChatPreferences(pending);
      }, 450);
    },
    [handleUpdateChatPreferences]
  );

  const selectTheme = useCallback(
    (t: Theme) => {
      setThemeName(t.name);
      setChatBgColor(t.bg);
      setChatBubbleColor(t.bubbleMe);
      queueSave({
        chatBackgroundColor: t.bg,
        chatBubbleColor: t.bubbleMe,
        themeName: t.name,
      });
    },
    [queueSave, setChatBgColor, setChatBubbleColor, setThemeName]
  );

  const selectWallpaper = useCallback(
    (value: string) => {
      setChatWallpaper(value);
      queueSave({ chatWallpaper: value });
    },
    [queueSave, setChatWallpaper]
  );

  const closeModal = useCallback(() => {
    flushSave();
    setShowThemeSettings(false);
  }, [flushSave, setShowThemeSettings]);

  useEffect(() => {
    if (!showThemeSettings) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [showThemeSettings]);

  if (!showThemeSettings || typeof document === "undefined") return null;

  const classicThemes = themes.filter((t) => !t.mood);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 md:p-6 bg-black/85 theme-settings-overlay"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-settings-title"
    >
      <div
        className="w-full sm:max-w-lg bg-zinc-950 border border-zinc-800 sm:border-zinc-800 rounded-t-[1.75rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[min(92dvh,100%)] sm:h-auto sm:max-h-[min(88dvh,720px)] theme-settings-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-4 py-4 sm:px-6 sm:py-5 border-b border-zinc-900 flex justify-between items-center gap-3 bg-zinc-900/20">
          <div className="min-w-0">
            <h2
              id="theme-settings-title"
              className="text-base sm:text-xl font-black text-white uppercase tracking-widest mb-0.5 truncate"
            >
              Chat Atmosphere
            </h2>
            <p className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] sm:tracking-[0.2em]">
              Love · calm · dark · dreamy
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="shrink-0 p-3 sm:p-4 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors active:scale-95"
            aria-label="Close theme settings"
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

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6 space-y-7 sm:space-y-10 no-scrollbar">
          {THEME_SECTIONS.map((section) => {
            const sectionThemes = themes.filter((t) => t.mood === section.key);
            if (sectionThemes.length === 0) return null;

            return (
              <section key={section.key} className="space-y-3 sm:space-y-4">
                <h3 className="text-[9px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] sm:tracking-[0.4em] px-1">
                  {section.label}
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {sectionThemes.map((t) => (
                    <ThemeCard
                      key={t.name}
                      theme={t}
                      isSelected={themeName === t.name}
                      onSelect={() => selectTheme(t)}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {classicThemes.length > 0 && (
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-[9px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] sm:tracking-[0.4em] px-1">
                Classic
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {classicThemes.map((t) => (
                  <ThemeCard
                    key={t.name}
                    theme={t}
                    isSelected={themeName === t.name}
                    onSelect={() => selectTheme(t)}
                  />
                ))}
              </div>
            </section>
          )}

          {WALLPAPER_SECTIONS.map((section) => {
            const sectionWallpapers = wallpapers.filter(
              (w) => w.category === section.key || (section.key === "love" && w.id === "none")
            );
            if (sectionWallpapers.length === 0) return null;

            return (
              <section key={section.key} className="space-y-3 sm:space-y-4">
                <h3 className="text-[9px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] sm:tracking-[0.4em] px-1">
                  {section.label}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                  {sectionWallpapers.map((w) => {
                    const isSelected = chatWallpaper === w.value;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => selectWallpaper(w.value)}
                        className={`relative aspect-square rounded-xl sm:rounded-2xl border flex flex-col items-center justify-center overflow-hidden transition-colors duration-200 ${
                          isSelected
                            ? "border-white ring-2 ring-white/30 bg-zinc-900"
                            : "border-zinc-800/50 hover:border-zinc-600 active:opacity-80"
                        }`}
                        title={w.name}
                      >
                        <WallpaperPreview wallpaper={w} />
                        {w.name !== "None" && (
                          <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[6px] sm:text-[7px] font-bold uppercase tracking-wider text-zinc-300 py-0.5 sm:py-1 px-0.5 truncate text-center">
                            {w.name}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="shrink-0 px-4 py-4 sm:px-6 sm:py-5 bg-zinc-900/20 border-t border-zinc-900 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={closeModal}
            className="w-full py-4 sm:py-5 bg-white text-black rounded-2xl sm:rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-colors active:scale-[0.98]"
          >
            Lock It In
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
