import { Theme, Wallpaper, ReactionType } from "./types";

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  love: "❤️",
  adore: "🥰",
  kiss: "💋",
  hearteyes: "😍",
  hug: "🤗",
  rose: "🌹",
  fire: "🔥",
  sparkle: "✨",
  funny: "😂",
  missyou: "🥺",
  sad: "😢",
  confused: "😕",
  angry: "😠",
};

export const REACTION_OPTIONS: { type: ReactionType; label: string }[] = [
  { type: "love", label: "Love" },
  { type: "adore", label: "Adore" },
  { type: "kiss", label: "Kiss" },
  { type: "hearteyes", label: "Heart Eyes" },
  { type: "hug", label: "Hug" },
  { type: "rose", label: "Rose" },
  { type: "fire", label: "Fire" },
  { type: "sparkle", label: "Sparkle" },
  { type: "funny", label: "Funny" },
  { type: "missyou", label: "Miss You" },
  { type: "sad", label: "Sad" },
  { type: "confused", label: "Confused" },
  { type: "angry", label: "Angry" },
];

export const wallpapers: Wallpaper[] = [
  { id: "none", name: "None", value: "", type: "emoji", category: "pattern" },

  // Love patterns
  { id: "love-hearts", name: "Heartfall", value: "emoji:💕", type: "emoji", preview: "💕", category: "love" },
  { id: "love-couple", name: "Together", value: "emoji:💑", type: "emoji", preview: "💑", category: "love" },
  { id: "love-kiss", name: "Kisses", value: "emoji:💋", type: "emoji", preview: "💋", category: "love" },
  { id: "love-sparkle", name: "In Love", value: "emoji:💖", type: "emoji", preview: "💖", category: "love" },
  { id: "love-rose", name: "Roses", value: "emoji:🌹", type: "emoji", preview: "🌹", category: "love" },
  { id: "love-letter", name: "Love Notes", value: "emoji:💌", type: "emoji", preview: "💌", category: "love" },
  { id: "love-ring", name: "Forever", value: "emoji:💍", type: "emoji", preview: "💍", category: "love" },
  { id: "love-butterfly", name: "Butterflies", value: "emoji:🦋", type: "emoji", preview: "🦋", category: "love" },

  // Peaceful patterns
  { id: "peace-dove", name: "Serenity", value: "emoji:🕊️", type: "emoji", preview: "🕊️", category: "peaceful" },
  { id: "peace-cloud", name: "Cloud Drift", value: "emoji:☁️", type: "emoji", preview: "☁️", category: "peaceful" },
  { id: "peace-leaf", name: "Gentle Breeze", value: "emoji:🍃", type: "emoji", preview: "🍃", category: "peaceful" },
  { id: "peace-wave", name: "Calm Waves", value: "emoji:🌊", type: "emoji", preview: "🌊", category: "peaceful" },
  { id: "peace-moon", name: "Moonlight", value: "emoji:🌙", type: "emoji", preview: "🌙", category: "peaceful" },
  { id: "peace-sakura", name: "Sakura", value: "emoji:🌸", type: "emoji", preview: "🌸", category: "peaceful" },
  { id: "peace-snow", name: "Soft Snow", value: "emoji:❄️", type: "emoji", preview: "❄️", category: "peaceful" },
  { id: "peace-bubble", name: "Bubbles", value: "emoji:🫧", type: "emoji", preview: "🫧", category: "peaceful" },

  // Living gradients — love
  {
    id: "anim-rose-breath",
    name: "Rose Breath",
    value: "animated:linear-gradient(-45deg, #4a1942, #7d2e5c, #9b4d6a, #6b2d5b)",
    type: "animated",
    category: "love",
  },
  {
    id: "anim-blush",
    name: "Blush Glow",
    value: "animated:linear-gradient(-45deg, #3d1f2b, #5c2a3d, #7a3a52, #4a2535)",
    type: "animated",
    category: "love",
  },
  {
    id: "grad-velvet",
    name: "Velvet Night",
    value: "gradient:linear-gradient(160deg, #1a0a12 0%, #2d1520 45%, #1f1018 100%)",
    type: "gradient",
    category: "love",
  },
  {
    id: "grad-wine",
    name: "Wine & Roses",
    value: "gradient:linear-gradient(135deg, #2b0f1a 0%, #4a1c2e 50%, #2a121c 100%)",
    type: "gradient",
    category: "love",
  },

  // Living gradients — peaceful
  {
    id: "anim-aurora-calm",
    name: "Aurora Calm",
    value: "animated:linear-gradient(-45deg, #0f2027, #203a43, #2c5364, #1a3340)",
    type: "animated",
    category: "peaceful",
  },
  {
    id: "anim-lavender-mist",
    name: "Lavender Mist",
    value: "animated:linear-gradient(-45deg, #1e1b2e, #2d2640, #3d3555, #252038)",
    type: "animated",
    category: "peaceful",
  },
  {
    id: "grad-sea-glass",
    name: "Sea Glass",
    value: "gradient:linear-gradient(160deg, #0d1f22 0%, #1a3338 50%, #0f2428 100%)",
    type: "gradient",
    category: "peaceful",
  },
  {
    id: "grad-forest-dusk",
    name: "Forest Dusk",
    value: "gradient:linear-gradient(135deg, #0f1a14 0%, #1a2e23 50%, #122019 100%)",
    type: "gradient",
    category: "peaceful",
  },

  // Moody gradients
  {
    id: "grad-midnight",
    name: "Midnight Veil",
    value: "gradient:linear-gradient(160deg, #0a0a0f 0%, #151520 50%, #0d0d14 100%)",
    type: "gradient",
    category: "gradient",
  },
  {
    id: "grad-cosmic",
    name: "Cosmic Hush",
    value: "gradient:linear-gradient(135deg, #0f0c1a 0%, #1a1530 50%, #12101f 100%)",
    type: "gradient",
    category: "gradient",
  },
  {
    id: "anim-deep-tide",
    name: "Deep Tide",
    value: "animated:linear-gradient(-45deg, #0c1445, #1a237e, #283593, #151b4a)",
    type: "animated",
    category: "gradient",
  },

  {
    id: "anim-sunset-wave",
    name: "Sunset Wave",
    value: "animated:linear-gradient(-45deg, #3b0a1a, #c2410c, #db2777, #7c3aed)",
    type: "animated",
    category: "love",
  },
  {
    id: "anim-candy",
    name: "Candy Drift",
    value: "animated:linear-gradient(-45deg, #4a044e, #db2777, #f472b6, #fb7185)",
    type: "animated",
    category: "love",
  },
  {
    id: "anim-tropic",
    name: "Tropic Glow",
    value: "animated:linear-gradient(-45deg, #042f2e, #0e7490, #22d3ee, #4ade80)",
    type: "animated",
    category: "peaceful",
  },
  {
    id: "anim-ice",
    name: "Ice Pulse",
    value: "animated:linear-gradient(-45deg, #082f49, #0369a1, #38bdf8, #a5f3fc)",
    type: "animated",
    category: "peaceful",
  },
  {
    id: "anim-neon-pulse",
    name: "Neon Pulse",
    value: "animated:linear-gradient(-45deg, #0f0c29, #302b63, #ff006e, #00f5d4)",
    type: "animated",
    category: "gradient",
  },
  {
    id: "anim-ember",
    name: "Ember Flow",
    value: "animated:linear-gradient(-45deg, #1a0505, #9a3412, #ea580c, #fbbf24)",
    type: "animated",
    category: "gradient",
  },
  {
    id: "grad-mango",
    name: "Mango Night",
    value: "gradient:linear-gradient(145deg, #1c0a00 0%, #9a3412 48%, #7c2d12 100%)",
    type: "gradient",
    category: "gradient",
  },
  {
    id: "grad-electric",
    name: "Electric Veil",
    value: "gradient:linear-gradient(160deg, #0b1026 0%, #4c1d95 50%, #0ea5e9 100%)",
    type: "gradient",
    category: "gradient",
  },

  // Wild accents
  { id: "wild-stars", name: "Stardust", value: "emoji:✨", type: "emoji", preview: "✨", category: "wild" },
  { id: "wild-fire", name: "Passion", value: "emoji:🔥", type: "emoji", preview: "🔥", category: "wild" },
  { id: "wild-rainbow", name: "Rainbow", value: "emoji:🌈", type: "emoji", preview: "🌈", category: "wild" },
  { id: "wild-spark", name: "Sparks", value: "emoji:🎆", type: "emoji", preview: "🎆", category: "wild" },
  { id: "wild-disco", name: "Disco", value: "emoji:🪩", type: "emoji", preview: "🪩", category: "wild" },

  // Local photo scenes — always served from this app, never remote URLs
  { id: "scene-roses", name: "Rose Light", value: "/wallpapers/roses.png", type: "image", category: "scene" },
  { id: "scene-dusk", name: "Golden Dusk", value: "/wallpapers/dusk.png", type: "image", category: "scene" },
  { id: "scene-aurora", name: "Aurora", value: "/wallpapers/aurora.png", type: "image", category: "scene" },
  { id: "scene-ocean", name: "Night Tide", value: "/wallpapers/ocean.png", type: "image", category: "scene" },
  { id: "scene-neon", name: "Neon Rain", value: "/wallpapers/neon-city.png", type: "image", category: "scene" },
  { id: "scene-nebula", name: "Nebula", value: "/wallpapers/nebula.png", type: "image", category: "scene" },
];

