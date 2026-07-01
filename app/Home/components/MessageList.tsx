import React, { Fragment } from "react";
import { Message, PresenceUser, Theme, ReactionType } from "../types";
import { renderMessage, getVideoPoster } from "../../../lib/utils";
import { REACTION_EMOJIS, REACTION_OPTIONS } from "../constants";
import { ReactionBurst } from "./ReactionBurst";
import { MessageActionMenu } from "./MessageActionMenu";

interface MessageListProps {
  messages: Message[];
  groupedMessages: { date: string; label: string; messages: Message[] }[];
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
  setPreviewMessage: (m: Message | null) => void;
  setPreviewImageIndex: (index: number) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  groupedMessages,
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
  setPreviewMessage,
  setPreviewImageIndex,
}) => {
  const [swipingMessageId, setSwipingMessageId] = React.useState<string | null>(null);
  const [swipeDistance, setSwipeDistance] = React.useState(0);
  const [zoomedAvatar, setZoomedAvatar] = React.useState<string | null>(null);
  const [reactionPickerId, setReactionPickerId] = React.useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = React.useState<string | null>(null);
  const [burstReaction, setBurstReaction] = React.useState<ReactionType | null>(null);
  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const swipeMovedRef = React.useRef(false);
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = React.useRef(false);
  const listRootRef = React.useRef<HTMLDivElement>(null);

  const pinnedMessages = React.useMemo(
    () => messages.filter((m) => (m.pinnedBy || []).includes(currentUser)),
    [messages, currentUser]
  );
  const pinnedIds = React.useMemo(
    () => new Set(pinnedMessages.map((m) => m._id)),
    [pinnedMessages]
  );

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

  const startLongPress = (messageId: string) => {
    if (/^\d+$/.test(messageId)) return;
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

  const handleBurstComplete = () => {
    if (burstReaction) {
      setBurstReaction(null);
    } else if (partnerBurstReaction) {
      onPartnerBurstComplete?.();
    }
  };

  return (
    <div ref={listRootRef} className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
      {reactionPickerId && (
        <div
          className="absolute inset-0 z-[10]"
          aria-hidden
          onClick={closeReactionPicker}
        />
      )}
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
          {pinnedMessages.length > 0 && (
            <div className="mb-4 pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2 mb-3 px-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2z" /></svg>
                <span className="text-[10px] font-medium uppercase tracking-widest text-amber-400/80">Pinned</span>
              </div>
              <div className="flex flex-col gap-2">
                {pinnedMessages.map((m) => {
                  const isMe = m.createdBy.trim().toLowerCase() === currentUser.trim().toLowerCase();
                  return (
                    <button
                      key={`pin-${m._id}`}
                      onClick={() => {
                        const el = document.getElementById(`message-${m._id}`);
                        el?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      className={`w-full text-left p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors ${isMe ? "ml-auto max-w-[85%]" : "max-w-[85%]"}`}
                    >
                      <p className="text-[9px] font-medium uppercase tracking-wider text-amber-400/70 mb-1">{m.createdBy}</p>
                      <p className="text-xs text-zinc-300 line-clamp-2">{m.text || "📎 Media message"}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {groupedMessages.map((group) => (
            <div key={group.date} className="flex flex-col relative">
              <div className="flex justify-center mb-4 sticky top-0 z-[40] -mx-4 py-2 pointer-events-none">
                <div className="bg-zinc-800/80 text-zinc-400 text-[11px] font-medium uppercase tracking-widest px-4 py-1.5 rounded-full border border-zinc-700/50 shadow-sm backdrop-blur-sm pointer-events-auto">
                  {group.label}
                </div>
              </div>
              {group.messages.filter((m) => !pinnedIds.has(m._id)).map((m) => {
                const isMe = m.createdBy.trim().toLowerCase() === currentUser.trim().toLowerCase();
                const partnerUsername = currentUser.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1";
                const userObj = users.find((u) => u.username.trim().toLowerCase() === m.createdBy.trim().toLowerCase());
                const partner = users.find((u) => u.username.trim().toLowerCase() === partnerUsername);
                
                const isOnline = userObj ? (Date.now() - new Date(userObj.lastSeen).getTime() < 20000) : false;

                const isRead =
                  isMe &&
                  !!partner?.lastReadAt &&
                  new Date(m.createdAt).getTime() <= new Date(partner.lastReadAt).getTime();
                const isOptimistic = /^\d+$/.test(m._id);
                const avatarSrc = m.createdBy.trim().toLowerCase() === "alpha 1" ? "/female.png" : "/male.png";

                return (
                  <div
                    key={m._id}
                    id={`message-${m._id}`}
                    onTouchStart={(e) => {
                      swipeMovedRef.current = false;
                      touchStartRef.current = {
                        x: e.touches[0].clientX,
                        y: e.touches[0].clientY,
                        time: Date.now(),
                      };
                    }}
                    onTouchMove={(e) => {
                      if (!touchStartRef.current) return;
                      const deltaX = e.touches[0].clientX - touchStartRef.current.x;
                      const deltaY = e.touches[0].clientY - touchStartRef.current.y;
                      const distance = Math.hypot(deltaX, deltaY);

                      if (distance > 10) swipeMovedRef.current = true;
                      
                      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
                        clearLongPressTimer();
                        setSwipingMessageId(m._id);
                        setSwipeDistance(Math.min(deltaX, 80));
                      }
                    }}
                    onTouchEnd={() => {
                      const wasLongPress = longPressTriggeredRef.current;
                      const currentSwipe = swipingMessageId === m._id ? swipeDistance : 0;
                      clearLongPressTimer();
                      if (!wasLongPress && currentSwipe > 60 && swipeMovedRef.current) {
                        closeReactionPicker();
                        closeActionMenu();
                        setReplyingTo(m);
                        if (window.navigator.vibrate) window.navigator.vibrate(10);
                      }
                      if (wasLongPress) longPressTriggeredRef.current = false;
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
                    } ${reactionPickerId === m._id || actionMenuId === m._id ? "z-20" : ""}`}
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
                    
                    <div className={`flex items-start gap-1.5 max-w-[95%] sm:max-w-[85%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
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
                        className={`flex flex-col gap-0.5 relative ${
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
                          onTouchStart={(e) => {
                            if ((e.target as HTMLElement).closest("a, button, img, video, textarea")) return;
                            e.stopPropagation();
                            startLongPress(m._id);
                          }}
                          onTouchMove={(e) => {
                            if ((e.target as HTMLElement).closest("a, button, img, video, textarea")) return;
                            clearLongPressTimer();
                          }}
                          onTouchEnd={() => clearLongPressTimer()}
                          onMouseDown={(e) => {
                            if ((e.target as HTMLElement).closest("a, button, img, video, textarea")) return;
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
                            reactionPickerId === m._id && !isMe
                              ? "ring-2 ring-white/40 shadow-lg scale-[1.02]"
                              : ""
                          } ${
                            actionMenuId === m._id ? "ring-2 ring-amber-400/50 shadow-lg" : ""
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
                                      className="w-full bg-zinc-950/50 border border-white/20 rounded-xl p-2 text-sm text-white outline-none focus:border-white/40 min-h-[60px] resize-none"
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

                          <div className={`text-[8px] mt-1 flex items-center gap-1 font-normal uppercase tracking-wider opacity-60 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                            <div className={`absolute -bottom-2 ${isMe ? 'right-2' : 'left-2'} flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-900/90 border border-zinc-700/50 rounded-full shadow-lg backdrop-blur-sm reaction-badge-pop`}>
                              {(m.reactions || []).map((r) => (
                                <span key={r.user} className="text-sm leading-none" title={r.user}>
                                  {REACTION_EMOJIS[r.type]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {reactionPickerId === m._id && !isMe && (
                          <div
                            data-reaction-picker
                            className="absolute z-30 left-1/2 -translate-x-1/2 -top-14 flex items-center gap-0.5 px-2 py-1.5 bg-zinc-900/95 border border-zinc-600/60 rounded-full shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 max-w-[min(92vw,360px)] overflow-x-auto no-scrollbar"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {REACTION_OPTIONS.map((opt) => {
                              const myReaction = (m.reactions || []).find(r => r.user === currentUser);
                              const isActive = myReaction?.type === opt.type;
                              return (
                                <button
                                  key={opt.type}
                                  onClick={() => handleReactionSelect(m._id, opt.type)}
                                  className={`p-1.5 sm:p-2 rounded-full text-lg sm:text-xl shrink-0 transition-all active:scale-125 hover:scale-110 ${
                                    isActive ? "bg-white/20 ring-2 ring-white/40 scale-110" : "hover:bg-zinc-800"
                                  }`}
                                  title={opt.label}
                                >
                                  {REACTION_EMOJIS[opt.type]}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {actionMenuId === m._id && !isOptimistic && (
                          <MessageActionMenu
                            message={m}
                            isMe={isMe}
                            isPinned={(m.pinnedBy || []).includes(currentUser)}
                            align={isMe ? "right" : "left"}
                            onPin={() => handleTogglePinMessage(m._id)}
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
                );
              })}
            </div>
          ))}
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