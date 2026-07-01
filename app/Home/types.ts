export type UserType = "alpha 1" | "delta 1";

export type ReactionType =
  | "love"
  | "adore"
  | "kiss"
  | "hearteyes"
  | "hug"
  | "rose"
  | "fire"
  | "sparkle"
  | "funny"
  | "missyou"
  | "sad"
  | "confused"
  | "angry";

export interface MessageReaction {
  user: string;
  type: ReactionType;
}

export interface Ticket {
  _id: string;
  description: string;
  status: "open" | "closed";
  createdAt: string;
  createdBy: UserType;
}

export interface Message {
  _id: string;
  text?: string;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  videoUrls?: string[];
  createdAt: string;
  createdBy: UserType;
  savedBy?: string[];
  pinnedBy?: string[];
  reactions?: MessageReaction[];
  repliedTo?: {
    _id: string;
    text?: string;
    imageUrl?: string;
    imageUrls?: string[];
    videoUrl?: string;
    videoUrls?: string[];
    createdBy: UserType;
  };
}

export interface PresenceUser {
  _id: string;
  username: string;
  lastSeen: string;
  lastReadAt?: string;
  chatBackgroundColor?: string;
  chatBubbleColor?: string;
  themeName?: string;
  chatWallpaper?: string;
  isSoundEnabled?: boolean;
}

export interface WishlistItem {
  _id: string;
  content: string;
  createdBy: string;
}

export interface PlanItem {
  _id: string;
  content: string;
  createdBy: string;
}

export interface TimelineDate {
  _id: string;
  event: string;
  date: string;
  createdBy: string;
}

export type ViewType = "login" | UserType;
export type TabType = "complaints" | "wishlist" | "plans" | "dates" | "messages" | "emergency" | "news" | "media" | "calls";

export interface CallLog {
  _id: string;
  from: string;
  to: string;
  status: 'missed' | 'completed' | 'rejected';
  duration: number;
  createdAt: string;
  type?: 'call'; // Added to distinguish in interleaved lists
}

export interface Theme {
  name: string;
  bg: string;
  bubbleMe: string;
  bubblePartner: string;
  accent: string;
  shadow: string;
  glow: string;
  textMe?: string;
  mood?: "love" | "peaceful" | "dark" | "signature";
}

export interface Wallpaper {
  id: string;
  name: string;
  value: string;
  type: "emoji" | "image" | "gradient" | "animated";
  preview?: string;
  category?: "pattern" | "gradient" | "scene" | "wild" | "love" | "peaceful";
}

/** Client-side optimistic message ids (timestamp-based, not MongoDB ObjectIds). */
export function isOptimisticMessageId(id: string) {
  return /^\d+-[a-z0-9]+$/.test(id);
}