export const themes: Theme[] = [
  // Default
  { name: "Midnight (Default)", mood: "dark", bg: "bg-zinc-900/55", bubbleMe: "bg-indigo-700", bubblePartner: "bg-zinc-800/85", accent: "text-indigo-300", shadow: "shadow-indigo-500/15", glow: "bg-indigo-500/8" },

  // Love — soft, romantic, harmonious dark tones
  { name: "Velvet Rose", mood: "love", bg: "bg-rose-950/50", bubbleMe: "bg-rose-700", bubblePartner: "bg-rose-950/80", accent: "text-rose-300", shadow: "shadow-rose-500/15", glow: "bg-rose-500/8" },
  { name: "Blush Moon", mood: "love", bg: "bg-fuchsia-950/45", bubbleMe: "bg-fuchsia-800", bubblePartner: "bg-stone-900/85", accent: "text-fuchsia-300", shadow: "shadow-fuchsia-500/15", glow: "bg-fuchsia-500/8" },
  { name: "Sweetheart", mood: "love", bg: "bg-pink-950/50", bubbleMe: "bg-pink-700", bubblePartner: "bg-pink-950/75", accent: "text-pink-300", shadow: "shadow-pink-500/15", glow: "bg-pink-500/8" },
  { name: "Love Letter", mood: "love", bg: "bg-red-950/45", bubbleMe: "bg-red-800", bubblePartner: "bg-zinc-900/85", accent: "text-red-300", shadow: "shadow-red-500/15", glow: "bg-red-500/8" },
  { name: "Crimson Whisper", mood: "love", bg: "bg-rose-950/55", bubbleMe: "bg-gradient-to-br from-rose-700 to-rose-800", bubblePartner: "bg-stone-950/85", accent: "text-rose-300", shadow: "shadow-rose-500/15", glow: "bg-rose-600/8" },
  { name: "Candy Chat", mood: "love", bg: "bg-pink-950/40", bubbleMe: "bg-gradient-to-br from-pink-500 to-violet-600", bubblePartner: "bg-violet-950/75", accent: "text-pink-300", shadow: "shadow-pink-500/30", glow: "bg-pink-500/15" },
  { name: "Hot Ember", mood: "love", bg: "bg-orange-950/40", bubbleMe: "bg-gradient-to-br from-orange-500 to-rose-600", bubblePartner: "bg-zinc-900/80", accent: "text-orange-300", shadow: "shadow-orange-500/25", glow: "bg-orange-500/12" },
  { name: "Neon Kiss", mood: "love", bg: "bg-fuchsia-950/40", bubbleMe: "bg-fuchsia-600", bubblePartner: "bg-zinc-800/80", accent: "text-fuchsia-300", shadow: "shadow-fuchsia-500/30", glow: "bg-fuchsia-500/15" },

  // Peaceful — calm, muted, easy on the eyes
  { name: "Moonlit Calm", mood: "peaceful", bg: "bg-slate-950/55", bubbleMe: "bg-slate-600", bubblePartner: "bg-slate-800/90", accent: "text-slate-300", shadow: "shadow-slate-500/15", glow: "bg-slate-500/8" },
  { name: "Lavender Dream", mood: "peaceful", bg: "bg-violet-950/45", bubbleMe: "bg-violet-700", bubblePartner: "bg-violet-950/85", accent: "text-violet-300", shadow: "shadow-violet-500/15", glow: "bg-violet-500/8" },
  { name: "Forest Whisper", mood: "peaceful", bg: "bg-emerald-950/50", bubbleMe: "bg-emerald-800", bubblePartner: "bg-emerald-950/80", accent: "text-emerald-300", shadow: "shadow-emerald-500/15", glow: "bg-emerald-500/8" },
  { name: "Ocean Mist", mood: "peaceful", bg: "bg-sky-950/50", bubbleMe: "bg-sky-700", bubblePartner: "bg-slate-900/85", accent: "text-sky-300", shadow: "shadow-sky-500/15", glow: "bg-sky-500/8" },
  { name: "Zen Garden", mood: "peaceful", bg: "bg-stone-950/55", bubbleMe: "bg-stone-600", bubblePartner: "bg-stone-800/85", accent: "text-stone-300", shadow: "shadow-stone-500/15", glow: "bg-stone-500/8" },
  { name: "Electric Tide", mood: "peaceful", bg: "bg-cyan-950/40", bubbleMe: "bg-cyan-600", bubblePartner: "bg-slate-800/85", accent: "text-cyan-300", shadow: "shadow-cyan-500/25", glow: "bg-cyan-500/12" },
  { name: "Lime Night", mood: "peaceful", bg: "bg-emerald-950/40", bubbleMe: "bg-emerald-500", bubblePartner: "bg-zinc-800/85", accent: "text-emerald-300", shadow: "shadow-emerald-500/25", glow: "bg-emerald-500/12" },

  // Dark & moody — deep, cohesive, not harsh
  { name: "Phantom Night", mood: "dark", bg: "bg-zinc-950/70", bubbleMe: "bg-zinc-700", bubblePartner: "bg-zinc-900/90", accent: "text-zinc-300", shadow: "shadow-zinc-500/15", glow: "bg-zinc-500/8" },
  { name: "Eclipse", mood: "dark", bg: "bg-black/75", bubbleMe: "bg-indigo-800", bubblePartner: "bg-gray-900/90", accent: "text-indigo-300", shadow: "shadow-indigo-500/15", glow: "bg-indigo-500/8" },
  { name: "Deep Universe", mood: "dark", bg: "bg-indigo-950/60", bubbleMe: "bg-indigo-700", bubblePartner: "bg-indigo-950/90", accent: "text-indigo-300", shadow: "shadow-indigo-500/15", glow: "bg-indigo-600/8" },
  { name: "Charcoal Soul", mood: "dark", bg: "bg-neutral-950/65", bubbleMe: "bg-neutral-700", bubblePartner: "bg-neutral-900/88", accent: "text-neutral-300", shadow: "shadow-neutral-500/15", glow: "bg-neutral-500/8" },
  { name: "Obsidian", mood: "dark", bg: "bg-gray-950/70", bubbleMe: "bg-gray-700", bubblePartner: "bg-gray-900/90", accent: "text-gray-300", shadow: "shadow-gray-500/15", glow: "bg-gray-500/8" },
  { name: "Blue Flame", mood: "dark", bg: "bg-blue-950/50", bubbleMe: "bg-blue-500", bubblePartner: "bg-slate-800/90", accent: "text-blue-300", shadow: "shadow-blue-500/30", glow: "bg-blue-500/15" },
  { name: "Ghost", mood: "dark", bg: "bg-zinc-950/80", bubbleMe: "bg-zinc-200", bubblePartner: "bg-zinc-800/85", accent: "text-zinc-200", shadow: "shadow-white/8", glow: "bg-white/5", textMe: "text-black" },

  // Signature — special but still harmonious
  { name: "Aurora Romance", mood: "signature", bg: "bg-indigo-950/50", bubbleMe: "bg-gradient-to-br from-indigo-700 to-violet-800", bubblePartner: "bg-indigo-950/85", accent: "text-violet-300", shadow: "shadow-violet-500/15", glow: "bg-violet-500/8" },
  { name: "Golden Dusk", mood: "signature", bg: "bg-amber-950/45", bubbleMe: "bg-amber-800", bubblePartner: "bg-stone-900/85", accent: "text-amber-300", shadow: "shadow-amber-500/15", glow: "bg-amber-500/8" },
  { name: "Mauve Magic", mood: "signature", bg: "bg-purple-950/50", bubbleMe: "bg-purple-700", bubblePartner: "bg-fuchsia-950/80", accent: "text-purple-300", shadow: "shadow-purple-500/15", glow: "bg-purple-500/8" },
  { name: "Cosmic Hug", mood: "signature", bg: "bg-violet-950/55", bubbleMe: "bg-gradient-to-br from-violet-700 to-purple-800", bubblePartner: "bg-violet-950/88", accent: "text-violet-300", shadow: "shadow-violet-500/15", glow: "bg-violet-600/8" },
  { name: "Vivid Violet", mood: "signature", bg: "bg-violet-950/40", bubbleMe: "bg-violet-500", bubblePartner: "bg-indigo-950/80", accent: "text-violet-200", shadow: "shadow-violet-500/30", glow: "bg-violet-500/15" },
  { name: "Mango Chat", mood: "signature", bg: "bg-amber-950/40", bubbleMe: "bg-gradient-to-br from-amber-400 to-orange-600", bubblePartner: "bg-stone-900/85", accent: "text-amber-200", shadow: "shadow-amber-500/25", glow: "bg-amber-400/12", textMe: "text-zinc-950" },
];
