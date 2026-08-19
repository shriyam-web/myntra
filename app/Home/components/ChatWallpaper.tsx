import React from "react";
import { Wallpaper } from "../types";

interface ChatWallpaperProps {
  wallpaperValue: string;
  wallpapers: Wallpaper[];
}

function isRemoteUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

export const ChatWallpaper: React.FC<ChatWallpaperProps> = ({
  wallpaperValue,
  wallpapers,
}) => {
  if (!wallpaperValue || isRemoteUrl(wallpaperValue)) return null;

  const wallpaper = wallpapers.find((w) => w.value === wallpaperValue);

  if (wallpaper?.type === "gradient" || wallpaperValue.startsWith("gradient:")) {
    const gradient = wallpaperValue.replace(/^gradient:/, "");
    return (
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-80" style={{ background: gradient }} />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/35 via-transparent to-zinc-950/50" />
      </div>
    );
  }

  if (wallpaper?.type === "animated") {
    const gradient = wallpaperValue.replace(/^animated:/, "");
    return (
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-75 chat-wallpaper-animated"
          style={{ background: gradient }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/30 via-transparent to-zinc-950/50" />
      </div>
    );
  }

  if (
    wallpaper?.type === "emoji" ||
    (wallpaperValue.startsWith("emoji:") ||
      (!wallpaperValue.startsWith("/") &&
        !wallpaperValue.includes("gradient") &&
        wallpaperValue.length <= 4))
  ) {
    const emoji = wallpaper?.preview || wallpaperValue.replace(/^emoji:/, "") || wallpaperValue;
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.32]">
        <div className="absolute -inset-[40%] grid grid-cols-8 sm:grid-cols-10 gap-3 sm:gap-4 rotate-[-18deg] scale-125 chat-wallpaper-drift">
          {Array.from({ length: 80 }).map((_, i) => (
            <span
              key={i}
              className="text-xl sm:text-2xl text-center select-none"
              style={{
                opacity: 0.35 + (i % 5) * 0.12,
                transform: `scale(${0.85 + (i % 4) * 0.1})`,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (wallpaper?.type === "image" || wallpaperValue.startsWith("/wallpapers/")) {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src={wallpaperValue}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-105 chat-wallpaper-kenburns"
        />
        <div className="absolute inset-0 bg-zinc-950/28" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/45 via-transparent to-zinc-950/60" />
      </div>
    );
  }

  return null;
};
