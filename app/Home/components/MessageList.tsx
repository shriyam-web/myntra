import React, { Fragment } from "react";
import { Message, PresenceUser, Theme } from "../types";
import { renderMessage } from "../../../lib/utils";

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
  handleToggleSaveMessage: (id: string) => void;
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
  handleToggleSaveMessage,
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
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);

  return (
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
      className={`flex-1 overflow-y-auto no-scrollbar scroll-smooth px-4 ${
        isMessageExpanded ? "py-6 h-full" : "py-4 max-h-[35vh] min-h-[250px]"
      }`}
    >
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom()}
          className={`fixed bottom-32 right-10 z-[70] p-4 ${activeTheme.bubbleMe} text-white rounded-full shadow-2xl animate-bounce hover:opacity-90 active:scale-90 transition-all border-4 border-zinc-950`}
          title="Scroll to bottom"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m7 13 5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </button>
      )}
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
          <p className="text-zinc-400 font-medium text-sm tracking-tight px-4 max-w-[200px]">
            Encrypted bridge active. Send a message to start.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {groupedMessages.map((group) => (
            <div key={group.date} className="flex flex-col relative">
              <div className="flex justify-center mb-4 sticky top-0 z-[40] -mx-4 py-2 pointer-events-none">
                <div className="bg-zinc-800/80 text-zinc-400 text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-zinc-700/50 shadow-sm backdrop-blur-sm pointer-events-auto">
                  {group.label}
                </div>
              </div>
              {group.messages.map((m) => {
                const isMe = m.createdBy.trim().toLowerCase() === currentUser.trim().toLowerCase();
                const partnerUsername = currentUser.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1";
                const partner = users.find((u) => u.username.trim().toLowerCase() === partnerUsername);
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
                      touchStartRef.current = {
                        x: e.touches[0].clientX,
                        y: e.touches[0].clientY
                      };
                    }}
                    onTouchMove={(e) => {
                      if (!touchStartRef.current) return;
                      const deltaX = e.touches[0].clientX - touchStartRef.current.x;
                      const deltaY = e.touches[0].clientY - touchStartRef.current.y;
                      
                      // If horizontal swipe is dominant
                      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
                        setSwipingMessageId(m._id);
                        setSwipeDistance(Math.min(deltaX, 80));
                      }
                    }}
                    onTouchEnd={() => {
                      if (swipeDistance > 60) {
                        setReplyingTo(m);
                        if (window.navigator.vibrate) window.navigator.vibrate(10);
                      }
                      setSwipingMessageId(null);
                      setSwipeDistance(0);
                      touchStartRef.current = null;
                    }}
                    style={{
                      transform: swipingMessageId === m._id ? `translateX(${swipeDistance}px)` : 'none',
                      transition: swipingMessageId === m._id ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                    className={`flex flex-col w-full transition-all duration-300 relative group/msg ${
                      isMe ? "items-end" : "items-start"
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
                    
                    <div className={`flex items-end gap-1.5 max-w-[95%] sm:max-w-[85%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      <div 
                        className="flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
                        onClick={() => setZoomedAvatar(avatarSrc)}
                      >
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-zinc-800/50 overflow-hidden shadow-md">
                          <img src={avatarSrc} className="w-full h-full object-cover" alt="avatar" />
                        </div>
                      </div>

                      <div
                        className={`flex flex-col gap-0.5 relative ${
                          isMe ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`relative rounded-2xl p-2.5 sm:p-3 text-sm font-medium shadow-sm border border-zinc-800/10 ${
                            isMe ? `${activeTheme.bubbleMe} ${activeTheme.textMe || "text-white"}` : activeTheme.bubblePartner
                          }`}
                        >
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
                                  <p className="font-black uppercase tracking-widest mb-0.5 text-[7px] opacity-50">
                                      {m.repliedTo.createdBy}
                                  </p>
                                  <p className="line-clamp-1 italic font-bold leading-relaxed">{m.repliedTo.text || 'Media'}</p>
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

                          <div className={`text-[8px] mt-1 flex items-center gap-1 font-bold uppercase tracking-wider opacity-60 ${isMe ? 'justify-end' : 'justify-start'}`}>
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
                        </div>

                        {/* Message Actions - Now below the bubble */}
                        <div className={`flex items-center gap-1 mt-1 px-1 transition-all duration-300 ${isMe ? 'flex-row-reverse' : 'flex-row'} opacity-0 group-hover/msg:opacity-100`}>
                          <button 
                              onClick={() => setReplyingTo(m)}
                              className="p-1.5 bg-zinc-900/50 border border-zinc-800/50 rounded-full text-zinc-500 hover:text-white hover:border-zinc-700 transition-all active:scale-90"
                              title="Reply"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                          </button>
                          <button 
                              onClick={() => handleToggleSaveMessage(m._id)}
                              className={`p-1.5 bg-zinc-900/50 border border-zinc-800/50 rounded-full transition-all active:scale-90 ${
                                  (m.savedBy || []).includes(currentUser) ? 'text-yellow-500 border-yellow-500/50' : 'text-zinc-500 hover:text-white hover:border-zinc-700'
                              }`}
                              title={(m.savedBy || []).includes(currentUser) ? "Unsave" : "Save"}
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill={(m.savedBy || []).includes(currentUser) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                          </button>
                          {isMe && (
                              <>
                                  <button 
                                      onClick={() => {
                                          setEditingMessage(m._id);
                                          setEditingMessageText(m.text || '');
                                      }}
                                      className="p-1.5 bg-zinc-900/50 border border-zinc-800/50 rounded-full text-zinc-500 hover:text-white hover:border-zinc-700 transition-all active:scale-90"
                                      title="Edit"
                                  >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                  </button>
                                  <button 
                                      onClick={() => handleDeleteMessage(m._id)}
                                      className="p-1.5 bg-zinc-900/50 border border-zinc-800/50 rounded-full text-zinc-500 hover:text-red-500 hover:border-red-900/50 transition-all active:scale-90"
                                      title="Delete"
                                  >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                  </button>
                              </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
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
  );
}; 


// hello