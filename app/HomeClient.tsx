"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as actions from "../lib/actions";
import { useAppData } from "./Home/hooks/useAppData";
import { useAudio } from "./Home/hooks/useAudio";
import { usePresence } from "./Home/hooks/usePresence";
import { themes, wallpapers } from "./Home/constants";
import { ViewType, Message, UserType } from "./Home/types";

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
import { ThemeSettings } from "./Home/components/ThemeSettings";
import { ClearHistoryModal } from "./Home/components/ClearHistoryModal";
import { SoundPrompt } from "./Home/components/SoundPrompt";

export default function HomeClient() {
  const [isIncognito, setIsIncognito] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [view, setView] = useState<ViewType>("login");
  const [activeTab, setActiveTab] = useState<"complaints" | "wishlist" | "plans" | "dates" | "messages" | "emergency" | "news">("complaints");
  
  const [messageLimit, setMessageLimit] = useState(50);
  
  // Custom Hooks
  const {
    tickets,
    messages, setMessages,
    wishlist,
    plans,
    dates,
    users, setUsers,
    hasMoreMessages,
    isRefreshing,
    fetchInitialData,
    fetchMessagesOnly
  } = useAppData(view, messageLimit);

  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const { playSound, handleToggleSound } = useAudio(isSoundEnabled, setIsSoundEnabled, view);
  
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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [includeSavedInDelete, setIncludeSavedInDelete] = useState(false);
  const [showSoundPrompt, setShowSoundPrompt] = useState(false);
  
  const [chatWallpaper, setChatWallpaper] = useState<string>("");
  const [chatBgColor, setChatBgColor] = useState<string>("bg-zinc-900/50");
  const [chatBubbleColor, setChatBubbleColor] = useState<string>("bg-indigo-600");
  const [themeName, setThemeName] = useState<string>("Midnight (Default)");
  
  
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewMessage, setPreviewMessage] = useState<Message | null>(null);
  const [pullUpDistance, setPullUpDistance] = useState(0);
  const [isPullingUp, setIsPullingUp] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const currentUser = view;

  // Effects
  useEffect(() => {
    if (view !== "login") {
      fetchInitialData();
      // Initial presence update
      actions.updatePresence(view as string);
      
      const interval = setInterval(() => {
        fetchMessagesOnly(true);
        // Periodic presence update every 10 seconds
        if (Date.now() % 10000 < 3000) {
            actions.updatePresence(view as string);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [view, fetchInitialData, fetchMessagesOnly]);

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

  // Handlers
  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const lowerPassword = password.toLowerCase().trim();
    if (lowerPassword === "icai") {
      setView("alpha 1");
      setShowSoundPrompt(true);
    } else if (lowerPassword === "gamma2") {
      setView("delta 1");
      setShowSoundPrompt(true);
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    try {
      setIsUploading(true);
      const optimisticId = Date.now().toString();
      const optimisticMsg: Message = {
        _id: optimisticId,
        text: newMessage,
        createdAt: new Date().toISOString(),
        createdBy: currentUser as UserType,
        repliedTo: replyingTo ? {
            _id: replyingTo._id,
            text: replyingTo.text,
            imageUrl: replyingTo.imageUrl,
            imageUrls: replyingTo.imageUrls,
            videoUrl: replyingTo.videoUrl,
            videoUrls: replyingTo.videoUrls,
            createdBy: replyingTo.createdBy
        } : undefined
      };

      setMessages(prev => [...prev, optimisticMsg]);
      const currentNewMessage = newMessage;
      const currentSelectedFiles = [...selectedFiles];
      const currentReplyingTo = replyingTo;

      setNewMessage("");
      setSelectedImages([]);
      setSelectedVideos([]);
      setSelectedFiles([]);
      setReplyingTo(null);

      // Upload files
      const uploadedImageUrls: string[] = [];
      const uploadedVideoUrls: string[] = [];
      
      for (let i = 0; i < currentSelectedFiles.length; i++) {
        const file = currentSelectedFiles[i];
        const base64 = await fileToBase64(file);
        setUploadProgress(Math.round(((i + 1) / currentSelectedFiles.length) * 90));
        
        const url = await actions.uploadImage(base64);
        if (file.type.startsWith('video/')) {
          uploadedVideoUrls.push(url);
        } else {
          uploadedImageUrls.push(url);
        }
      }

      setUploadProgress(95);
      const serverMsg = await actions.sendMessage(currentNewMessage, currentUser, uploadedImageUrls, uploadedVideoUrls, currentReplyingTo?._id);
      setUploadProgress(100);
      
      // Update the optimistic message with the real one from the server
      if (serverMsg) {
        setMessages(prev => prev.map(m => m._id === optimisticId ? serverMsg : m));
      } else {
        fetchMessagesOnly(true);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

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

  const handleUpdateChatPreferences = async (updates: { chatBackgroundColor?: string; chatBubbleColor?: string }) => {
    try {
      await actions.updateChatPreferences(currentUser, updates);
      fetchInitialData(true);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

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

  if (isIncognito === null) return <IncognitoVerify status="verifying" />;
  if (isIncognito === false) return <IncognitoVerify status="blocked" />;
  if (view === "login") return <LoginView password={password} setPassword={setPassword} handleLogin={handleLogin} />;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-2 selection:bg-white selection:text-black">
      <ChatHeader 
        connectionStatusDisplay={connectionStatusDisplay}
        currentUser={currentUser}
        isSoundEnabled={isSoundEnabled}
        handleToggleSound={handleToggleSound}
        isRefreshing={isRefreshing}
        fetchInitialData={fetchInitialData}
        handleLogout={handleLogout}
      />

      <TabNavigation 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tickets={tickets}
        wishlist={wishlist}
        plans={plans}
        messages={messages}
        currentUser={currentUser}
      />

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-8 pb-32">
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

        {activeTab === "messages" && (
          <div className={`flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 ${isMessageExpanded ? "fixed inset-0 z-[60] bg-zinc-950 p-4 pb-20" : ""}`}>
             <div className="flex items-center justify-between px-1">
                <div className="flex flex-col items-start gap-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${getPartnerStatus() === "Online" ? "text-green-500/80" : "text-zinc-500"}`}>
                    {getPartnerStatus() || "Offline"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                    {hasUnreadMessages() && (
                        <button onClick={handleMarkAsRead} className={`p-2 rounded-xl ${activeTheme.bubbleMe} text-white shadow-lg active:scale-90 transition-all`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
                        </button>
                    )}
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
                </div>
             </div>

             <div className={`relative flex-1 flex flex-col bg-zinc-900/50 rounded-[2.5rem] border border-zinc-800/50 shadow-2xl overflow-hidden backdrop-blur-xl ${isMessageExpanded ? "rounded-3xl" : ""}`}>
                {chatWallpaper && (
                    <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: `url(${chatWallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
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
                    fetchInitialData={fetchInitialData}
                    isMessageExpanded={isMessageExpanded}
                    handleDeleteMessage={handleDeleteMessage}
                    handleUpdateMessage={handleUpdateMessage}
                    handleToggleSaveMessage={handleToggleSaveMessage}
                    setReplyingTo={setReplyingTo}
                    editingMessage={editingMessage}
                    setEditingMessage={setEditingMessage}
                    editingMessageText={editingMessageText}
                    setEditingMessageText={setEditingMessageText}
                    handleDownloadMedia={handleDownloadMedia}
                    setPreviewMessage={setPreviewMessage}
                />

                <ChatInput 
                    newMessage={newMessage}
                    setNewMessage={setNewMessage}
                    handleSendMessage={handleSendMessage}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    activeTheme={activeTheme}
                    messageInputRef={messageInputRef}
                    fileInputRef={fileInputRef}
                    selectedImages={selectedImages}
                    setSelectedImages={setSelectedImages}
                    selectedVideos={selectedVideos}
                    setSelectedVideos={setSelectedVideos}
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                />
             </div>

             {!isMessageExpanded && (
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowClearHistoryModal(true)}
                        className="flex-1 py-3 bg-red-950/20 border border-red-900/20 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-900/40 transition-all active:scale-95"
                    >
                        Purge History
                    </button>
                    <button 
                        onClick={() => setShowThemeSettings(true)}
                        className="flex-1 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all active:scale-95"
                    >
                        Config Interface
                    </button>
                </div>
             )}
          </div>
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

      <SoundPrompt 
        showSoundPrompt={showSoundPrompt}
        setShowSoundPrompt={setShowSoundPrompt}
        handleToggleSound={handleToggleSound}
      />

      {previewMessage && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 animate-in fade-in duration-500" onClick={() => setPreviewMessage(null)}>
            <div className="relative max-w-4xl w-full h-full flex flex-col items-center justify-center gap-8" onClick={(e) => e.stopPropagation()}>
                {previewMessage.videoUrl || (previewMessage.videoUrls && previewMessage.videoUrls.length > 0) ? (
                    <video 
                        src={previewMessage.videoUrl || (previewMessage.videoUrls && previewMessage.videoUrls[0])} 
                        className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                        controls
                        autoPlay
                    />
                ) : (
                    <img 
                        src={previewMessage.imageUrl || (previewMessage.imageUrls && previewMessage.imageUrls[0])} 
                        className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                    />
                )}
                <button 
                    onClick={() => handleDownloadMedia(
                        previewMessage.videoUrl || (previewMessage.videoUrls && previewMessage.videoUrls[0]) || 
                        previewMessage.imageUrl || (previewMessage.imageUrls && previewMessage.imageUrls[0])!
                    )}
                    className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all active:scale-95 shadow-2xl"
                >
                    Save Media
                </button>
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
