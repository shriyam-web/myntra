import React from "react";
import { Wallpaper } from "../types";

interface ChatWallpaperProps {
  wallpaperValue: string;
  wallpapers: Wallpaper[];
}

export const ChatWallpaper: React.FC<ChatWallpaperProps> = ({
  wallpaperValue,
  wallpapers,
}) => {
  if (!wallpaperValue) return null;

  const wallpaper = wallpapers.find((w) => w.value === wallpaperValue);

  if (wallpaper?.type === "gradient" || wallpaperValue.startsWith("gradient:")) {
    const gradient = wallpaperValue.replace(/^gradient:/, "");
    return (
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{ background: gradient }}
      />
    );
  }

  if (wallpaper?.type === "animated") {
    const gradient = wallpaperValue.replace(/^animated:/, "");
    return (
      <div
        className="absolute inset-0 pointer-events-none opacity-55 chat-wallpaper-animated"
        style={{ background: gradient }}
      />
    );
  }

  if (wallpaper?.type === "emoji" || (wallpaperValue.startsWith("emoji:") || (!wallpaperValue.startsWith("http") && !wallpaperValue.includes("gradient") && wallpaperValue.length <= 4))) {
    const emoji = wallpaper?.preview || wallpaperValue.replace(/^emoji:/, "") || wallpaperValue;
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.22]">
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

  if (wallpaper?.type === "image" || wallpaperValue.startsWith("http")) {
    return (
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.38]"
        style={{
          backgroundImage: `url(${wallpaperValue})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    );
  }

  return null;
};
