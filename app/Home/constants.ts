import { Theme, Wallpaper, ReactionType } from "./types";

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  sad: "😢",
  love: "❤️",
  funny: "😂",
  confused: "😕",
  angry: "😠",
};

export const REACTION_OPTIONS: { type: ReactionType; label: string }[] = [
  { type: "love", label: "Love" },
  { type: "funny", label: "Funny" },
  { type: "sad", label: "Sad" },
  { type: "confused", label: "Confused" },
  { type: "angry", label: "Angry" },
];

export const wallpapers: Wallpaper[] = [
  { id: "none", name: "None", value: "", type: "emoji", category: "pattern" },

  // Wild emoji patterns
  { id: "hearts", name: "Love Storm", value: "emoji:💖", type: "emoji", preview: "💖", category: "wild" },
  { id: "fire", name: "On Fire", value: "emoji:🔥", type: "emoji", preview: "🔥", category: "wild" },
  { id: "sparkles", name: "Stardust", value: "emoji:✨", type: "emoji", preview: "✨", category: "wild" },
  { id: "kiss", name: "Kisses", value: "emoji:💋", type: "emoji", preview: "💋", category: "wild" },
  { id: "party", name: "Party Mode", value: "emoji:🎉", type: "emoji", preview: "🎉", category: "wild" },
  { id: "skull", name: "Chaos", value: "emoji:💀", type: "emoji", preview: "💀", category: "wild" },
  { id: "alien", name: "Alien Invasion", value: "emoji:👾", type: "emoji", preview: "👾", category: "wild" },
  { id: "lightning", name: "Electric", value: "emoji:⚡", type: "emoji", preview: "⚡", category: "wild" },
  { id: "rainbow", name: "Rainbow", value: "emoji:🌈", type: "emoji", preview: "🌈", category: "wild" },
  { id: "cherry", name: "Cherry Pop", value: "emoji:🍒", type: "emoji", preview: "🍒", category: "wild" },
  { id: "butterflies", name: "Butterflies", value: "emoji:🦋", type: "emoji", preview: "🦋", category: "pattern" },
  { id: "bubbles", name: "Bubbles", value: "emoji:🫧", type: "emoji", preview: "🫧", category: "pattern" },
  { id: "flowers", name: "Sakura", value: "emoji:🌸", type: "emoji", preview: "🌸", category: "pattern" },
  { id: "moon", name: "Moonlight", value: "emoji:🌙", type: "emoji", preview: "🌙", category: "pattern" },
  { id: "snow", name: "Blizzard", value: "emoji:❄️", type: "emoji", preview: "❄️", category: "pattern" },

  // Animated gradients
  {
    id: "anim-neon",
    name: "Neon Pulse",
    value: "animated:linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)",
    type: "animated",
    category: "gradient",
  },
  {
    id: "anim-sunset",
    name: "Sunset Rave",
    value: "animated:linear-gradient(-45deg, #ff0844, #ffb199, #ff6a00, #ee0979)",
    type: "animated",
    category: "gradient",
  },
  {
    id: "anim-aurora",
    name: "Aurora Wave",
    value: "animated:linear-gradient(-45deg, #0ff0b3, #036ee7, #8e2de2, #4a00e0)",
    type: "animated",
    category: "gradient",
  },
  {
    id: "anim-candy",
    name: "Candy Rush",
    value: "animated:linear-gradient(-45deg, #f953c6, #b91d73, #ff6fd8, #3813c2)",
    type: "animated",
    category: "gradient",
  },

  // Static gradients
  {
    id: "grad-holographic",
    name: "Holographic",
    value: "gradient:linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #fda085 100%)",
    type: "gradient",
    category: "gradient",
  },
  {
    id: "grad-midnight-city",
    name: "Midnight City",
    value: "gradient:linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    type: "gradient",
    category: "gradient",
  },
  {
    id: "grad-lava",
    name: "Lava Lamp",
    value: "gradient:linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
    type: "gradient",
    category: "gradient",
  },
  {
    id: "grad-ocean-neon",
    name: "Neon Ocean",
    value: "gradient:linear-gradient(135deg, #00d2ff 0%, #3a7bd5 50%, #00d2ff 100%)",
    type: "gradient",
    category: "gradient",
  },
  {
    id: "grad-toxic",
    name: "Toxic Glow",
    value: "gradient:linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    type: "gradient",
    category: "gradient",
  },
  {
    id: "grad-berry",
    name: "Berry Blast",
    value: "gradient:linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
    type: "gradient",
    category: "gradient",
  },

  // Scene wallpapers
  { id: "scene-neon", name: "Neon Tokyo", value: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80", type: "image", category: "scene" },
  { id: "scene-synth", name: "Synthwave", value: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&w=1200&q=80", type: "image", category: "scene" },
  { id: "scene-galaxy", name: "Deep Galaxy", value: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=80", type: "image", category: "scene" },
  { id: "scene-fireworks", name: "Fireworks", value: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80", type: "image", category: "scene" },
  { id: "scene-aurora", name: "Northern Lights", value: "https://images.unsplash.com/photo-1531366930477-4f1f27f3c30b?auto=format&fit=crop&w=1200&q=80", type: "image", category: "scene" },
  { id: "scene-tropical", name: "Tropical Paradise", value: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80", type: "image", category: "scene" },
  { id: "scene-cherry", name: "Cherry Blossom", value: "https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=1200&q=80", type: "image", category: "scene" },
  { id: "scene-liquid", name: "Liquid Art", value: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80", type: "image", category: "scene" },
  { id: "scene-cosmic", name: "Cosmic Dust", value: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1200&q=80", type: "image", category: "scene" },
  { id: "scene-nebula", name: "Nebula", value: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1200&q=80", type: "image", category: "scene" },
];

export const themes: Theme[] = [
  { name: "Midnight (Default)", bg: "bg-zinc-900/50", bubbleMe: "bg-indigo-600", bubblePartner: "bg-zinc-800/80", accent: "text-indigo-400", shadow: "shadow-indigo-500/20", glow: "bg-indigo-500/10" },
  { name: "Neon Tokyo", bg: "bg-fuchsia-950/50", bubbleMe: "bg-gradient-to-br from-pink-500 to-fuchsia-600", bubblePartner: "bg-violet-950/90", accent: "text-pink-400", shadow: "shadow-pink-500/30", glow: "bg-pink-500/10" },
  { name: "Electric Violet", bg: "bg-violet-950/50", bubbleMe: "bg-violet-600", bubblePartner: "bg-indigo-950/90", accent: "text-violet-300", shadow: "shadow-violet-500/30", glow: "bg-violet-500/15" },
  { name: "Sunset Rave", bg: "bg-orange-950/45", bubbleMe: "bg-gradient-to-br from-orange-500 to-rose-600", bubblePartner: "bg-rose-950/85", accent: "text-orange-300", shadow: "shadow-orange-500/30", glow: "bg-orange-500/10" },
  { name: "Lava Flow", bg: "bg-red-950/50", bubbleMe: "bg-gradient-to-br from-red-600 to-orange-500", bubblePartner: "bg-stone-950/90", accent: "text-red-400", shadow: "shadow-red-500/30", glow: "bg-red-500/10" },
  { name: "Mint Shock", bg: "bg-teal-950/45", bubbleMe: "bg-gradient-to-br from-teal-400 to-emerald-500", bubblePartner: "bg-slate-950/90", accent: "text-teal-300", shadow: "shadow-teal-500/30", glow: "bg-teal-500/10", textMe: "text-black" },
  { name: "Cherry Bomb", bg: "bg-rose-950/50", bubbleMe: "bg-gradient-to-br from-rose-500 to-red-600", bubblePartner: "bg-zinc-950/90", accent: "text-rose-400", shadow: "shadow-rose-500/30", glow: "bg-rose-500/10" },
  { name: "Galaxy Pop", bg: "bg-indigo-950/55", bubbleMe: "bg-gradient-to-br from-indigo-500 to-purple-600", bubblePartner: "bg-slate-900/90", accent: "text-indigo-300", shadow: "shadow-indigo-500/30", glow: "bg-purple-500/10" },
  { name: "Matrix Rain", bg: "bg-black/70", bubbleMe: "bg-green-600", bubblePartner: "bg-green-950/80", accent: "text-green-400", shadow: "shadow-green-500/30", glow: "bg-green-500/10" },
  { name: "Candy Crush", bg: "bg-pink-950/45", bubbleMe: "bg-gradient-to-br from-pink-400 to-yellow-400", bubblePartner: "bg-purple-950/85", accent: "text-pink-300", shadow: "shadow-pink-500/30", glow: "bg-yellow-500/10", textMe: "text-black" },
  { name: "Disco Nights", bg: "bg-purple-950/50", bubbleMe: "bg-gradient-to-br from-yellow-400 to-amber-500", bubblePartner: "bg-violet-950/90", accent: "text-yellow-300", shadow: "shadow-yellow-500/30", glow: "bg-amber-500/10", textMe: "text-black" },
  { name: "Arctic Glow", bg: "bg-cyan-950/45", bubbleMe: "bg-gradient-to-br from-cyan-400 to-blue-500", bubblePartner: "bg-slate-950/90", accent: "text-cyan-300", shadow: "shadow-cyan-500/30", glow: "bg-cyan-500/10", textMe: "text-black" },
  { name: "Holographic", bg: "bg-slate-900/50", bubbleMe: "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400", bubblePartner: "bg-zinc-900/90", accent: "text-fuchsia-300", shadow: "shadow-fuchsia-500/30", glow: "bg-violet-500/10" },
  { name: "Cyberpunk", bg: "bg-pink-950/50", bubbleMe: "bg-gradient-to-br from-pink-500 to-cyan-500", bubblePartner: "bg-zinc-950/90", accent: "text-cyan-400", shadow: "shadow-pink-500/30", glow: "bg-cyan-500/10" },
  { name: "Toxic Glow", bg: "bg-lime-950/45", bubbleMe: "bg-lime-500", bubblePartner: "bg-green-950/90", accent: "text-lime-400", shadow: "shadow-lime-500/30", glow: "bg-lime-500/10", textMe: "text-black" },
  { name: "Ocean Deep", bg: "bg-blue-950/50", bubbleMe: "bg-gradient-to-br from-blue-500 to-cyan-600", bubblePartner: "bg-slate-950/90", accent: "text-blue-300", shadow: "shadow-blue-500/30", glow: "bg-blue-500/10" },
  { name: "Golden Hour", bg: "bg-amber-950/45", bubbleMe: "bg-gradient-to-br from-amber-400 to-orange-500", bubblePartner: "bg-stone-950/90", accent: "text-amber-300", shadow: "shadow-amber-500/30", glow: "bg-amber-500/10", textMe: "text-black" },
  { name: "Ghost", bg: "bg-zinc-950/80", bubbleMe: "bg-white", bubblePartner: "bg-zinc-800/80", accent: "text-white", shadow: "shadow-white/10", glow: "bg-white/5", textMe: "text-black" },
];
