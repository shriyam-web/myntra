export type UserType = "alpha 1" | "delta 1";

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
export type TabType = "complaints" | "wishlist" | "plans" | "dates" | "messages" | "emergency" | "news" | "media";

export interface Theme {
  name: string;
  bg: string;
  bubbleMe: string;
  bubblePartner: string;
  accent: string;
  shadow: string;
  glow: string;
  textMe?: string;
}

export interface Wallpaper {
  id: string;
  name: string;
  value: string;
  type: string;
}
