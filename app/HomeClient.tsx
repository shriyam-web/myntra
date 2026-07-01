"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as actions from "../lib/actions";
import { useAppData } from "./Home/hooks/useAppData";
import { useMessageSendQueue } from "./Home/hooks/useMessageSendQueue";
import { useAudio } from "./Home/hooks/useAudio";
import { usePresence } from "./Home/hooks/usePresence";
import { themes, wallpapers } from "./Home/constants";
import { ViewType, Message, UserType, TabType, ReactionType, MessageReaction } from "./Home/types";

// Components
import { LoginView } from "./Home/components/LoginView";
import { IncognitoVerify } from "./Home/components/IncognitoVerify";
import { ChatHeader } from "./Home/components/ChatHeader";
import { TabNavigation } from "./Home/components/TabNavigation";
import { ComplaintsTab } from "./Home/components/ComplaintsTab";
import { WishlistTab } from "./Home/components/WishlistTab";
import { PlansTab } from "./Home/components/PlansTab";
import { TimelineTab } from "./Home/components/TimelineTab";
import { MessageList } from "./Home/components/MessageList";
import { ChatInput } from "./Home/components/ChatInput";
import { ChatWallpaper } from "./Home/components/ChatWallpaper";
import { ThemeSettings } from "./Home/components/ThemeSettings";
import { EmeButton } from "./Home/components/EmeButton";
import { ClearHistoryModal } from "./Home/components/ClearHistoryModal";
import { MediaTab } from "./Home/components/MediaTab";
import { CallOverlay } from "./Home/components/CallOverlay";
import { useCall } from "./Home/hooks/useCall";
import { useRealtimeSync } from "./Home/hooks/useRealtimeSync";
import { CallLogsTab } from "./Home/components/CallLogsTab";

