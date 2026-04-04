import { Theme, Wallpaper } from "./types";

export const wallpapers: Wallpaper[] = [
  { id: "none", name: "None", value: "", type: "emoji" },
  { id: "bubbles", name: "Bubbles", value: "🫧", type: "emoji" },
  { id: "stars", name: "Stars", value: "✨", type: "emoji" },
  { id: "hearts", name: "Hearts", value: "💖", type: "emoji" },
  { id: "flowers", name: "Sakura", value: "🌸", type: "emoji" },
  { id: "butterflies", name: "Butterflies", value: "🦋", type: "emoji" },
  { id: "nature", name: "Nature", value: "🌴", type: "emoji" },
  { id: "snow", name: "Snow", value: "❄️", type: "emoji" },
  { id: "abstract-1", name: "Nebula", value: "🌌", type: "emoji" },
  { id: "abstract-2", name: "Cloud", value: "☁️", type: "emoji" },
  { id: "abstract-3", name: "Moon", value: "🌙", type: "emoji" },
  { id: "scenery-1", name: "Night Sky", value: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1200&q=80", type: "image" },
  { id: "scenery-2", name: "Forest Path", value: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80", type: "image" },
  { id: "scenery-3", name: "Ocean Waves", value: "https://images.unsplash.com/photo-1439405326854-014607f694d7?auto=format&fit=crop&w=1200&q=80", type: "image" },
  { id: "scenery-4", name: "Mountain Peak", value: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80", type: "image" },
  { id: "scenery-5", name: "Desert Dunes", value: "https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&w=1200&q=80", type: "image" },
  { id: "scenery-6", name: "Sunset Beach", value: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80", type: "image" },
  { id: "scenery-7", name: "City Lights", value: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80", type: "image" },
  { id: "scenery-8", name: "Aurora", value: "https://images.unsplash.com/photo-1531366930477-4f1f27f3c30b?auto=format&fit=crop&w=1200&q=80", type: "image" },
];

export const themes: Theme[] = [
  { name: "Midnight (Default)", bg: "bg-zinc-900/50", bubbleMe: "bg-indigo-600", bubblePartner: "bg-zinc-800/80", accent: "text-indigo-400", shadow: "shadow-indigo-500/10", glow: "bg-indigo-500/5" },
  { name: "Forest", bg: "bg-emerald-950/40", bubbleMe: "bg-emerald-700", bubblePartner: "bg-zinc-900/80", accent: "text-emerald-400", shadow: "shadow-emerald-500/10", glow: "bg-emerald-500/5" },
  { name: "Volcano", bg: "bg-red-950/40", bubbleMe: "bg-red-700", bubblePartner: "bg-zinc-900/80", accent: "text-red-400", shadow: "shadow-red-500/10", glow: "bg-red-500/5" },
  { name: "Ocean", bg: "bg-blue-950/40", bubbleMe: "bg-blue-700", bubblePartner: "bg-zinc-900/80", accent: "text-blue-400", shadow: "shadow-blue-500/10", glow: "bg-blue-500/5" },
  { name: "Purple Rain", bg: "bg-purple-950/40", bubbleMe: "bg-purple-700", bubblePartner: "bg-zinc-900/80", accent: "text-purple-400", shadow: "shadow-purple-500/10", glow: "bg-purple-500/5" },
  { name: "Cyberpunk", bg: "bg-pink-950/40", bubbleMe: "bg-pink-600", bubblePartner: "bg-zinc-900/80", accent: "text-pink-400", shadow: "shadow-pink-500/10", glow: "bg-pink-500/5" },
  { name: "Golden Hour", bg: "bg-amber-950/40", bubbleMe: "bg-amber-600", bubblePartner: "bg-zinc-900/80", accent: "text-amber-400", shadow: "shadow-amber-500/10", glow: "bg-amber-500/5" },
  { name: "Nordic", bg: "bg-slate-900/50", bubbleMe: "bg-slate-700", bubblePartner: "bg-zinc-800/80", accent: "text-slate-400", shadow: "shadow-slate-500/10", glow: "bg-slate-500/5" },
  { name: "Rose Quartz", bg: "bg-rose-950/40", bubbleMe: "bg-rose-600", bubblePartner: "bg-zinc-900/80", accent: "text-rose-400", shadow: "shadow-rose-500/10", glow: "bg-rose-500/5" },
  { name: "Toxic", bg: "bg-lime-950/40", bubbleMe: "bg-lime-600", bubblePartner: "bg-zinc-900/80", accent: "text-lime-400", shadow: "shadow-lime-500/10", glow: "bg-lime-500/5" },
  { name: "Sakura", bg: "bg-fuchsia-950/40", bubbleMe: "bg-fuchsia-600", bubblePartner: "bg-zinc-900/80", accent: "text-fuchsia-400", shadow: "shadow-fuchsia-500/10", glow: "bg-fuchsia-500/5" },
  { name: "Ghost", bg: "bg-zinc-950/80", bubbleMe: "bg-white", bubblePartner: "bg-zinc-800/80", accent: "text-white", shadow: "shadow-white/5", glow: "bg-white/5", textMe: "text-black" },
];
