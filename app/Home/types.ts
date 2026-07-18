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

export interface DocumentAttachment {
  url: string;
  name: string;
  mimeType?: string;
  size?: number;
  publicId?: string;
  resourceType?: string;
}

export interface LocationAttachment {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface PollOption {
  id: string;
  text: string;
}

export interface PollVote {
  user: string;
  optionId: string;
}

export interface PollMeta {
  question: string;
  options: PollOption[];
  votes: PollVote[];
  closed?: boolean;
}

export interface SharedItemMeta {
  itemId: string;
  itemType: "task" | "reminder";
}

export interface Message {
  _id: string;
  text?: string;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  videoUrls?: string[];
  audioUrl?: string;
  audioUrls?: string[];
  documents?: DocumentAttachment[];
  location?: LocationAttachment;
  clientMessageId?: string;
  kind?: "message" | "call-log" | "location" | "poll" | "task" | "reminder";
  pollMeta?: PollMeta;
  sharedItemMeta?: SharedItemMeta;
  disappearing?: boolean;
  viewedAt?: string | null;
  expiresAt?: string | null;
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
    audioUrl?: string;
    audioUrls?: string[];
    documents?: DocumentAttachment[];
    location?: LocationAttachment;
    pollMeta?: PollMeta;
    kind?: "message" | "call-log" | "location" | "poll" | "task" | "reminder";
    sharedItemMeta?: SharedItemMeta;
    disappearing?: boolean;
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
  done?: boolean;
  doneAt?: string | null;
  doneBy?: string | null;
  dueAt?: string | null;
  createdAt?: string;
  expiresAt?: string | null;
}

export interface TimelineDate {
  _id: string;
  event: string;
  date: string;
  createdBy: string;
  recurringYearly?: boolean;
  note?: string;
  createdAt?: string;
}

export interface ReminderItem {
  _id: string;
  title: string;
  dueAt: string;
  done?: boolean;
  doneAt?: string | null;
  createdBy: string;
  createdAt?: string;
  linkedDateId?: string | null;
  expiresAt?: string | null;
}

export type MoodType = "love" | "happy" | "calm" | "tired" | "sad" | "stressed" | "grateful";

export interface MoodCheckInItem {
  _id: string;
  user: string;
  mood: MoodType;
  note?: string;
  day: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ViewType = "login" | UserType;
export type TabType =
  | "complaints"
  | "wishlist"
  | "plans"
  | "dates"
  | "checkin"
  | "messages"
  | "emergency"
  | "news"
  | "media"
  | "calls";

export interface CallLog {
  _id: string;
  from: string;
  to: string;
  status: 'missed' | 'completed' | 'rejected';
  duration: number;
  createdAt: string;
  expiresAt?: string | null;
  type?: 'call'; // Added to distinguish in interleaved lists
}

export interface DisappearingModeState {
  disappearingMode: boolean;
  disappearingEnabledAt: string | null;
  disappearingEnabledBy: string | null;
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
