import React, { Fragment } from "react";
import { Message, PresenceUser, Theme, ReactionType, isOptimisticMessageId } from "../types";
import { renderMessage, getVideoPoster } from "../../../lib/utils";
import { REACTION_EMOJIS } from "../constants";
import { ReactionBurst } from "./ReactionBurst";
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
}) => {
  const [swipingMessageId, setSwipingMessageId] = React.useState<string | null>(null);
  const [swipeDistance, setSwipeDistance] = React.useState(0);
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
    if (partnerIsTyping && !showScrollButton) {
      scrollToBottom(true);
    }
  }, [partnerIsTyping, showScrollButton, scrollToBottom]);

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

  const isInteractiveTouchTarget = (target: EventTarget | null) =>
    !!(target as HTMLElement)?.closest?.("a, button, textarea");

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
            className="px-5 py-2.5 bg-zinc-800/40 border border-zinc-700/30 rounded-full text-[11px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 transition-all shadow-lg active:scale-95"
          >
            Load History (Previous 50)
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-20">
          <div className="w-16 h-16 bg-zinc-950 rounded-full flex items-center justify-center mx-auto border border-zinc-800 mb-6 shadow-inner">
            <span className={`text-xl ${activeTheme.accent}`}>✉</span>
          </div>
          <p className="text-zinc-400 font-normal text-sm tracking-tight px-4 max-w-[200px]">
            Encrypted bridge active. Send a message to start.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {groupedMessages.map((group) => (
            <div key={group.date} className="flex flex-col relative">
              <div className="flex justify-center mb-4 sticky top-0 z-[40] -mx-4 py-2 pointer-events-none">
                <div className="bg-zinc-800/80 text-zinc-400 text-[11px] font-medium uppercase tracking-widest px-4 py-1.5 rounded-full border border-zinc-700/50 shadow-sm backdrop-blur-sm pointer-events-auto">
                  {group.label}
                </div>
              </div>
              {group.messages.map((m) => {
                const isMe = m.createdBy.trim().toLowerCase() === currentUser.trim().toLowerCase();
                const partnerUsername = currentUser.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1";
                const userObj = users.find((u) => u.username.trim().toLowerCase() === m.createdBy.trim().toLowerCase());
                const partner = users.find((u) => u.username.trim().toLowerCase() === partnerUsername);
                
                const isOnline = userObj ? (Date.now() - new Date(userObj.lastSeen).getTime() < 20000) : false;

                const isRead =
                  isMe &&
                  !!partner?.lastReadAt &&
                  new Date(m.createdAt).getTime() <= new Date(partner.lastReadAt).getTime();
                const isOptimistic = isOptimisticMessageId(m._id);
                const avatarSrc = m.createdBy.trim().toLowerCase() === "alpha 1" ? "/female.png" : "/male.png";

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
                      className={`flex flex-col w-full transition-all duration-300 relative group/msg mb-2.5 ${
                        isMe ? "items-end" : "items-start"
                      } ${actionMenuId === m._id ? "z-[160]" : ""} ${
                        editingMessage === m._id ? "max-sm:scroll-mt-16 scroll-mb-24" : ""
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
                      <div 
                        className="flex-shrink-0 cursor-pointer active:scale-95 transition-transform mt-0.5 relative"
                        onClick={() => setZoomedAvatar(avatarSrc)}
                      >
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-zinc-800/50 overflow-hidden shadow-md">
                          <img src={avatarSrc} className="w-full h-full object-cover" alt="avatar" />
                        </div>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-zinc-950 shadow-sm"></div>
                        )}
                      </div>

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
                          className={`relative p-2.5 sm:p-3 text-sm font-normal shadow-md border transition-all duration-200 ${
                            isMe 
                              ? `${activeTheme.bubbleMe} ${activeTheme.textMe || "text-white"} rounded-2xl rounded-tr-sm border-white/10` 
                              : `${activeTheme.bubblePartner} rounded-2xl rounded-tl-sm border-zinc-700/30 cursor-pointer active:scale-[0.98]`
                          } ${
                            editingMessage === m._id
                              ? "w-full max-w-[calc(100vw-3.5rem)] sm:min-w-[260px] sm:w-[min(65vw,520px)] sm:max-w-[min(65vw,520px)]"
                              : ""
                          } ${
                            reactionPickerId === m._id && !isMe
                              ? "ring-2 ring-white/40 shadow-lg scale-[1.02]"
                              : ""
                          } ${
                            actionMenuId === m._id ? "ring-2 ring-amber-400/50 shadow-lg" : ""
                          } ${
                            (m.pinnedBy || []).includes(currentUser)
                              ? "ring-2 ring-amber-300/70 border-amber-200/40 bg-gradient-to-br from-amber-400/20 via-amber-300/10 to-transparent shadow-[0_0_30px_rgba(251,191,36,0.22)]"
                              : ""
                          }`}
                        >
                          {(m.pinnedBy || []).includes(currentUser) && (
                            <span className="absolute -top-1.5 right-2 text-amber-400" title="Pinned">
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2z" /></svg>
                            </span>
                          )}
                           {m.repliedTo && (
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
                                className={`mb-2 p-2 rounded-xl border-l-2 border-white/20 ${isMe ? 'bg-white/10' : 'bg-zinc-950/50'} text-[10px] opacity-80 backdrop-blur-md cursor-pointer hover:bg-white/20 transition-all active:scale-95`}
                              >
                                  <p className="font-medium uppercase tracking-widest mb-0.5 text-[7px] opacity-50">
                                      {m.repliedTo.createdBy}
                                  </p>
                                  <p className="line-clamp-1 italic font-normal leading-relaxed">{m.repliedTo.text || 'Media'}</p>
                              </div>
                           )}

                          {m.text && (
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
                                  {(m.imageUrls || [m.imageUrl]).map((url, idx) => (
                                      <div key={idx} className="relative group/img overflow-hidden rounded-xl border border-white/10 shadow-lg bg-zinc-950">
                                          <img 
                                              src={url!} 
                                              alt="Shared content" 
                                              className="w-full h-auto max-h-[250px] object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
                                              onClick={() => {
                                                  setPreviewMessage(m);
                                                  setPreviewImageIndex(idx);
                                              }}
                                          />
                                          <button 
                                              onClick={() => handleDownloadMedia(url!)}
                                              className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover/img:opacity-100 transition-all hover:bg-black"
                                          >
                                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          )}

                          {(m.videoUrl || (m.videoUrls && m.videoUrls.length > 0)) && (
                              <div className={`mt-1.5 grid gap-1.5 ${m.videoUrls && m.videoUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                  {(m.videoUrls || [m.videoUrl]).map((url, idx) => (
                                      <div key={idx} className="relative group/vid overflow-hidden rounded-xl border border-white/10 shadow-lg bg-zinc-950 aspect-video flex items-center justify-center">
                                          <video 
                                              src={url!} 
                                              poster={getVideoPoster(url!)}
                                              className="w-full h-full object-cover cursor-pointer"
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
                                              onClick={() => handleDownloadMedia(url!)}
                                              className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover/vid:opacity-100 transition-all hover:bg-black z-10"
                                          >
                                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          )}

                          {(m.audioUrl || (m.audioUrls && m.audioUrls.length > 0)) && (
                            <div className="mt-1.5 grid gap-1.5">
                              {(m.audioUrls || [m.audioUrl]).filter(Boolean).map((url, idx) => (
                                <VoiceNotePlayer
                                  key={`audio-${idx}`}
                                  url={url!}
                                  isMe={isMe}
                                  themeClass={activeTheme.bubbleMe}
                                  onRequestPlay={handleRequestPlayAudio}
                                />
                              ))}
                            </div>
                          )}

                          <div className={`text-[8px] mt-1 flex items-center gap-1 font-normal uppercase tracking-wider opacity-60 ${isMe ? 'justify-end' : 'justify-start'}`}>
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
                            isPinned={(m.pinnedBy || []).includes(currentUser)}
                            onPin={() => handleTogglePinMessage(m._id)}
                            onCopy={m.text ? () => handleCopyMessage(m.text || "") : undefined}
                            onEdit={isMe && m.text ? () => {
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
            <div className="flex items-start gap-1.5 max-w-[95%] sm:max-w-[85%] mb-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-zinc-800/50 overflow-hidden shadow-md">
                  <img src={partnerAvatarSrc} className="w-full h-full object-cover" alt="" />
                </div>
              </div>
              <div
                className={`relative px-3.5 py-2.5 ${activeTheme.bubblePartner} rounded-2xl rounded-tl-sm border border-zinc-700/30 shadow-md`}
              >
                <span className="flex items-center gap-1 h-4" aria-label="typing">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400/90 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400/90 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400/90 animate-bounce [animation-delay:300ms]" />
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
    </div>
    </div>
  );
}; 


// hello