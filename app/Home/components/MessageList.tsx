import React, { Fragment } from "react";
import { Message, PlanItem, PresenceUser, ReminderItem, Theme, ReactionType, isOptimisticMessageId } from "../types";
import { renderMessage, getVideoPoster, getMessagePreviewText, getReplyPreviewKind, getReplyThumbUrl } from "../../../lib/utils";
import { mapsUrl, formatFileSize } from "../../../lib/attachments";
import { toProtectedMediaUrl } from "../../../lib/media-url";
import { REACTION_EMOJIS } from "../constants";
import { ReactionBurst } from "./ReactionBurst";
import { MediaSafetyModal, MediaSafetyInfo } from "./MediaSafetyModal";
import { PollCard } from "./PollCard";
import { SharedItemCard } from "./SharedItemCard";
import { MessageActionMenu } from "./MessageActionMenu";
import { ReactionPickerBar } from "./ReactionPickerBar";

const VoiceNotePlayer: React.FC<{
  url: string;
  isMe: boolean;
  themeClass: string;
  onRequestPlay: (audio: HTMLAudioElement) => Promise<void>;
}> = ({
  url,
  isMe,
  themeClass,
  onRequestPlay,
}) => {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [speedIndex, setSpeedIndex] = React.useState(0);
  const SPEEDS = [1, 1.5, 2];

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const safeDuration = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);
    const safeTime = (value: number) => (Number.isFinite(value) && value >= 0 ? value : 0);
    const onLoaded = () => setDuration(safeDuration(audio.duration));
    const onDurationChange = () => setDuration(safeDuration(audio.duration));
    const onTime = () => setCurrentTime(safeTime(audio.currentTime));
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    try {
      await onRequestPlay(audio);
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const replay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    try {
      await onRequestPlay(audio);
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const toggleSpeed = () => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    const audio = audioRef.current;
    if (audio) audio.playbackRate = SPEEDS[next];
  };

  const pct = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const fmt = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`mt-1.5 min-w-[230px] rounded-xl border border-white/20 ${isMe ? "bg-white/10" : "bg-zinc-900/60"} p-2.5`}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          className={`w-8 h-8 rounded-full flex items-center justify-center ${themeClass} text-white shadow-md active:scale-95`}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <button
          type="button"
          onClick={replay}
          className="w-7 h-7 rounded-full border border-white/20 text-[10px] text-white/80 hover:text-white active:scale-95"
          title="Replay"
        >
          ↺
        </button>
        <div className="flex-1">
          <div className="h-6 rounded-full bg-white/10 overflow-hidden px-1 flex items-center gap-0.5">
            {Array.from({ length: 20 }).map((_, i) => {
              const threshold = ((i + 1) / 20) * 100;
              const active = pct >= threshold;
              const h = 20 + ((i * 13) % 45);
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-colors ${active ? themeClass : "bg-white/25"}`}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
          <div className="mt-1 text-[9px] text-white/60 font-medium tracking-wide">
            {fmt(currentTime)} / {fmt(duration || 0)}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleSpeed}
          className="px-2 py-1 rounded-lg border border-white/20 text-[10px] font-bold text-white/85 hover:text-white"
          title="Playback speed"
        >
          {SPEEDS[speedIndex]}x
        </button>
      </div>
    </div>
  );
};

interface MessageListProps {
  messages: Message[];
  groupedMessages: { date: string; label: string; messages: Message[] }[];
  unseenSeparatorMessageId?: string | null;
  currentUser: string;
  activeTheme: Theme;
  users: PresenceUser[];
  hasMoreMessages: boolean;
  loadMoreMessages: () => void;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  setTouchStartY: (y: number | null) => void;
  touchStartY: number | null;
  rafRef: React.MutableRefObject<number | null>;
  pullUpDistance: number;
  setPullUpDistance: (d: number) => void;
  isPullingUp: boolean;
  setIsPullingUp: (b: boolean) => void;
  showScrollButton: boolean;
  scrollToBottom: (instant?: boolean) => void;
  fetchInitialData: (showLoading?: boolean) => void;
  isMessageExpanded: boolean;
  handleDeleteMessage: (id: string) => void;
  handleUpdateMessage: (id: string, text: string) => void;
  handleTogglePinMessage: (id: string) => void;
  handleReactToMessage: (id: string, reaction: ReactionType) => void;
  partnerBurstReaction?: ReactionType | null;
  onPartnerBurstComplete?: () => void;
  setReplyingTo: (m: Message | null) => void;
  editingMessage: string | null;
  setEditingMessage: (id: string | null) => void;
  editingMessageText: string;
  setEditingMessageText: (text: string) => void;
  handleDownloadMedia: (url: string) => void;
  handleCopyMessage: (text: string) => void;
  setPreviewMessage: (m: Message | null) => void;
  setPreviewImageIndex: (index: number) => void;
  partnerIsTyping?: boolean;
  handleVotePoll?: (messageId: string, optionId: string) => void;
  handleClosePoll?: (messageId: string) => void;
  plans: PlanItem[];
  reminders: ReminderItem[];
  handleTogglePlan: (id: string) => void;
  handleToggleReminder: (id: string) => void;
  onOpenSharedItem: (kind: "task" | "reminder") => void;
  onViewDisappearingMessages?: (messageIds: string[]) => void;
  highlightedMessageId?: string | null;
  onClearHighlight?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  groupedMessages,
  unseenSeparatorMessageId = null,
  currentUser,
  activeTheme,
  users,
  hasMoreMessages,
  loadMoreMessages,
  messagesContainerRef,
  handleScroll,
  setTouchStartY,
  touchStartY,
  rafRef,
  pullUpDistance,
  setPullUpDistance,
  isPullingUp,
  setIsPullingUp,
  showScrollButton,
  scrollToBottom,
  fetchInitialData,
  isMessageExpanded,
  handleDeleteMessage,
  handleUpdateMessage,
  handleTogglePinMessage,
  handleReactToMessage,
  partnerBurstReaction = null,
  onPartnerBurstComplete,
  setReplyingTo,
  editingMessage,
  setEditingMessage,
  editingMessageText,
  setEditingMessageText,
  handleDownloadMedia,
  handleCopyMessage,
  setPreviewMessage,
  setPreviewImageIndex,
  partnerIsTyping = false,
  handleVotePoll,
  handleClosePoll,
  plans,
  reminders,
  handleTogglePlan,
  handleToggleReminder,
  onOpenSharedItem,
  onViewDisappearingMessages,
  highlightedMessageId = null,
  onClearHighlight,
}) => {
  const [swipingMessageId, setSwipingMessageId] = React.useState<string | null>(null);
  const [swipeDistance, setSwipeDistance] = React.useState(0);
  const [mediaSafetyInfo, setMediaSafetyInfo] = React.useState<MediaSafetyInfo | null>(null);
  const [nowTick, setNowTick] = React.useState(() => Date.now());
  const viewedBatchRef = React.useRef<Set<string>>(new Set());
  const viewFlushTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onViewRef = React.useRef(onViewDisappearingMessages);
  onViewRef.current = onViewDisappearingMessages;
  const onClearHighlightRef = React.useRef(onClearHighlight);
  onClearHighlightRef.current = onClearHighlight;
  const pinnedToLatestRef = React.useRef(false);

  const pinToLatest = React.useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const prevBehavior = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    el.scrollTop = el.scrollHeight;
    el.style.scrollBehavior = prevBehavior;
  }, [messagesContainerRef]);

  React.useEffect(() => {
    if (highlightedMessageId) {
      pinnedToLatestRef.current = true;
      return;
    }
    if (messages.length === 0) return;
    if (pinnedToLatestRef.current) return;
    pinnedToLatestRef.current = true;

    pinToLatest();
    const frame = requestAnimationFrame(pinToLatest);
    const t1 = window.setTimeout(pinToLatest, 50);
    const t2 = window.setTimeout(pinToLatest, 180);
    const t3 = window.setTimeout(pinToLatest, 400);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [messages.length, highlightedMessageId, pinToLatest]);

  const openMediaSafety = (kind: MediaSafetyInfo["kind"], url: string) => {
    // New uploads are authenticated assets behind the login proxy. Legacy files
    // are either raw CDN links or proxy links with deliveryType=upload (public asset).
    const isLegacyPublic =
      url.includes("res.cloudinary.com") || url.includes("deliveryType=upload");
    const protectedDelivery = kind === "document" || kind === "location" || !isLegacyPublic;
    setMediaSafetyInfo({ kind, protectedDelivery });
  };
  const [zoomedAvatar, setZoomedAvatar] = React.useState<string | null>(null);
  const [reactionPickerId, setReactionPickerId] = React.useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = React.useState<string | null>(null);
  const [burstReaction, setBurstReaction] = React.useState<ReactionType | null>(null);
  const activeAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const swipeMovedRef = React.useRef(false);
  const swipeDistanceRef = React.useRef(0);
  const swipingMessageIdRef = React.useRef<string | null>(null);
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = React.useRef(false);
  const listRootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!editingMessage) return;
    const el = document.getElementById(`message-${editingMessage}`);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    });
  }, [editingMessage]);

  React.useEffect(() => {
    if (!highlightedMessageId) return;
    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let clearTimer: ReturnType<typeof setTimeout> | null = null;

    const tryScroll = () => {
      const el = document.getElementById(`message-${highlightedMessageId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        clearTimer = setTimeout(() => onClearHighlightRef.current?.(), 2500);
        return;
      }
      if (attempts++ < 25) {
        retryTimer = setTimeout(tryScroll, 80);
      }
    };

    retryTimer = setTimeout(tryScroll, 60);
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (clearTimer) clearTimeout(clearTimer);
    };
  }, [highlightedMessageId, messages]);

  React.useEffect(() => {
    if (partnerIsTyping && !showScrollButton) {
      scrollToBottom(true);
    }
  }, [partnerIsTyping, showScrollButton, scrollToBottom]);

  React.useEffect(() => {
    const hasCountdown = messages.some((m) => m.disappearing && m.expiresAt);
    if (!hasCountdown) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, [messages]);

  React.useEffect(() => {
    const root = messagesContainerRef.current;
    if (!root || !onViewRef.current) return;

    const flush = () => {
      if (!viewedBatchRef.current.size) return;
      const ids = Array.from(viewedBatchRef.current);
      viewedBatchRef.current.clear();
      onViewRef.current?.(ids);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.55) continue;
          const id = (entry.target as HTMLElement).dataset.disappearingId;
          if (!id) continue;
          viewedBatchRef.current.add(id);
        }
        if (viewFlushTimerRef.current) clearTimeout(viewFlushTimerRef.current);
        viewFlushTimerRef.current = setTimeout(flush, 400);
      },
      { root, threshold: [0.55] }
    );

    root.querySelectorAll<HTMLElement>("[data-disappearing-id]").forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      if (viewFlushTimerRef.current) clearTimeout(viewFlushTimerRef.current);
    };
  }, [messages, messagesContainerRef, currentUser]);

  const partnerAvatarSrc =
    currentUser.trim().toLowerCase() === "alpha 1" ? "/male.png" : "/female.png";

  const closeReactionPicker = React.useCallback(() => {
    setReactionPickerId(null);
  }, []);

  const closeActionMenu = React.useCallback(() => {
    setActionMenuId(null);
  }, []);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const isInteractiveTouchTarget = (target: EventTarget | null) => {
    const el = (target as HTMLElement)?.closest?.("a, button, textarea");
    if (!el) return false;
    // Attachment cards (documents/location) fill the whole bubble, so they must
    // still allow swipe-to-reply and long-press; a plain tap still opens them.
    return !el.hasAttribute("data-attachment-card");
  };

  const startLongPress = (messageId: string) => {
    if (isOptimisticMessageId(messageId)) return;
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      closeReactionPicker();
      setActionMenuId(messageId);
      if (window.navigator.vibrate) window.navigator.vibrate(20);
    }, 500);
  };

  React.useEffect(() => {
    if (!reactionPickerId && !actionMenuId) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-reaction-picker]") || target.closest("[data-action-menu]")) return;
      if (reactionPickerId && target.closest(`#message-${reactionPickerId}`)) return;
      if (actionMenuId && target.closest(`#message-${actionMenuId}`)) return;
      closeReactionPicker();
      closeActionMenu();
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [reactionPickerId, actionMenuId, closeReactionPicker, closeActionMenu]);

  const handleReactionSelect = (messageId: string, reaction: ReactionType) => {
    closeReactionPicker();
    closeActionMenu();
    setBurstReaction(reaction);
    handleReactToMessage(messageId, reaction);
    if (window.navigator.vibrate) window.navigator.vibrate(15);
  };

  const handleReactionRemove = (messageId: string, reaction: ReactionType) => {
    closeReactionPicker();
    closeActionMenu();
    handleReactToMessage(messageId, reaction);
    if (window.navigator.vibrate) window.navigator.vibrate(10);
  };

  const toggleReactionPicker = (messageId: string) => {
    closeActionMenu();
    setReactionPickerId((prev) => (prev === messageId ? null : messageId));
  };

  const handlePartnerBubbleTap = (messageId: string, e: React.MouseEvent) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if ((e.target as HTMLElement).closest("a, button, img, video, textarea")) return;
    e.stopPropagation();
    closeActionMenu();
    toggleReactionPicker(messageId);
  };

  const handleOwnBubbleTap = (e: React.MouseEvent) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if ((e.target as HTMLElement).closest("a, button, img, video, textarea")) return;
    e.stopPropagation();
    closeReactionPicker();
    closeActionMenu();
  };

  const activeBurst = burstReaction || partnerBurstReaction;
  const isPartnerBurst = !burstReaction && !!partnerBurstReaction;

  const handleBurstComplete = React.useCallback(() => {
    if (burstReaction) {
      setBurstReaction(null);
    } else if (partnerBurstReaction) {
      onPartnerBurstComplete?.();
    }
  }, [burstReaction, partnerBurstReaction, onPartnerBurstComplete]);

  const reactionPickerMessage = React.useMemo(
    () => (reactionPickerId ? messages.find((m) => m._id === reactionPickerId) : null),
    [reactionPickerId, messages]
  );

  const handleRequestPlayAudio = React.useCallback(async (audio: HTMLAudioElement) => {
    if (activeAudioRef.current && activeAudioRef.current !== audio) {
      activeAudioRef.current.pause();
    }
    activeAudioRef.current = audio;
    await audio.play();
  }, []);

  return (
    <div ref={listRootRef} className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
      {actionMenuId && (
        <div
          className="absolute inset-0 z-[10]"
          aria-hidden
          onClick={closeActionMenu}
        />
      )}
      <ReactionBurst
        reaction={activeBurst}
        subtle={isPartnerBurst}
        onComplete={handleBurstComplete}
      />
      {reactionPickerId && reactionPickerMessage && (
        <ReactionPickerBar
          messageId={reactionPickerId}
          myReactionType={(reactionPickerMessage.reactions || []).find(
            (r) => r.user === currentUser
          )?.type}
          onSelect={(type) => handleReactionSelect(reactionPickerId, type)}
          onRemove={() => {
            const mine = (reactionPickerMessage.reactions || []).find(
              (r) => r.user === currentUser
            )?.type;
            if (mine) handleReactionRemove(reactionPickerId, mine);
          }}
          onClose={closeReactionPicker}
        />
      )}
    <div
      ref={messagesContainerRef}
      onScroll={handleScroll}
      onTouchStart={(e) => setTouchStartY(e.targetTouches[0].clientY)}
      onTouchMove={(e) => {
        if (touchStartY === null || !messagesContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const currentTouchY = e.targetTouches[0].clientY;
        const distanceY = touchStartY - currentTouchY;

        const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;

        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        rafRef.current = requestAnimationFrame(() => {
          if (distanceY > 5 && (isAtBottom || isPullingUp)) {
            const newDistance = Math.min(distanceY, 120);
            if (Math.abs(newDistance - pullUpDistance) > 1 || !isPullingUp) {
              setPullUpDistance(newDistance);
              setIsPullingUp(true);
            }
          } else if (isPullingUp && distanceY <= 0) {
            setIsPullingUp(false);
            setPullUpDistance(0);
          }
        });
      }}
      onTouchEnd={(e) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (touchStartY === null || !messagesContainerRef.current) return;
        const touchEndY = e.changedTouches[0].clientY;
        const distanceY = touchStartY - touchEndY;

        if (distanceY > 100 && isPullingUp) {
          fetchInitialData(false);
          if (window.navigator.vibrate) window.navigator.vibrate(20);
        }
        setTouchStartY(null);
        setPullUpDistance(0);
        setIsPullingUp(false);
      }}
      className={`flex-1 min-h-0 overflow-y-auto no-scrollbar scroll-smooth px-3 sm:px-4 ${
        isMessageExpanded ? "py-4 pb-2" : "py-4 max-h-[38vh] min-h-[220px]"
      }`}
    >
      {hasMoreMessages && messages.length >= 50 && (
        <div className="flex justify-center mb-6">
          <button
            onClick={loadMoreMessages}
            className="px-4 py-2 bg-zinc-900/50 border border-white/10 rounded-full text-[12px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 transition-all shadow-sm active:scale-95"
          >
            Load earlier messages
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-16 px-6">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900/80 flex items-center justify-center mx-auto border border-white/10 mb-5 shadow-inner">
            <span className={`text-lg ${activeTheme.accent}`}>✦</span>
          </div>
          <p className="text-white/90 font-medium text-[15px] tracking-tight">
            Just the two of you
          </p>
          <p className="text-zinc-500 text-[13px] mt-1.5 max-w-[220px] leading-relaxed">
            Messages stay here. Say hello whenever you're ready.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {groupedMessages.map((group) => (
            <div key={group.date} className="flex flex-col relative">
              <div className="flex justify-center mb-3 sticky top-0 z-[40] -mx-4 py-1.5 pointer-events-none">
                <div className="bg-black/45 text-zinc-300 text-[10px] font-medium tracking-wide px-3 py-1 rounded-full border border-white/10 shadow-sm backdrop-blur-md pointer-events-auto">
                  {group.label}
                </div>
              </div>
              {group.messages.map((m, msgIdx) => {
                const isMe = m.createdBy.trim().toLowerCase() === currentUser.trim().toLowerCase();
                // Group consecutive messages from the same sender: avatar only on the
                // first of a run, tighter spacing between the rest.
                const prevMsg = group.messages[msgIdx - 1];
                const nextMsg = group.messages[msgIdx + 1];
                const sameSenderAsPrev =
                  !!prevMsg && prevMsg.createdBy.trim().toLowerCase() === m.createdBy.trim().toLowerCase();
                const sameSenderAsNext =
                  !!nextMsg && nextMsg.createdBy.trim().toLowerCase() === m.createdBy.trim().toLowerCase();
                const showAvatar = !sameSenderAsPrev || unseenSeparatorMessageId === m._id;
                const partnerUsername = currentUser.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1";
                const userObj = users.find((u) => u.username.trim().toLowerCase() === m.createdBy.trim().toLowerCase());
                const partner = users.find((u) => u.username.trim().toLowerCase() === partnerUsername);
                
                const isOnline = userObj ? (Date.now() - new Date(userObj.lastSeen).getTime() < 20000) : false;

                const isRead =
                  isMe &&
                  !!partner?.lastReadAt &&
                  new Date(m.createdAt).getTime() <= new Date(partner.lastReadAt).getTime();
                const isOptimistic = isOptimisticMessageId(m._id);
                const isPinnedForMe =
                  (m.pinnedBy || []).includes(currentUser) ||
                  (m.savedBy || []).includes(currentUser);
                const avatarSrc = m.createdBy.trim().toLowerCase() === "alpha 1" ? "/female.png" : "/male.png";
                const systemText = (m.text || "").trim().toUpperCase();
                const isDisappearingSystem =
                  systemText.startsWith("[SYSTEM:DISAPPEARING_ON]") ||
                  systemText.startsWith("[SYSTEM:DISAPPEARING_OFF]");
                const isDisappearingMsg = Boolean(m.disappearing);
                const needsViewMark =
                  isDisappearingMsg &&
                  !isMe &&
                  !m.viewedAt &&
                  !isOptimistic &&
                  !(m.pinnedBy && m.pinnedBy.length > 0) &&
                  !(m.savedBy && m.savedBy.length > 0);

                if (isDisappearingSystem) {
                  const turnedOn = systemText.startsWith("[SYSTEM:DISAPPEARING_ON]");
                  const switchedAt = new Date(m.createdAt);
                  const switchedLabel = Number.isNaN(switchedAt.getTime())
                    ? null
                    : switchedAt.toLocaleString([], {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                  return (
                    <Fragment key={m._id}>
                      <div className="my-3 flex justify-center px-2">
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                            turnedOn
                              ? "bg-violet-500/15 text-violet-200 border-violet-400/30"
                              : "bg-zinc-800/80 text-zinc-400 border-zinc-700/60"
                          }`}
                        >
                          <span>{turnedOn ? "⏱" : "○"}</span>
                          <span>{turnedOn ? "Disappearing mode on" : "Disappearing mode off"}</span>
                          {switchedLabel && (
                            <span className="text-[8px] font-normal normal-case tracking-normal opacity-70">
                              {switchedLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </Fragment>
                  );
                }

                let disappearLabel: string | null = null;
                if (isDisappearingMsg) {
                  if (
                    (m.pinnedBy && m.pinnedBy.length > 0) ||
                    (m.savedBy && m.savedBy.length > 0)
                  ) {
                    disappearLabel = "Pinned · kept permanently";
                  } else if (m.expiresAt) {
                    const remaining = new Date(m.expiresAt).getTime() - nowTick;
                    if (remaining <= 0) disappearLabel = "Expiring…";
                    else {
                      const mins = Math.max(1, Math.ceil(remaining / 60000));
                      disappearLabel =
                        mins >= 60
                          ? `Disappears in ${Math.floor(mins / 60)}h ${mins % 60}m`
                          : `Disappears in ${mins}m`;
                    }
                  } else {
                    disappearLabel = "Disappears 1h after viewed";
                  }
                }

                return (
                  <Fragment key={m._id}>
                    {unseenSeparatorMessageId === m._id && (
                      <div className="my-2 flex items-center gap-2 px-1 animate-in fade-in duration-300">
                        <div className="h-px flex-1 bg-zinc-700/60" />
                        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                          New Messages
                        </span>
                        <div className="h-px flex-1 bg-zinc-700/60" />
                      </div>
                    )}
                    <div
                      id={`message-${m._id}`}
                      data-disappearing-id={needsViewMark ? m._id : undefined}
                      onTouchStart={(e) => {
                      if (isInteractiveTouchTarget(e.target)) return;
                      swipeMovedRef.current = false;
                      swipeDistanceRef.current = 0;
                      swipingMessageIdRef.current = null;
                      touchStartRef.current = {
                        x: e.touches[0].clientX,
                        y: e.touches[0].clientY,
                        time: Date.now(),
                      };
                      startLongPress(m._id);
                    }}
                    onTouchMove={(e) => {
                      if (!touchStartRef.current) return;
                      const deltaX = e.touches[0].clientX - touchStartRef.current.x;
                      const deltaY = e.touches[0].clientY - touchStartRef.current.y;
                      const distance = Math.hypot(deltaX, deltaY);

                      if (distance > 8) {
                        swipeMovedRef.current = true;
                        clearLongPressTimer();
                      }

                      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
                        const nextDistance = Math.min(deltaX, 80);
                        swipeDistanceRef.current = nextDistance;
                        swipingMessageIdRef.current = m._id;
                        setSwipingMessageId(m._id);
                        setSwipeDistance(nextDistance);
                      }
                    }}
                    onTouchEnd={() => {
                      const wasLongPress = longPressTriggeredRef.current;
                      const currentSwipe =
                        swipingMessageIdRef.current === m._id
                          ? swipeDistanceRef.current
                          : 0;
                      clearLongPressTimer();
                      if (!wasLongPress && currentSwipe > 48 && swipeMovedRef.current) {
                        closeReactionPicker();
                        closeActionMenu();
                        setReplyingTo(m);
                        if (window.navigator.vibrate) window.navigator.vibrate(10);
                      }
                      if (wasLongPress) longPressTriggeredRef.current = false;
                      swipingMessageIdRef.current = null;
                      swipeDistanceRef.current = 0;
                      setSwipingMessageId(null);
                      setSwipeDistance(0);
                      touchStartRef.current = null;
                      swipeMovedRef.current = false;
                    }}
                    style={{
                      transform: swipingMessageId === m._id ? `translateX(${swipeDistance}px)` : 'none',
                      transition: swipingMessageId === m._id ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                      className={`flex flex-col w-full transition-all duration-300 relative group/msg scroll-mt-24 ${
                        sameSenderAsNext ? "mb-0.5" : "mb-3"
                      } ${
                        isMe ? "items-end" : "items-start"
                      } ${actionMenuId === m._id ? "z-[160]" : ""} ${
                        editingMessage === m._id ? "max-sm:scroll-mt-16 scroll-mb-24" : ""
                      } ${
                        highlightedMessageId === m._id
                          ? "rounded-2xl ring-2 ring-amber-300/80 bg-white/10 shadow-[0_0_24px_rgba(252,211,77,0.18)]"
                          : ""
                      }`}
                    >
                    {swipingMessageId === m._id && swipeDistance > 20 && (
                      <div 
                        className="absolute left-[-40px] top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200"
                        style={{ opacity: Math.min((swipeDistance - 20) / 40, 1) }}
                      >
                        <div className={`p-2 rounded-full ${activeTheme.bubbleMe} text-white shadow-lg`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                        </div>
                      </div>
                    )}
                    
                    <div className={`flex items-start gap-1.5 ${
                      editingMessage === m._id
                        ? "w-full max-w-full sm:max-w-[85%]"
                        : "max-w-[95%] sm:max-w-[85%]"
                    } ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      {showAvatar ? (
                        <div
                          className="flex-shrink-0 cursor-pointer active:scale-95 transition-transform mt-0.5 relative"
                          onClick={() => setZoomedAvatar(avatarSrc)}
                        >
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/10 overflow-hidden shadow-md ring-1 ring-black/20">
                            <img src={avatarSrc} className="w-full h-full object-cover" alt="avatar" />
                          </div>
                          {isOnline && (
                            <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-zinc-950 shadow-sm"></div>
                          )}
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-7 sm:w-8" aria-hidden="true" />
                      )}

                      <div
                        className={`flex flex-col gap-0.5 relative min-w-0 ${
                          editingMessage === m._id ? "flex-1 max-sm:w-full max-sm:max-w-full" : ""
                        } ${
                          isMe ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          data-message-bubble
                          onClick={(e) => {
                            if (isOptimistic) return;
                            if (!isMe) handlePartnerBubbleTap(m._id, e);
                            else handleOwnBubbleTap(e);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (isOptimistic) return;
                            closeReactionPicker();
                            setActionMenuId(m._id);
                          }}
                          onMouseDown={(e) => {
                            if (isInteractiveTouchTarget(e.target)) return;
                            if (e.button !== 0) return;
                            startLongPress(m._id);
                          }}
                          onMouseUp={clearLongPressTimer}
                          onMouseLeave={clearLongPressTimer}
                          className={`relative px-3 py-2 sm:px-3.5 sm:py-2.5 text-[14.5px] leading-[1.45] font-normal border chat-bubble-in ${
                            isMe 
                              ? `${activeTheme.bubbleMe} ${activeTheme.textMe || "text-white"} border-white/10 rounded-[1.15rem] ${showAvatar ? "rounded-tr-[5px]" : "rounded-tr-[1.15rem]"} ${sameSenderAsNext ? "rounded-br-[5px]" : "rounded-br-[1.15rem]"} shadow-lg ${activeTheme.shadow}` 
                              : `${activeTheme.bubblePartner} border-white/5 cursor-pointer active:scale-[0.98] rounded-[1.15rem] ${showAvatar ? "rounded-tl-[5px]" : "rounded-tl-[1.15rem]"} ${sameSenderAsNext ? "rounded-bl-[5px]" : "rounded-bl-[1.15rem]"} shadow-[0_6px_18px_rgba(0,0,0,0.22)]`
                          } ${
                            editingMessage === m._id
                              ? "w-full max-w-[calc(100vw-3.5rem)] sm:min-w-[260px] sm:w-[min(65vw,520px)] sm:max-w-[min(65vw,520px)]"
                              : "max-w-full min-w-0"
                          } ${
                            reactionPickerId === m._id && !isMe
                              ? "ring-2 ring-white/40 shadow-lg scale-[1.02]"
                              : ""
                          } ${
                            actionMenuId === m._id ? "ring-2 ring-amber-400/50 shadow-lg" : ""
                          } ${
                            isPinnedForMe
                              ? "ring-2 ring-amber-300/70 border-amber-200/40 bg-gradient-to-br from-amber-400/20 via-amber-300/10 to-transparent shadow-[0_0_30px_rgba(251,191,36,0.22)]"
                              : ""
                          } ${
                            isDisappearingMsg
                              ? "border-dashed border-violet-300/45 ring-1 ring-violet-400/20"
                              : ""
                          }`}
                        >
                          {isPinnedForMe && (
                            <span className="absolute -top-1.5 right-2 text-amber-400" title="Pinned">
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2z" /></svg>
                            </span>
                          )}
                           {m.repliedTo && typeof m.repliedTo === "object" && (() => {
                              const kind = getReplyPreviewKind(m.repliedTo);
                              const thumb = getReplyThumbUrl(m.repliedTo);
                              const preview = getMessagePreviewText(m.repliedTo) || "Media";
                              return (
                              <div 
                                onClick={() => {
                                  const element = document.getElementById(`message-${m.repliedTo?._id}`);
                                  if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    element.classList.add('ring-2', 'ring-white/50', 'bg-white/5');
                                    setTimeout(() => {
                                      element.classList.remove('ring-2', 'ring-white/50', 'bg-white/5');
                                    }, 2000);
                                  }
                                }}
                                className={`mb-2 flex overflow-hidden rounded-xl cursor-pointer active:scale-[0.98] transition-transform ${
                                  isMe ? 'bg-black/20' : 'bg-black/30'
                                }`}
                              >
                                  <div className={`w-1 shrink-0 ${isMe ? 'bg-white/70' : activeTheme.bubbleMe}`} />
                                  <div className="flex-1 min-w-0 px-2.5 py-1.5 flex items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className={`text-[11px] font-semibold truncate ${isMe ? 'text-white/90' : activeTheme.accent}`}>
                                          {m.repliedTo.createdBy}
                                      </p>
                                      <p className="text-[11px] leading-snug line-clamp-1 font-normal text-white/70">
                                        {kind === "image" && "📷 "}
                                        {kind === "video" && "🎬 "}
                                        {kind === "audio" && "🎵 "}
                                        {kind === "document" && "📄 "}
                                        {kind === "poll" && "📊 "}
                                        {kind === "location" && "📍 "}
                                        {kind === "call" && "📞 "}
                                        {kind === "task" && "✅ "}
                                        {kind === "reminder" && "⏰ "}
                                        {preview}
                                      </p>
                                    </div>
                                    {thumb && (
                                      <div className="w-9 h-9 rounded-md overflow-hidden bg-black/30 shrink-0">
                                        {kind === "video" ? (
                                          <video src={thumb} className="w-full h-full object-cover" muted />
                                        ) : (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={thumb} alt="" className="w-full h-full object-cover" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                              </div>
                              );
                           })()}

                          {m.kind === "poll" && m.pollMeta && handleVotePoll && handleClosePoll && (
                            <PollCard
                              message={m}
                              currentUser={currentUser as "alpha 1" | "delta 1"}
                              isMe={isMe}
                              onVote={handleVotePoll}
                              onClose={handleClosePoll}
                            />
                          )}

                          {m.kind === "task" && m.sharedItemMeta && (
                            <SharedItemCard
                              kind="task"
                              item={
                                m.sharedItemMeta.itemId
                                  ? plans.find((plan) => plan._id === m.sharedItemMeta?.itemId)
                                  : undefined
                              }
                              items={
                                m.sharedItemMeta.itemType === "todo-list" ||
                                (m.sharedItemMeta.itemIds && m.sharedItemMeta.itemIds.length > 1)
                                  ? plans.filter((plan) => {
                                      if (m.sharedItemMeta?.listId && plan.listId === m.sharedItemMeta.listId) {
                                        return true;
                                      }
                                      return Boolean(m.sharedItemMeta?.itemIds?.includes(plan._id));
                                    })
                                  : undefined
                              }
                              listTitle={m.sharedItemMeta.listTitle || (m.sharedItemMeta.itemType === "todo-list" ? m.text : undefined)}
                              fallbackTitle={m.text || "Shared todo list"}
                              onToggle={handleTogglePlan}
                              onOpen={() => onOpenSharedItem("task")}
                            />
                          )}

                          {m.kind === "reminder" && m.sharedItemMeta?.itemId && (
                            <SharedItemCard
                              kind="reminder"
                              item={reminders.find((reminder) => reminder._id === m.sharedItemMeta?.itemId)}
                              fallbackTitle={m.text || "Shared reminder"}
                              onToggle={handleToggleReminder}
                              onOpen={() => onOpenSharedItem("reminder")}
                            />
                          )}

                          {m.text && !["poll", "task", "reminder"].includes(m.kind || "") && (
                            editingMessage === m._id ? (
                              <div className="flex flex-col gap-2">
                                  <textarea
                                      value={editingMessageText}
                                      onChange={(e) => setEditingMessageText(e.target.value)}
                                      onKeyDown={(e) => {
                                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                              e.preventDefault();
                                              handleUpdateMessage(m._id, editingMessageText);
                                          }
                                          if (e.key === "Escape") {
                                              setEditingMessage(null);
                                              setEditingMessageText("");
                                          }
                                      }}
                                      className="w-full bg-zinc-950/50 border border-white/20 rounded-xl p-2 text-sm text-white outline-none focus:border-white/40 min-h-[60px] max-sm:max-h-[35vh] resize-none overflow-y-auto"
                                      autoFocus
                                  />
                                  <div className="flex justify-end gap-2">
                                      <button 
                                          onClick={() => {
                                              setEditingMessage(null);
                                              setEditingMessageText("");
                                          }}
                                          className="text-[10px] font-bold uppercase tracking-widest opacity-60 hover:opacity-100"
                                      >
                                          Cancel
                                      </button>
                                      <button 
                                          onClick={() => handleUpdateMessage(m._id, editingMessageText)}
                                          className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300"
                                      >
                                          Save
                                      </button>
                                  </div>
                              </div>
                            ) : (
                              <div className="leading-relaxed whitespace-pre-wrap">{renderMessage(m.text)}</div>
                            )
                          )}
                          
                          {(m.imageUrl || (m.imageUrls && m.imageUrls.length > 0)) && (
                              <div className={`mt-1.5 grid gap-1.5 ${m.imageUrls && m.imageUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                  {(m.imageUrls || [m.imageUrl]).map((url, idx) => {
                                      const mediaUrl = toProtectedMediaUrl(url!);
                                      return (
                                      <div key={idx} className="relative group/img overflow-hidden rounded-xl border border-white/10 shadow-lg bg-zinc-950">
                                          <img 
                                              src={mediaUrl} 
                                              alt="Shared content" 
                                              className="w-full h-auto max-h-[250px] object-contain bg-zinc-950 hover:scale-[1.02] transition-transform duration-500 cursor-pointer"
                                              onError={(event) => {
                                                  const img = event.currentTarget;
                                                  const tries = Number(img.dataset.retry || "0");
                                                  if (tries >= 2) return;
                                                  img.dataset.retry = String(tries + 1);
                                                  const joiner = mediaUrl.includes("?") ? "&" : "?";
                                                  img.src = `${mediaUrl}${joiner}retry=${tries + 1}`;
                                              }}
                                              onClick={() => {
                                                  setPreviewMessage(m);
                                                  setPreviewImageIndex(idx);
                                              }}
                                          />
                                          <button 
                                              onClick={() => handleDownloadMedia(mediaUrl)}
                                              className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover/img:opacity-100 transition-all hover:bg-black"
                                          >
                                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                          </button>
                                          <button
                                              onClick={(e) => { e.stopPropagation(); openMediaSafety("image", mediaUrl); }}
                                              className="absolute top-1.5 left-1.5 p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-black transition-all"
                                              aria-label="Safety info"
                                          >
                                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                          </button>
                                      </div>
                                  );})}
                              </div>
                          )}

                          {(m.videoUrl || (m.videoUrls && m.videoUrls.length > 0)) && (
                              <div className={`mt-1.5 grid gap-1.5 ${m.videoUrls && m.videoUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                  {(m.videoUrls || [m.videoUrl]).map((url, idx) => {
                                      const mediaUrl = toProtectedMediaUrl(url!);
                                      return (
                                      <div key={idx} className="relative group/vid overflow-hidden rounded-xl border border-white/10 shadow-lg bg-zinc-950 aspect-video flex items-center justify-center">
                                          <video 
                                              src={mediaUrl} 
                                              poster={getVideoPoster(mediaUrl)}
                                              preload="metadata"
                                              className="w-full h-full object-contain cursor-pointer bg-zinc-950"
                                              onClick={() => {
                                                  setPreviewMessage(m);
                                                  setPreviewImageIndex(idx + (m.imageUrls?.length || (m.imageUrl ? 1 : 0)));
                                              }}
                                          />
                                          <div 
                                              className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/vid:bg-black/40 transition-all cursor-pointer"
                                              onClick={() => {
                                                  setPreviewMessage(m);
                                                  setPreviewImageIndex(idx + (m.imageUrls?.length || (m.imageUrl ? 1 : 0)));
                                              }}
                                          >
                                              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover/vid:scale-110 transition-transform">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                              </div>
                                          </div>
                                          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-black uppercase tracking-widest text-white/80 border border-white/10 pointer-events-none">
                                              Video Preview
                                          </div>
                                          <button 
                                              onClick={() => handleDownloadMedia(mediaUrl)}
                                              className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover/vid:opacity-100 transition-all hover:bg-black z-10"
                                          >
                                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                          </button>
                                          <button
                                              onClick={(e) => { e.stopPropagation(); openMediaSafety("video", mediaUrl); }}
                                              className="absolute bottom-1.5 right-1.5 p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-black transition-all z-10"
                                              aria-label="Safety info"
                                          >
                                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                          </button>
                                      </div>
                                  );})}
                              </div>
                          )}

                          {(m.audioUrl || (m.audioUrls && m.audioUrls.length > 0)) && (
                            <div className="mt-1.5 grid gap-1.5">
                              {(m.audioUrls || [m.audioUrl]).filter(Boolean).map((url, idx) => {
                                const audioMediaUrl = toProtectedMediaUrl(url!);
                                return (
                                <div key={`audio-${idx}`} className="flex items-center gap-1.5">
                                  <div className="min-w-0 flex-1">
                                    <VoiceNotePlayer
                                      url={audioMediaUrl}
                                      isMe={isMe}
                                      themeClass={activeTheme.bubbleMe}
                                      onRequestPlay={handleRequestPlayAudio}
                                    />
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openMediaSafety("audio", audioMediaUrl); }}
                                    className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                                    aria-label="Safety info"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                  </button>
                                </div>
                              );})}
                            </div>
                          )}

                          {m.documents && m.documents.length > 0 && (
                            <div className="mt-1.5 flex flex-col gap-1.5">
                              {m.documents.map((doc, idx) => {
                                // Cloudinary blocks direct viewing of raw files (PDF/ZIP),
                                // so route through our authenticated proxy: tap to preview
                                // inline, dedicated button to download.
                                const proxyBase = doc.publicId
                                  ? `/api/attachments/download?publicId=${encodeURIComponent(doc.publicId)}&resourceType=${encodeURIComponent(doc.resourceType || "raw")}&name=${encodeURIComponent(doc.name || "file")}`
                                  : doc.url;
                                const ext = (doc.name || "").split(".").pop()?.toLowerCase() || "";
                                const previewable = ["pdf", "txt", "csv", "md", "json", "xml", "png", "jpg", "jpeg", "gif", "webp"].includes(ext);
                                const previewHref = doc.publicId ? `${proxyBase}&mode=inline` : proxyBase;
                                const downloadHref = doc.publicId ? `${proxyBase}&mode=download` : proxyBase;
                                const suppressTap = (e: React.MouseEvent) => {
                                  // Don't trigger when the touch was a swipe-to-reply or long-press.
                                  if (swipeMovedRef.current || longPressTriggeredRef.current) {
                                    e.preventDefault();
                                    return true;
                                  }
                                  return false;
                                };
                                const inner = (
                                  <>
                                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-white truncate">{doc.name}</p>
                                      <p className="text-[10px] text-white/50">
                                        {formatFileSize(doc.size || 0) || "Document"}
                                        {doc.url ? (previewable ? " · Tap to preview" : " · Tap to download") : " · Uploading…"}
                                      </p>
                                    </div>
                                  </>
                                );
                                const className = `flex items-center gap-2 p-2.5 rounded-xl min-w-[200px] max-w-[260px] ${
                                  isMe ? "bg-black/20 hover:bg-black/30" : "bg-black/30 hover:bg-black/40"
                                } transition-colors`;
                                if (!doc.url) {
                                  return <div key={`doc-${idx}`} className={className}>{inner}</div>;
                                }
                                return (
                                  <div key={`doc-${idx}`} className={className}>
                                    <a
                                      href={previewable ? previewHref : downloadHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      {...(previewable ? {} : { download: doc.name })}
                                      data-attachment-card
                                      onClick={(e) => { e.stopPropagation(); suppressTap(e); }}
                                      className="flex items-center gap-3 min-w-0 flex-1"
                                    >
                                      {inner}
                                    </a>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openMediaSafety("document", doc.url); }}
                                      aria-label="Safety info"
                                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                    </button>
                                    <a
                                      href={downloadHref}
                                      download={doc.name}
                                      data-attachment-card
                                      title="Download"
                                      aria-label="Download"
                                      onClick={(e) => { e.stopPropagation(); suppressTap(e); }}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {m.location && (
                            <a
                              href={mapsUrl(m.location.latitude, m.location.longitude)}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-attachment-card
                              onClick={(e) => {
                                e.stopPropagation();
                                if (swipeMovedRef.current || longPressTriggeredRef.current) {
                                  e.preventDefault();
                                }
                              }}
                              className={`mt-1.5 flex items-center gap-3 p-2.5 rounded-xl min-w-[200px] max-w-[260px] ${
                                isMe ? "bg-black/20 hover:bg-black/30" : "bg-black/30 hover:bg-black/40"
                              } transition-colors`}
                            >
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-white">Location</p>
                                <p className="text-[10px] text-white/50 truncate">
                                  {m.location.latitude.toFixed(5)}, {m.location.longitude.toFixed(5)}
                                  {typeof m.location.accuracy === "number" ? ` · ±${Math.round(m.location.accuracy)}m` : ""}
                                </p>
                                <p className="text-[10px] text-emerald-300/80 mt-0.5">Open in Maps</p>
                              </div>
                              <span
                                role="button"
                                tabIndex={0}
                                aria-label="Safety info"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); openMediaSafety("location", ""); }}
                                className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                              </span>
                            </a>
                          )}

                          <div className={`${sameSenderAsNext ? "hidden" : "flex"} text-[10px] mt-1 items-center gap-1 font-medium tracking-normal ${isMe ? "justify-end text-white/50" : "justify-start text-zinc-500"}`}>
                              {isDisappearingMsg && (
                                <span className="text-violet-200/90 normal-case tracking-normal" title={disappearLabel || ""}>
                                  ⏱
                                </span>
                              )}
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isMe && isOptimistic && (
                                <span className="text-[7px] text-zinc-400 normal-case tracking-normal italic">Sending…</span>
                              )}
                              {isMe && !isOptimistic && (
                                  <span className={isRead ? "text-blue-300" : "text-white/50"}>
                                      {isRead ? (
                                          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
                                      ) : (
                                          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                      )}
                                  </span>
                              )}
                          </div>
                          {disappearLabel && (
                            <p className={`mt-1 text-[9px] font-medium tracking-wide ${
                              disappearLabel.startsWith("Pinned")
                                ? "text-emerald-300/90"
                                : "text-violet-200/80"
                            }`}>
                              {disappearLabel}
                            </p>
                          )}

                          {(m.reactions || []).length > 0 && (
                            <div className={`absolute -bottom-2 ${isMe ? 'right-2' : 'left-2'} flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-900/90 border border-zinc-700/50 rounded-full shadow-lg backdrop-blur-sm reaction-badge-pop z-10`}>
                              {(m.reactions || []).map((r) => (
                                <span key={r.user} className="text-sm leading-none" title={r.user}>
                                  {REACTION_EMOJIS[r.type]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {actionMenuId === m._id && !isOptimistic && (
                          <MessageActionMenu
                            messageId={m._id}
                            message={m}
                            isMe={isMe}
                            isPinned={isPinnedForMe}
                            onPin={() => handleTogglePinMessage(m._id)}
                            onReply={() => setReplyingTo(m)}
                            onCopy={m.text ? () => handleCopyMessage(m.text || "") : undefined}
                            onEdit={isMe && m.text && !["poll", "task", "reminder", "call-log"].includes(m.kind || "") ? () => {
                              setEditingMessage(m._id);
                              setEditingMessageText(m.text || "");
                            } : undefined}
                            onDelete={isMe ? () => handleDeleteMessage(m._id) : undefined}
                            onClose={closeActionMenu}
                          />
                        )}
                      </div>
                    </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          ))}
          {partnerIsTyping && (
            <div className="flex items-start gap-1.5 max-w-[95%] sm:max-w-[85%] mb-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/10 overflow-hidden shadow-md">
                  <img src={partnerAvatarSrc} className="w-full h-full object-cover" alt="" />
                </div>
              </div>
              <div
                className={`relative px-3.5 py-2.5 ${activeTheme.bubblePartner} rounded-[1.15rem] rounded-tl-[5px] border border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.22)]`}
              >
                <span className="flex items-center gap-1 h-4" aria-label="typing">
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-zinc-300/90" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-zinc-300/90 [animation-delay:160ms]" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-zinc-300/90 [animation-delay:320ms]" />
                </span>
              </div>
            </div>
          )}
          {isPullingUp && (
            <div
              className="flex justify-center py-4 animate-bounce"
              style={{ transform: `translateY(${pullUpDistance * 0.2}px)` }}
            >
              <div
                className={`w-2 h-2 rounded-full ${activeTheme.bubbleMe} shadow-lg shadow-white/20`}
              ></div>
            </div>
          )}
        </div>
      )}

      {showScrollButton && (
        <button
          onClick={() => scrollToBottom()}
          className={`absolute z-[25] p-3 ${activeTheme.bubbleMe} text-white rounded-full shadow-2xl hover:opacity-90 active:scale-90 transition-all border-2 border-zinc-950/80 bottom-3 right-3`}
          title="Scroll to bottom"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7 13 5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </button>
      )}

      {zoomedAvatar && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={() => setZoomedAvatar(null)}
        >
          <div className="relative p-4 max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img 
              src={zoomedAvatar} 
              className="w-full h-auto max-h-[70vh] rounded-2xl shadow-2xl border-4 border-white/10 object-contain animate-in zoom-in-95 duration-300"
              alt="Zoomed Avatar"
            />
            <button 
              className="absolute -top-12 right-0 p-3 text-white/70 hover:text-white transition-colors"
              onClick={() => setZoomedAvatar(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}
      {mediaSafetyInfo && (
        <MediaSafetyModal info={mediaSafetyInfo} onClose={() => setMediaSafetyInfo(null)} />
      )}
    </div>
    </div>
  );
}; 


// hello