export default function HomeClient() {
  const [isIncognito, setIsIncognito] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [view, setView] = useState<ViewType>("login");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("complaints");
  
  const [messageLimit, setMessageLimit] = useState(50);
  
  // Custom Hooks
  const {
    tickets,
    messages, setMessages,
    callLogs,
    mediaMessages,
    wishlist,
    plans,
    dates,
    users, setUsers,
    hasMoreMessages,
    isRefreshing,
    maintenanceMode,
    maintenanceEnabledAt,
    fetchInitialData,
    fetchMessagesOnly,
    fetchAllMedia
  } = useAppData(view, messageLimit);

  const handleManualRefresh = useCallback(async (silent = false) => {
    await fetchInitialData(silent);
    if (!silent) setLastRefreshedAt(new Date());
  }, [fetchInitialData]);

  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const { playSound, handleToggleSound: baseToggleSound } = useAudio(isSoundEnabled, setIsSoundEnabled, view);
  
  const handleToggleSound = useCallback(() => {
    baseToggleSound();
  }, [baseToggleSound]);
  
  const {
    connectionStatusDisplay,
    handleMarkAsRead,
    hasUnreadMessages,
    getPartnerStatus
  } = usePresence(users, setUsers, view, messages);

  // UI States
  const [newTicket, setNewTicket] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newWish, setNewWish] = useState("");
  const [newPlan, setNewPlan] = useState("");
  const [newEvent, setNewEvent] = useState("");
  const [newDate, setNewDate] = useState("");
  
  const [editingWish, setEditingWish] = useState<string | null>(null);
  const [editingWishText, setEditingWishText] = useState("");
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingPlanText, setEditingPlanText] = useState("");
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingDateText, setEditingDateText] = useState("");
  const [editingEventText, setEditingEventText] = useState("");
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeMessageActions, setActiveMessageActions] = useState<string | null>(null);
  const [isMessageExpanded, setIsMessageExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [includeSavedInDelete, setIncludeSavedInDelete] = useState(false);
  
  const [chatWallpaper, setChatWallpaper] = useState<string>("");
  const [chatBgColor, setChatBgColor] = useState<string>("bg-zinc-900/50");
  const [chatBubbleColor, setChatBubbleColor] = useState<string>("bg-indigo-600");
  const [themeName, setThemeName] = useState<string>("Midnight (Default)");
  
  
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewMessage, setPreviewMessage] = useState<Message | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [pullUpDistance, setPullUpDistance] = useState(0);
  const [isPullingUp, setIsPullingUp] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const prevLastMessageIdRef = useRef<string | null>(null);
  const reactionsSnapshotRef = useRef<Map<string, string>>(new Map());
  const shownReactionBurstsRef = useRef<Set<string>>(new Set());
  const [partnerBurstReaction, setPartnerBurstReaction] = useState<ReactionType | null>(null);

  const handlePartnerBurstComplete = useCallback(() => {
    setPartnerBurstReaction(null);
  }, []);

  const currentUser = view;

  const {
    callStatus,
    endReason,
    isIncoming,
    partnerName,
    localStream,
    remoteStream,
    handleStartCall,
    handleAcceptCall,
    handleEndCall,
    handleRejectCall
  } = useCall(currentUser as string, view);

  useEffect(() => {
    if (activeTab === "media") {
      fetchAllMedia();
    }
  }, [activeTab, fetchAllMedia]);

  useEffect(() => {
    if (isMessageExpanded && activeTab === "messages") {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isMessageExpanded, activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handlers
  useEffect(() => {
    if (activeTab === "messages") {
      const currentLastMessageId = messages.length > 0 ? messages[messages.length - 1]._id : null;
      const isNewMessage = currentLastMessageId !== prevLastMessageIdRef.current;

      if (isNewMessage) {
        const lastMsg = messages[messages.length - 1];
        const isMyMessage = lastMsg?.createdBy === currentUser;

        if (prevLastMessageIdRef.current === null || isMyMessage || !showScrollButton) {
          scrollToBottom(messages.length <= messageLimit);
        }
      }
      prevLastMessageIdRef.current = currentLastMessageId;
    }
  }, [activeTab, messages, messageLimit, showScrollButton, currentUser]);

  useRealtimeSync(view, useCallback(() => {
    fetchMessagesOnly(true);
  }, [fetchMessagesOnly]));

  useEffect(() => {
    if (view !== "login") {
      fetchInitialData();
      actions.updatePresence(view as string);

      const presenceInterval = setInterval(() => {
        actions.updatePresence(view as string);
      }, 10000);

      return () => {
        clearInterval(presenceInterval);
      };
    }
  }, [view, fetchInitialData]);

  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[0];
      if (latestMessage.createdBy !== currentUser && latestMessage._id !== lastMessageIdRef.current) {
        playSound();
        lastMessageIdRef.current = latestMessage._id;
      }
    }
  }, [messages, currentUser, playSound]);

  useEffect(() => {
    if (activeTab !== "messages" || view === "login") return;

    const partnerUsername =
      currentUser.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1";

    for (const m of messages) {
      const partnerReaction = (m.reactions || []).find(
        (r) => r.user.trim().toLowerCase() === partnerUsername
      );
      const partnerSig = partnerReaction?.type ?? "";
      const prevSig = reactionsSnapshotRef.current.get(m._id);

      if (prevSig !== undefined && partnerSig && partnerSig !== prevSig) {
        const burstKey = `${m._id}:${partnerSig}`;
        if (!shownReactionBurstsRef.current.has(burstKey)) {
          shownReactionBurstsRef.current.add(burstKey);
          setPartnerBurstReaction(partnerReaction!.type);
          break;
        }
      }

      reactionsSnapshotRef.current.set(m._id, partnerSig);
    }
  }, [messages, currentUser, activeTab, view]);

  useEffect(() => {
    const checkIncognito = async () => {
      try {
        const isPrivate = await actions.checkIncognito();
        setIsIncognito(isPrivate);
      } catch (e) {
        setIsIncognito(false);
      }
    };
    checkIncognito();
  }, []);

  useEffect(() => {
    if (activeTab === "messages" && messages.length > 0) {
      const hasUnread = messages.some(m => {
        const isMe = m.createdBy.trim().toLowerCase() === currentUser.trim().toLowerCase();
        if (isMe) return false;
        
        const me = users.find(u => u.username.trim().toLowerCase() === currentUser.trim().toLowerCase());
        if (!me?.lastReadAt) return true;
        
        return new Date(m.createdAt).getTime() > new Date(me.lastReadAt).getTime();
      });

      if (hasUnread) {
        handleMarkAsRead();
      }
    }
  }, [activeTab, messages, currentUser, users, handleMarkAsRead]);

  // Sync preferences from database to local state
  useEffect(() => {
    if (view !== "login" && users.length > 0) {
      const me = users.find(u => u.username.trim().toLowerCase() === view.trim().toLowerCase());
      if (me) {
        if (me.chatWallpaper !== undefined) setChatWallpaper(me.chatWallpaper || "");
        if (me.chatBackgroundColor) setChatBgColor(me.chatBackgroundColor);
        if (me.chatBubbleColor) setChatBubbleColor(me.chatBubbleColor);
        if (me.themeName) setThemeName(me.themeName);
      }
    }
  }, [view, users]);

  // Handlers
  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const lowerPassword = password.toLowerCase().trim();
    if (lowerPassword === "icai") {
      setView("alpha 1");
    } else if (lowerPassword === "gamma2") {
      setView("delta 1");
    }
  };

  const handleCreateTicket = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTicket.trim()) return;
    try {
      await actions.createTicket(newTicket, currentUser);
      setNewTicket("");
      fetchInitialData();
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  const handleToggleTicketStatus = async (id: string, currentStatus: string) => {
    try {
      await actions.updateTicketStatus(id, currentStatus === "open" ? "closed" : "open");
      fetchInitialData();
    } catch (error) {
      console.error('Failed to update ticket:', error);
    }
  };

  const handleCreateWish = async () => {
    if (!newWish.trim()) return;
    try {
      await actions.createWish(newWish, currentUser);
      setNewWish("");
      fetchInitialData();
    } catch (error) {
      console.error('Failed to create wish:', error);
    }
  };

  const handleUpdateWish = async (id: string, content: string) => {
    try {
      await actions.updateWish(id, content);
      setEditingWish(null);
      setEditingWishText("");
      fetchInitialData();
    } catch (error) {
      console.error('Failed to update wish:', error);
    }
  };

  const handleDeleteWish = async (id: string) => {
    try {
      await actions.deleteWish(id);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to delete wish:', error);
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.trim()) return;
    try {
      await actions.createPlan(newPlan, currentUser);
      setNewPlan("");
      fetchInitialData();
    } catch (error) {
      console.error('Failed to create plan:', error);
    }
  };

  const handleUpdatePlan = async (id: string, content: string) => {
    try {
      await actions.updatePlan(id, content);
      setEditingPlan(null);
      setEditingPlanText("");
      fetchInitialData();
    } catch (error) {
      console.error('Failed to update plan:', error);
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      await actions.deletePlan(id);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  const handleCreateDate = async () => {
    if (!newEvent.trim() || !newDate.trim()) return;
    try {
      await actions.createDate(newEvent, newDate, currentUser);
      setNewEvent("");
      setNewDate("");
      fetchInitialData();
    } catch (error) {
      console.error('Failed to create date:', error);
    }
  };

  const handleUpdateDate = async (id: string, event: string, date: string) => {
    try {
      await actions.updateDate(id, { event, date });
      setEditingDate(null);
      setEditingDateText("");
      setEditingEventText("");
      fetchInitialData();
    } catch (error) {
      console.error('Failed to update date:', error);
    }
  };

  const handleDeleteDate = async (id: string) => {
    try {
      await actions.deleteDate(id);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to delete date:', error);
    }
  };

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }, []);

  const uploadToCloudinary = useCallback(async (file: File, onProgress: (percent: number) => void): Promise<string> => {
    try {
      const { timestamp, signature, apiKey, cloudName, folder } = await actions.getCloudinarySignature();
      
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/upload`, true);
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
        
        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve(response.secure_url);
          } else {
            console.error('Cloudinary upload error:', xhr.responseText);
            reject(new Error('Upload failed with status ' + xhr.status));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error during upload'));
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey!);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
        formData.append('folder', folder);
        
        xhr.send(formData);
      });
    } catch (err) {
      console.error('Failed to get upload signature:', err);
      const base64 = await fileToBase64(file);
      return await actions.uploadImage(base64, file.type.startsWith('video/') ? 'video' : 'image');
    }
  }, [fileToBase64]);

  const {
    enqueueMessage,
    sendQueueStatus,
    sendError,
    lastFailedText,
    dismissSendError,
  } = useMessageSendQueue({
    currentUser,
    setMessages,
    fetchMessagesOnly,
    uploadToCloudinary,
  });

  const handleSendMessage = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    const payload = {
      text: newMessage,
      files: [...selectedFiles],
      imagePreviewUrls: [...selectedImages],
      videoPreviewUrls: [...selectedVideos],
      replyingTo,
    };

    setNewMessage("");
    setSelectedImages([]);
    setSelectedVideos([]);
    setSelectedFiles([]);
    setReplyingTo(null);

    enqueueMessage(payload);
  }, [
    newMessage,
    selectedFiles,
    selectedImages,
    selectedVideos,
    replyingTo,
    enqueueMessage,
    setReplyingTo,
  ]);

  const handleDeleteMessage = async (id: string) => {
    try {
      let deleteFromCloudinaryToo = false;
      const messageToDelete = messages.find(m => m._id === id);
      const hasMedia = messageToDelete && (
        messageToDelete.imageUrl || 
        (messageToDelete.imageUrls && messageToDelete.imageUrls.length > 0) ||
        messageToDelete.videoUrl || 
        (messageToDelete.videoUrls && messageToDelete.videoUrls.length > 0)
      );

      if (currentUser === "delta 1" && hasMedia) {
        deleteFromCloudinaryToo = window.confirm("You have the exclusive power to delete media from Cloudinary. \n\nDelete from Cloudinary too?");
      }

      setMessages(prev => prev.filter(m => m._id !== id));
      await actions.deleteMessage(id, deleteFromCloudinaryToo);
    } catch (error) {
      console.error('Failed to delete message:', error);
      fetchInitialData();
    }
  };

  const handleUpdateMessage = async (id: string, text: string) => {
    try {
      // Optimistic update
      setMessages(prev => prev.map(m => m._id === id ? { ...m, text } : m));
      setEditingMessage(null);
      setEditingMessageText("");
      
      // Perform server update
      const updatedMessage = await actions.updateMessage(id, text);
      
      // Update with the actual server version
      if (updatedMessage) {
        setMessages(prev => prev.map(m => m._id === id ? updatedMessage : m));
      }
    } catch (error) {
      console.error('Failed to update message:', error);
      fetchInitialData();
    }
  };

  const handleToggleSaveMessage = async (id: string) => {
    try {
      setMessages(prev => prev.map(m => {
        if (m._id === id) {
          const isSaved = (m.savedBy || []).includes(currentUser);
          const newSavedBy = isSaved 
            ? (m.savedBy || []).filter(u => u !== currentUser)
            : [...(m.savedBy || []), currentUser];
          return { ...m, savedBy: newSavedBy };
        }
        return m;
      }));
      await actions.toggleSaveMessage(id, currentUser);
    } catch (error) {
      console.error('Failed to toggle save message:', error);
      fetchInitialData();
    }
  };

  const handleTogglePinMessage = async (id: string) => {
    try {
      setMessages(prev => prev.map(m => {
        if (m._id === id) {
          const isPinned = (m.pinnedBy || []).includes(currentUser);
          const newPinnedBy = isPinned
            ? (m.pinnedBy || []).filter(u => u !== currentUser)
            : [...(m.pinnedBy || []), currentUser];
          return { ...m, pinnedBy: newPinnedBy };
        }
        return m;
      }));
      await actions.togglePinMessage(id, currentUser);
    } catch (error) {
      console.error('Failed to toggle pin message:', error);
      fetchInitialData();
    }
  };

  const handleReactToMessage = async (id: string, reaction: ReactionType) => {
    try {
      setMessages(prev => prev.map(m => {
        if (m._id !== id) return m;
        const existing = (m.reactions || []).find(r => r.user === currentUser);
        let newReactions;
        if (existing?.type === reaction) {
          newReactions = (m.reactions || []).filter(r => r.user !== currentUser);
        } else if (existing) {
          newReactions = (m.reactions || []).map(r =>
            r.user === currentUser ? { user: currentUser, type: reaction } : r
          );
        } else {
          newReactions = [...(m.reactions || []), { user: currentUser, type: reaction }];
        }
        return { ...m, reactions: newReactions };
      }));

      const updated = await actions.reactToMessage(id, currentUser, reaction);
      if (updated) {
        setMessages(prev => prev.map(m => m._id === id ? updated : m));
      }
    } catch (error) {
      console.error('Failed to react to message:', error);
      fetchInitialData();
    }
  };

  const handleDeleteAllMessages = async () => {
    try {
      // Optimistic clear for messages only
      if (activeTab === "messages") {
        setMessages([]);
      }
      await actions.deleteAllMessages(false, currentUser, includeSavedInDelete);
      setShowClearHistoryModal(false);
    } catch (error) {
      console.error('Failed to purge history:', error);
      fetchInitialData();
    }
  };

  const handleDownloadMedia = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const mimeType = blob.type;
      const extension = mimeType.split('/')[1] || 'bin';
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `media-${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `media-${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleUpdateChatPreferences = useCallback(async (updates: { 
    chatBackgroundColor?: string; 
    chatBubbleColor?: string; 
    themeName?: string; 
    chatWallpaper?: string; 
  }) => {
    try {
      await actions.updateChatPreferences(currentUser, updates);
    } catch (error) {
      console.error('Failed to update preferences:', error);
      fetchInitialData(true);
    }
  }, [currentUser, fetchInitialData]);

  const handleLogout = () => {
    setView("login");
    window.location.href = "about:blank";
  };

  const loadMoreMessages = () => {
    setMessageLimit(prev => prev + 50);
  };

  const scrollToBottom = (instant = false) => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: instant ? 'auto' : 'smooth'
        });
      }
    }, 100);
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  const formatDateLabel = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (msgDate.getTime() === today.getTime()) return "Today";
    if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }, []);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; label: string; messages: Message[] }[] = [];
    messages.forEach(m => {
      const dateObj = new Date(m.createdAt);
      const dateKey = dateObj.toLocaleDateString('en-GB');
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === dateKey) {
        lastGroup.messages.push(m);
      } else {
        groups.push({ date: dateKey, label: formatDateLabel(m.createdAt), messages: [m] });
      }
    });
    return groups;
  }, [messages, formatDateLabel]);

  const activeTheme = themes.find(t => t.name === themeName) || themes[0];
  const partnerUsername = currentUser.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1";
  const partnerAvatar = partnerUsername === "alpha 1" ? "/female.png" : "/male.png";

  if (isIncognito === null) return <IncognitoVerify status="verifying" />;
  if (isIncognito === false) return <IncognitoVerify status="blocked" />;
  if (view === "login") return <LoginView password={password} setPassword={setPassword} handleLogin={handleLogin} />;

  return (
    <div className="flex flex-col min-h-[100svh] bg-zinc-950 text-zinc-100 font-sans pb-2 selection:bg-white selection:text-black">
      <div className="sticky top-0 z-50">
        {!(isMessageExpanded && activeTab === "messages") && (
        <ChatHeader 
          connectionStatusDisplay={connectionStatusDisplay}
          currentUser={currentUser}
          isSoundEnabled={isSoundEnabled}
          handleToggleSound={handleToggleSound}
          isRefreshing={isRefreshing}
          fetchInitialData={handleManualRefresh}
          handleLogout={handleLogout}
        />
        )}

        {!(isMessageExpanded && activeTab === "messages") && (
        <TabNavigation 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tickets={tickets}
          wishlist={wishlist}
          plans={plans}
          messages={messages}
          currentUser={currentUser}
        />
        )}
      </div>

      <main className={`flex-1 w-full px-4 pt-4 pb-10 md:pb-16 ${
        isMessageExpanded && activeTab === "messages" ? "overflow-hidden" : "max-w-md mx-auto"
      }`}>
        {activeTab === "complaints" && (
          <ComplaintsTab 
            tickets={tickets}
            currentUser={currentUser}
            newTicket={newTicket}
            setNewTicket={setNewTicket}
            handleCreateTicket={handleCreateTicket}
            handleUpdateTicketStatus={handleToggleTicketStatus}
          />
        )}

        {activeTab === "wishlist" && (
          <WishlistTab 
            wishlist={wishlist}
            newWish={newWish}
            setNewWish={setNewWish}
            handleCreateWish={handleCreateWish}
            editingWish={editingWish}
            setEditingWish={setEditingWish}
            editingWishText={editingWishText}
            setEditingWishText={setEditingWishText}
            handleUpdateWish={handleUpdateWish}
            handleDeleteWish={handleDeleteWish}
          />
        )}

        {activeTab === "plans" && (
          <PlansTab 
            plans={plans}
            newPlan={newPlan}
            setNewPlan={setNewPlan}
            handleCreatePlan={handleCreatePlan}
            editingPlan={editingPlan}
            setEditingPlan={setEditingPlan}
            editingPlanText={editingPlanText}
            setEditingPlanText={setEditingPlanText}
            handleUpdatePlan={handleUpdatePlan}
            handleDeletePlan={handleDeletePlan}
          />
        )}

        {activeTab === "dates" && (
          <TimelineTab 
            dates={dates}
            newEvent={newEvent}
            setNewEvent={setNewEvent}
            newDate={newDate}
            setNewDate={setNewDate}
            handleCreateDate={handleCreateDate}
            editingDate={editingDate}
            setEditingDate={setEditingDate}
            editingDateText={editingDateText}
            setEditingDateText={setEditingDateText}
            editingEventText={editingEventText}
            setEditingEventText={setEditingEventText}
            handleUpdateDate={handleUpdateDate}
            handleDeleteDate={handleDeleteDate}
          />
        )}

        {activeTab === "calls" && (
          <CallLogsTab 
            callLogs={callLogs}
            currentUser={currentUser as any}
          />
        )}

        {activeTab === "media" && (
          <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
            <button 
              onClick={() => setActiveTab("messages")}
              className="flex items-center gap-2 mb-6 text-zinc-500 hover:text-white transition-colors group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">Back to Messages</span>
            </button>
            <MediaTab 
              messages={mediaMessages}
              activeTheme={activeTheme}
              handleDownloadMedia={handleDownloadMedia}
              setPreviewMessage={setPreviewMessage}
              setPreviewImageIndex={setPreviewImageIndex}
              isLoading={isRefreshing}
            />
          </div>
        )}

        {activeTab === "messages" && (
          <>
            {currentUser.trim().toLowerCase() === "alpha 1" && (
              <EmeButton />
            )}
          <div className={`flex flex-col ${
            isMessageExpanded
              ? "fixed inset-0 z-[60] bg-zinc-950 h-[100dvh] max-h-[100dvh] overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
              : "gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
          }`}>
             {maintenanceMode && currentUser.trim().toLowerCase() === "delta 1" && (
               <div className={`shrink-0 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 ${
                 isMessageExpanded ? "mx-4 mt-3" : "mb-3"
               }`}>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 mb-1">
                   Maintenance mode active
                 </p>
                 <p className="text-xs text-amber-100/80 leading-relaxed">
                   Alpha 1 turned on the decoy redirect. New visits go elsewhere — you can still chat here until you refresh.
                   {maintenanceEnabledAt && (
                     <span className="block mt-1 text-amber-200/50">
                       Since {new Date(maintenanceEnabledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                     </span>
                   )}
                 </p>
               </div>
             )}
             <div className={`flex items-center justify-between shrink-0 ${
               isMessageExpanded ? "px-4 py-3 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-xl" : "px-1"
             }`}>
                <div className="flex items-center gap-3 min-w-0">
                  {isMessageExpanded && (
                    <div className="w-9 h-9 rounded-full border border-zinc-700 overflow-hidden shrink-0 shadow-lg">
                      <img src={partnerAvatar} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex flex-col items-start gap-0.5 min-w-0">
                    {isMessageExpanded && (
                      <span className="text-sm font-medium text-white truncate capitalize">{partnerUsername}</span>
                    )}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider ${getPartnerStatus() === "Online" ? "text-green-500" : "text-zinc-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getPartnerStatus() === "Online" ? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} />
                        {getPartnerStatus() || "Offline"}
                      </span>
                      {!isMessageExpanded && lastRefreshedAt && (
                        <span className="text-[9px] font-medium text-zinc-600 italic">
                          • {lastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasUnreadMessages() && (
                        <button onClick={handleMarkAsRead} className={`p-2 rounded-xl ${activeTheme.bubbleMe} text-white shadow-lg active:scale-90 transition-all`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
                        </button>
                    )}
                    <button 
                        onClick={handleStartCall}
                        className="p-2 bg-green-600/20 border border-green-500/30 rounded-xl text-green-500 hover:bg-green-600 hover:text-white transition-all active:scale-90"
                        title="Start Call"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </button>
                    <button 
                        onClick={() => setIsMessageExpanded(!isMessageExpanded)}
                        className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all active:scale-90"
                    >
                        {isMessageExpanded ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v5H3M21 8h-5V3M3 16h5v5M16 21v-5h5"/></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                        )}
                    </button>

                    <div className="relative" ref={menuRef}>
                      <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`p-2 rounded-xl transition-all active:scale-90 border ${
                          isMenuOpen ? "bg-zinc-700 text-white border-zinc-600" : "bg-zinc-800/50 text-zinc-500 border-zinc-700/50 hover:text-white hover:bg-zinc-800"
                        }`}
                        title="Menu"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl py-2 z-[60] animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                          <button
                            onClick={() => {
                              setActiveTab("media");
                              setIsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-left"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            <span className="text-[11px] font-bold uppercase tracking-wider">Media Gallery</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowThemeSettings(true);
                              setIsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-left"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                            <span className="text-[11px] font-bold uppercase tracking-wider">Theme & Wallpaper</span>
                          </button>
                          <div className="h-px bg-zinc-800 my-1 mx-2" />
                          <button
                            onClick={() => {
                              setShowClearHistoryModal(true);
                              setIsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-500/10 transition-colors text-left"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            <span className="text-[11px] font-bold uppercase tracking-wider">Delete Chat</span>
                          </button>
                        </div>
                      )}
                    </div>
                </div>
             </div>

             <div className={`relative flex flex-col min-h-0 flex-1 w-full mx-auto ${
               isMessageExpanded ? "max-w-lg" : "max-w-full"
             } ${chatBgColor} ${
               isMessageExpanded
                 ? "border-none shadow-none rounded-none"
                 : "rounded-[2rem] sm:rounded-[2.5rem] border border-zinc-800/50 shadow-2xl"
             } overflow-hidden backdrop-blur-xl`}>
                <div className={`absolute inset-0 pointer-events-none opacity-40 ${activeTheme.glow}`} />
                {chatWallpaper && (
                    <ChatWallpaper wallpaperValue={chatWallpaper} wallpapers={wallpapers} />
                )}
                
                <MessageList 
                    messages={messages}
                    groupedMessages={groupedMessages}
                    currentUser={currentUser}
                    activeTheme={activeTheme}
                    users={users}
                    hasMoreMessages={hasMoreMessages}
                    loadMoreMessages={loadMoreMessages}
                    messagesContainerRef={messagesContainerRef}
                    handleScroll={handleScroll}
                    setTouchStartY={setTouchStartY}
                    touchStartY={touchStartY}
                    rafRef={rafRef}
                    pullUpDistance={pullUpDistance}
                    setPullUpDistance={setPullUpDistance}
                    isPullingUp={isPullingUp}
                    setIsPullingUp={setIsPullingUp}
                    showScrollButton={showScrollButton}
                    scrollToBottom={scrollToBottom}
                    fetchInitialData={handleManualRefresh}
                    isMessageExpanded={isMessageExpanded}
                    handleDeleteMessage={handleDeleteMessage}
                    handleUpdateMessage={handleUpdateMessage}
                    handleTogglePinMessage={handleTogglePinMessage}
                    handleReactToMessage={handleReactToMessage}
                    partnerBurstReaction={partnerBurstReaction}
                    onPartnerBurstComplete={handlePartnerBurstComplete}
                    setReplyingTo={setReplyingTo}
                    editingMessage={editingMessage}
                    setEditingMessage={setEditingMessage}
                    editingMessageText={editingMessageText}
                    setEditingMessageText={setEditingMessageText}
                    handleDownloadMedia={handleDownloadMedia}
                    setPreviewMessage={setPreviewMessage}
                    setPreviewImageIndex={setPreviewImageIndex}
                />

                <ChatInput 
                    newMessage={newMessage}
                    setNewMessage={setNewMessage}
                    handleSendMessage={handleSendMessage}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    activeTheme={activeTheme}
                    isMessageExpanded={isMessageExpanded}
                    messageInputRef={messageInputRef}
                    fileInputRef={fileInputRef}
                    selectedImages={selectedImages}
                    setSelectedImages={setSelectedImages}
                    selectedVideos={selectedVideos}
                    setSelectedVideos={setSelectedVideos}
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                    sendQueueStatus={sendQueueStatus}
                    sendError={sendError}
                    lastFailedText={lastFailedText}
                    onDismissSendError={dismissSendError}
                />
             </div>
          </div>
          </>
        )}
      </main>

      <ThemeSettings 
        showThemeSettings={showThemeSettings}
        setShowThemeSettings={setShowThemeSettings}
        themes={themes}
        themeName={themeName}
        setThemeName={setThemeName}
        wallpapers={wallpapers}
        chatWallpaper={chatWallpaper}
        setChatWallpaper={setChatWallpaper}
        chatBgColor={chatBgColor}
        setChatBgColor={setChatBgColor}
        chatBubbleColor={chatBubbleColor}
        setChatBubbleColor={setChatBubbleColor}
        handleUpdateChatPreferences={handleUpdateChatPreferences}
      />

      <ClearHistoryModal 
        showClearHistoryModal={showClearHistoryModal}
        setShowClearHistoryModal={setShowClearHistoryModal}
        includeSavedInDelete={includeSavedInDelete}
        setIncludeSavedInDelete={setIncludeSavedInDelete}
        handleDeleteAllMessages={handleDeleteAllMessages}
      />

      <CallOverlay 
        currentUser={currentUser as string}
        partnerName={partnerName}
        callStatus={callStatus}
        endReason={endReason}
        isIncoming={isIncoming}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onEnd={handleEndCall}
        stream={localStream}
        remoteStream={remoteStream}
      />

      {previewMessage && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 animate-in fade-in duration-500" onClick={() => setPreviewMessage(null)}>
            <div className="relative max-w-4xl w-full h-full flex flex-col items-center justify-center gap-8" onClick={(e) => e.stopPropagation()}>
                {(() => {
                    const mediaItems = [
                        ...(previewMessage.imageUrls || (previewMessage.imageUrl ? [previewMessage.imageUrl] : [])).map(url => ({ type: 'image', url })),
                        ...(previewMessage.videoUrls || (previewMessage.videoUrl ? [previewMessage.videoUrl] : [])).map(url => ({ type: 'video', url }))
                    ];
                    const currentMedia = mediaItems[previewImageIndex] || mediaItems[0];
                    if (!currentMedia) return null;

                    return (
                        <>
                            <div className="relative w-full flex-1 flex items-center justify-center group">
                                {currentMedia.type === 'video' ? (
                                    <video 
                                        key={currentMedia.url}
                                        src={currentMedia.url} 
                                        className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
                                        controls
                                        autoPlay
                                    />
                                ) : (
                                    <img 
                                        key={currentMedia.url}
                                        src={currentMedia.url} 
                                        className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
                                    />
                                )}

                                {mediaItems.length > 1 && (
                                    <>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPreviewImageIndex((previewImageIndex - 1 + mediaItems.length) % mediaItems.length);
                                            }}
                                            className="absolute left-0 p-4 text-white/50 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full ml-4"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPreviewImageIndex((previewImageIndex + 1) % mediaItems.length);
                                            }}
                                            className="absolute right-0 p-4 text-white/50 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full mr-4"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                        </button>

                                        <div className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 flex gap-2">
                                            {mediaItems.map((_, i) => (
                                                <div 
                                                    key={i} 
                                                    className={`w-2 h-2 rounded-full transition-all ${i === previewImageIndex ? 'bg-white scale-125' : 'bg-white/20'}`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            <button 
                                onClick={() => handleDownloadMedia(currentMedia.url)}
                                className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all active:scale-95 shadow-2xl"
                            >
                                Save {currentMedia.type === 'video' ? 'Video' : 'Image'}
                            </button>
                        </>
                    );
                })()}
                <button 
                    className="absolute top-0 right-0 p-4 text-white/50 hover:text-white transition-colors"
                    onClick={() => setPreviewMessage(null)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        </div>
      )}
    </div>
  );
}
