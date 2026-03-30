"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import * as actions from "../lib/actions";

interface Ticket {
  _id: string;
  description: string;
  status: "open" | "closed";
  createdAt: string;
  createdBy: "alpha 1" | "delta 1";
}

interface Message {
  _id: string;
  text?: string;
  imageUrl?: string;
  createdAt: string;
  createdBy: "alpha 1" | "delta 1";
  savedBy?: string[];
  repliedTo?: {
    _id: string;
    text?: string;
    imageUrl?: string;
    createdBy: string;
  };
}

interface PresenceUser {
  _id: string;
  username: string;
  lastSeen: string;
  lastReadAt?: string;
  chatBackgroundColor?: string;
  chatBubbleColor?: string;
  themeName?: string;
  chatWallpaper?: string;
}

interface WishlistItem {
  _id: string;
  content: string;
  createdBy: string;
}

interface PlanItem {
  _id: string;
  content: string;
  createdBy: string;
}

interface TimelineDate {
  _id: string;
  event: string;
  date: string;
  createdBy: string;
}

export default function HomeClient() {
  const [isIncognito, setIsIncognito] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [view, setView] = useState<"login" | "alpha 1" | "delta 1">("login");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [newTicket, setNewTicket] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [newWish, setNewWish] = useState("");
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [newPlan, setNewPlan] = useState("");
  const [dates, setDates] = useState<TimelineDate[]>([]);
  const [newEvent, setNewEvent] = useState("");
  const [newDate, setNewDate] = useState("");
  const [messageLimit, setMessageLimit] = useState(50);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [users, setUsers] = useState<PresenceUser[]>([]);

  const currentUser = view;

  const [activeTab, setActiveTab] = useState<"complaints" | "wishlist" | "plans" | "dates" | "messages" | "emergency" | "news">("complaints");

  // Edit states
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMessageExpanded, setIsMessageExpanded] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [includeSavedInDelete, setIncludeSavedInDelete] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [chatBgColor, setChatBgColor] = useState<string>("bg-zinc-900/50");
  const [chatBubbleColor, setChatBubbleColor] = useState<string>("bg-indigo-600");
  const [chatWallpaper, setChatWallpaper] = useState<string>("");
  const [themeName, setThemeName] = useState<string>("Midnight (Default)");
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [showSoundPrompt, setShowSoundPrompt] = useState(false);

  // Image handling
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewMessage, setPreviewMessage] = useState<Message | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const wallpapers = [
    { id: "none", name: "None", value: "" },
    { id: "bubbles", name: "Bubbles", value: "🫧", type: "emoji" },
    { id: "stars", name: "Stars", value: "✨", type: "emoji" },
    { id: "hearts", name: "Hearts", value: "💖", type: "emoji" },
    { id: "flowers", name: "Sakura", value: "🌸", type: "emoji" },
    { id: "butterflies", name: "Butterflies", value: "🦋", type: "emoji" },
    { id: "nature", name: "Nature", value: "🌴", type: "emoji" },
    { id: "snow", name: "Snow", value: "❄️", type: "emoji" },
    { id: "abstract-1", name: "Nebula", value: "🌌", type: "emoji" },
    { id: "abstract-2", name: "Cloud", value: "☁️", type: "emoji" },
    { id: "abstract-3", name: "Moon", value: "🌙", type: "emoji" },
    { id: "scenery-1", name: "Night Sky", value: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1200&q=80", type: "image" },
    { id: "scenery-2", name: "Forest Path", value: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80", type: "image" },
    { id: "scenery-3", name: "Ocean Waves", value: "https://images.unsplash.com/photo-1439405326854-014607f694d7?auto=format&fit=crop&w=1200&q=80", type: "image" },
    { id: "scenery-4", name: "Mountain Peak", value: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80", type: "image" },
    { id: "scenery-5", name: "Desert Dunes", value: "https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&w=1200&q=80", type: "image" },
    { id: "scenery-6", name: "Sunset Beach", value: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80", type: "image" },
    { id: "scenery-7", name: "City Lights", value: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80", type: "image" },
    { id: "scenery-8", name: "Aurora", value: "https://images.unsplash.com/photo-1531366930477-4f1f27f3c30b?auto=format&fit=crop&w=1200&q=80", type: "image" },
  ];

  const themes = [
    { name: "Midnight (Default)", bg: "bg-zinc-900/50", bubbleMe: "bg-indigo-600", bubblePartner: "bg-zinc-800/80", accent: "text-indigo-400", shadow: "shadow-indigo-500/10", glow: "bg-indigo-500/5" },
    { name: "Forest", bg: "bg-emerald-950/40", bubbleMe: "bg-emerald-700", bubblePartner: "bg-zinc-900/80", accent: "text-emerald-400", shadow: "shadow-emerald-500/10", glow: "bg-emerald-500/5" },
    { name: "Volcano", bg: "bg-red-950/40", bubbleMe: "bg-red-700", bubblePartner: "bg-zinc-900/80", accent: "text-red-400", shadow: "shadow-red-500/10", glow: "bg-red-500/5" },
    { name: "Ocean", bg: "bg-blue-950/40", bubbleMe: "bg-blue-700", bubblePartner: "bg-zinc-900/80", accent: "text-blue-400", shadow: "shadow-blue-500/10", glow: "bg-blue-500/5" },
    { name: "Purple Rain", bg: "bg-purple-950/40", bubbleMe: "bg-purple-700", bubblePartner: "bg-zinc-900/80", accent: "text-purple-400", shadow: "shadow-purple-500/10", glow: "bg-purple-500/5" },
    { name: "Cyberpunk", bg: "bg-pink-950/40", bubbleMe: "bg-pink-600", bubblePartner: "bg-zinc-900/80", accent: "text-pink-400", shadow: "shadow-pink-500/10", glow: "bg-pink-500/5" },
    { name: "Golden Hour", bg: "bg-amber-950/40", bubbleMe: "bg-amber-600", bubblePartner: "bg-zinc-900/80", accent: "text-amber-400", shadow: "shadow-amber-500/10", glow: "bg-amber-500/5" },
    { name: "Nordic", bg: "bg-slate-900/50", bubbleMe: "bg-slate-700", bubblePartner: "bg-zinc-800/80", accent: "text-slate-400", shadow: "shadow-slate-500/10", glow: "bg-slate-500/5" },
    { name: "Rose Quartz", bg: "bg-rose-950/40", bubbleMe: "bg-rose-600", bubblePartner: "bg-zinc-900/80", accent: "text-rose-400", shadow: "shadow-rose-500/10", glow: "bg-rose-500/5" },
    { name: "Toxic", bg: "bg-lime-950/40", bubbleMe: "bg-lime-600", bubblePartner: "bg-zinc-900/80", accent: "text-lime-400", shadow: "shadow-lime-500/10", glow: "bg-lime-500/5" },
    { name: "Sakura", bg: "bg-fuchsia-950/40", bubbleMe: "bg-fuchsia-600", bubblePartner: "bg-zinc-900/80", accent: "text-fuchsia-400", shadow: "shadow-fuchsia-500/10", glow: "bg-fuchsia-500/5" },
    { name: "Ghost", bg: "bg-zinc-950/80", bubbleMe: "bg-white", bubblePartner: "bg-zinc-800/80", accent: "text-white", shadow: "shadow-white/5", glow: "bg-white/5", textMe: "text-black" },
  ];
  const [isConnected, setIsConnected] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [connectionStatusDisplay, setConnectionStatusDisplay] = useState(true);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const lastSoundMessageIdRef = useRef<string | null>(null);
  const lastSoundTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const pollingWorkerRef = useRef<Worker | null>(null);

  // Keep-alive silent audio loop to prevent background throttling
  useEffect(() => {
    if (isSoundEnabled && view !== "login") {
      if (!silentAudioRef.current) {
        // 1-second silent WAV base64
        const silentSrc = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
        silentAudioRef.current = new Audio(silentSrc);
        silentAudioRef.current.loop = true;
        silentAudioRef.current.volume = 0.01; // Nearly silent
      }
      
      const playSilent = async () => {
        try {
          await silentAudioRef.current?.play();
          console.log("🔊 Keep-alive silent audio started");
        } catch (e) {
          console.warn("Silent audio failed (interaction required):", e);
        }
      };
      
      playSilent();
      
      return () => {
        silentAudioRef.current?.pause();
      };
    }
  }, [isSoundEnabled, view]);

  // Initialize Audio Context and load sound
  useEffect(() => {
    if (isSoundEnabled && !audioContextRef.current) {
      const initAudio = async () => {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContextClass();
          
          const response = await fetch("/notification1.mp3");
          const arrayBuffer = await response.arrayBuffer();
          audioBufferRef.current = await audioContextRef.current.decodeAudioData(arrayBuffer);
        } catch (e) {
          console.error("Failed to initialize Web Audio API:", e);
        }
      };
      initAudio();
    }
  }, [isSoundEnabled]);

  const playSound = useCallback(() => {
    if (!isSoundEnabled) return;

    // Prevent "sound burst" by throttling playSound calls (max once every 2 seconds)
    const now = Date.now();
    if (now - lastSoundTimeRef.current < 2000) {
      console.log("🔊 Sound throttled to prevent burst");
      return;
    }
    lastSoundTimeRef.current = now;

    const play = async (retryCount = 0) => {
      try {
        // Try Web Audio API first
        if (audioContextRef.current && audioBufferRef.current) {
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }
          const source = audioContextRef.current.createBufferSource();
          source.buffer = audioBufferRef.current;
          source.connect(audioContextRef.current.destination);
          source.start(0);
          return;
        }

        // Fallback to standard Audio object
        if (!audioRef.current) {
          audioRef.current = new Audio("/notification1.mp3");
          audioRef.current.preload = "auto";
        }
        
        // Ensure properties are set every time for background playback
        audioRef.current.muted = false;
        audioRef.current.volume = 1.0;
        audioRef.current.currentTime = 0;
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      } catch (e) {
        console.warn(`Sound play attempt ${retryCount + 1} failed:`, e);
        if (retryCount < 3) {
          setTimeout(() => play(retryCount + 1), 500);
        }
      }
    };

    play();
  }, [isSoundEnabled]);

  const handleToggleSound = useCallback(() => {
    const newSoundState = !isSoundEnabled;
    setIsSoundEnabled(newSoundState);
    
    if (newSoundState) {
      // Re-initialize AudioContext and Silent Loop on user gesture
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextClass();
        }
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        // Start silent loop immediately
        if (silentAudioRef.current) {
          silentAudioRef.current.play().catch(e => console.warn("Silent audio failed to start on toggle:", e));
        }
      } catch (e) {
        console.error("Manual audio init failed:", e);
      }
    } else {
      // Pause silent loop if turning off
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
      }
    }
  }, [isSoundEnabled]);

  const showNotification = useCallback((title: string, body: string) => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/logo.png",
        silent: false,
        vibrate: [200, 100, 200]
      } as any);
    }
  }, []);

  const activeTheme = themes.find(t => t.name === themeName) || themes[0];

  const formatDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (msgDate.getTime() === today.getTime()) {
      return "Today";
    } else if (msgDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  const scrollToBottom = (instant = false) => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: instant ? "auto" : "smooth"
        });
      }
    }, 100);
  };

  const scrollToMessage = (id: string) => {
    const element = document.getElementById(`message-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Visual feedback: highlight effect
      element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-4', 'ring-offset-zinc-900');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-4', 'ring-offset-zinc-900');
      }, 2000);
    }
  };

  const messagingSectionWrapperClass = isMessageExpanded
    ? "fixed inset-0 z-[60] bg-zinc-950 flex flex-col sm:relative sm:inset-auto sm:bg-transparent sm:z-auto sm:p-0"
    : "";

  const fetchInitialData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      const data = await actions.fetchData(messageLimit, view as string);
      setTickets(data.tickets);
      setWishlist(data.wishlist);
      setPlans(data.plans);
      setDates(data.dates);
      setUsers(data.users || []);
      
      // Update messages and check if there are more
      if (data.messages.length < messageLimit) {
        setHasMoreMessages(false);
      } else {
        setHasMoreMessages(true);
      }
      
      setMessages(data.messages);
      setIsConnected(true);
      if (!silent) setIsRefreshing(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setIsConnected(false);
      if (!silent) alert('Failed to load data. Please check your database connection.');
      setIsRefreshing(false);
    }
  }, [messageLimit, view]);

  const handleMarkAsRead = async () => {
    try {
      await actions.markAllAsRead(view as string);
      fetchInitialData(true);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const hasUnreadMessages = () => {
    const me = users.find(u => u.username.trim().toLowerCase() === currentUser.trim().toLowerCase());
    if (!me) return false;
    
    // If no lastReadAt, everything from partner is unread
    if (!me.lastReadAt) return messages.some(m => m.createdBy.trim().toLowerCase() !== currentUser.trim().toLowerCase());
    
    const lastRead = new Date(me.lastReadAt).getTime();
    return messages.some(m => 
      m.createdBy.trim().toLowerCase() !== currentUser.trim().toLowerCase() && 
      new Date(m.createdAt).getTime() > lastRead
    );
  };

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // If it's a new message from partner and sound is enabled, play sound
      if (
        currentUser !== "login" &&
        lastMessage._id !== lastSoundMessageIdRef.current && 
        lastMessage.createdBy !== currentUser
      ) {
        lastSoundMessageIdRef.current = lastMessage._id;
        
        // Only play sound if the message is relatively new (within last 2 minutes)
        // This prevents the "burst" of sounds when returning to a tab that was suspended
        const messageTime = new Date(lastMessage.createdAt).getTime();
        const now = Date.now();
        const isRecent = now - messageTime < 120000; // 2 minutes

        if (isSoundEnabled && isRecent) {
          showNotification(`New message from ${lastMessage.createdBy}`, lastMessage.text || (lastMessage.imageUrl ? "Sent an image" : ""));
          playSound();
        }
      }
      
      // Also update the scrolling ref if we're in messages tab
      if (activeTab === "messages") {
        if (lastMessage._id !== lastMessageIdRef.current) {
          lastMessageIdRef.current = lastMessage._id;
          scrollToBottom(lastMessage.createdBy === currentUser);
        }
      }
    }
  }, [messages, activeTab, currentUser, isSoundEnabled, playSound, showNotification]);

  const loadMoreMessages = () => {
    setMessageLimit(prev => prev + 50);
  };

  useEffect(() => {
    if (view !== "login" && activeTab === "messages") {
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 300);
    }
  }, [activeTab, view, isMessageExpanded]);

  useEffect(() => {
    if (view !== "login" && activeTab === "messages" && hasUnreadMessages()) {
      handleMarkAsRead();
    }
  }, [view, activeTab, messages, users, currentUser]);

  useEffect(() => {
    if (view !== "login") {
      fetchInitialData(true);
    }
  }, [messageLimit, view]);

  useEffect(() => {
    if (view !== "login" && users.length > 0) {
      const me = users.find(u => u.username.trim().toLowerCase() === view.trim().toLowerCase());
      if (me) {
        if (me.chatBackgroundColor) setChatBgColor(me.chatBackgroundColor);
        if (me.chatBubbleColor) setChatBubbleColor(me.chatBubbleColor);
        if (me.chatWallpaper) setChatWallpaper(me.chatWallpaper);
        if (me.themeName) setThemeName(me.themeName);
      }
    }
  }, [users, view]);

  const handleUpdateTheme = async (bg: string, bubble: string, name: string) => {
    setChatBgColor(bg);
    setChatBubbleColor(bubble);
    setThemeName(name);
    try {
      await actions.updateChatPreferences(view, { chatBackgroundColor: bg, chatBubbleColor: bubble, themeName: name, chatWallpaper: chatWallpaper });
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  const handleUpdateWallpaper = async (wallpaper: string) => {
    setChatWallpaper(wallpaper);
    try {
      await actions.updateChatPreferences(view, { chatBackgroundColor: chatBgColor, chatBubbleColor: chatBubbleColor, themeName: themeName, chatWallpaper: wallpaper });
    } catch (error) {
      console.error('Failed to update wallpaper:', error);
    }
  };

  useEffect(() => {
    if (view !== "login") {
      // Use Web Worker for polling to avoid background throttling
      if (!pollingWorkerRef.current) {
        pollingWorkerRef.current = new Worker("/polling-worker.js");
        pollingWorkerRef.current.onmessage = (e) => {
          if (e.data.action === "tick") {
            fetchInitialData(true);
          }
        };
      }
      
      pollingWorkerRef.current.postMessage({ action: "start", interval: 2500 });
      
      return () => {
        if (pollingWorkerRef.current) {
          pollingWorkerRef.current.postMessage({ action: "stop" });
          pollingWorkerRef.current.terminate();
          pollingWorkerRef.current = null;
        }
      };
    }
  }, [view, fetchInitialData]);

  useEffect(() => {
    if (view !== "login") {
      const presenceInterval = setInterval(() => {
        actions.updatePresence(view);
      }, 3000);
      actions.updatePresence(view); // Initial call
      return () => clearInterval(presenceInterval);
    }
  }, [view]);

  useEffect(() => {
    setConnectionStatusDisplay(isConnected && isOnline);
  }, [isConnected, isOnline]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (view !== "login") {
      const timer = setTimeout(() => {
        fetchInitialData();
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [view, fetchInitialData]);

  useEffect(() => {
    let resolved = false;
    const resolve = (val: boolean) => {
      if (!resolved) {
        resolved = true;
        setIsIncognito(val);
      }
    };

    // 1-second maximum timeout for environment verification
    // Default to 'true' (Incognito) if verification takes too long
    const timeoutId = setTimeout(() => resolve(true), 1000);

    const checkIncognito = async () => {
      try {
        // 1. Quota Check (Standard for Chrome Secure Contexts)
        if (navigator.storage && navigator.storage.estimate) {
          const { quota } = await navigator.storage.estimate();
          if (quota !== undefined) {
            // Modern Chrome Incognito limit is typically < 1GB
            // On localhost, it might be slightly higher, so 4GB is a safer threshold
            resolve(quota < 4000000000); 
            return;
          }
        }

        // 2. FileSystem API (Legacy/Alternative for Chrome)
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const fs = (window as any).RequestFileSystem || (window as any).webkitRequestFileSystem;
        if (typeof fs === "function") {
          fs.call(
            window,
            (window as any).TEMPORARY,
            100,
            () => resolve(false),
            () => resolve(true)
          );
          return;
        }
        /* eslint-enable @typescript-eslint/no-explicit-any */

        // 3. Fallback for Insecure Contexts (Network URLs/IPs)
        // If we can't detect, assume the user is being safe (Incognito)
        resolve(true);
      } catch {
        // On any error, default to true to avoid blocking the user
        resolve(true);
      }
    };

    checkIncognito();
    return () => {
      clearTimeout(timeoutId);
      resolved = true;
    };
  }, []);


  const handleCreateTicket = async (e: React.FormEvent, user: "alpha 1" | "delta 1") => {
    e.preventDefault();
    if (!newTicket.trim()) return;
    try {
      await actions.createTicket({ description: newTicket, createdBy: user });
      setNewTicket("");
      fetchInitialData();
    } catch (error) {
      console.error('Failed to create ticket:', error);
      alert('Failed to submit complaint. Please check your database connection.');
    }
  };

  const handleToggleTicketStatus = async (id: string, currentStatus: string) => {
    try {
      await actions.updateTicket(id, { status: currentStatus === "open" ? "closed" : "open" });
      fetchInitialData();
    } catch (error) {
      console.error('Failed to update ticket status:', error);
      alert('Failed to update ticket status. Please check your database connection.');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteTicket = async (id: string) => {
    try {
      await actions.deleteTicket(id);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to delete ticket:', error);
      alert('Failed to delete ticket. Please check your database connection.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) { // 15MB limit
        alert("Image too large. Please select an image under 15MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedImage) return;
    
    const isImageUpload = !!selectedImage;
    if (isImageUpload) {
      setIsUploading(true);
      setUploadProgress(0);
    }
    
    const messageText = newMessage;
    const currentSelectedImage = selectedImage;
    const currentReplyingTo = replyingTo;
    const tempId = Date.now().toString();
    
    const optimisticMessage: Message = {
      _id: tempId,
      text: messageText || undefined,
      imageUrl: currentSelectedImage || undefined,
      createdAt: new Date().toISOString(),
      createdBy: currentUser as "alpha 1" | "delta 1",
      ...(currentReplyingTo && {
        repliedTo: {
          _id: currentReplyingTo._id,
          text: currentReplyingTo.text,
          imageUrl: currentReplyingTo.imageUrl,
          createdBy: currentReplyingTo.createdBy
        }
      })
    };
    
    // Optimistic update
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage("");
    setSelectedImage(null);
    setReplyingTo(null);
    scrollToBottom(true);
    
    // Auto-focus back to input - immediate focus helps on some mobile browsers
    messageInputRef.current?.focus();
    // Second focus call after a short delay to ensure it sticks after re-renders
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 50);
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 150);
    
    try {
      let imageUrl = undefined;
      if (currentSelectedImage) {
        // Simple retry logic for image upload (max 2 attempts)
        let uploadSuccess = false;
        let attempts = 0;
        
        // Progress simulation for large files
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev < 90) return prev + Math.random() * 5;
            return prev;
          });
        }, 800);

        while (!uploadSuccess && attempts < 2) {
          try {
            attempts++;
            imageUrl = await actions.uploadImage(currentSelectedImage);
            uploadSuccess = true;
            setUploadProgress(100);
            clearInterval(progressInterval);
          } catch (uploadError) {
            console.warn(`Upload attempt ${attempts} failed:`, uploadError);
            if (attempts >= 2) {
              clearInterval(progressInterval);
              throw uploadError;
            }
            // Short delay before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      await actions.createMessage({ 
        text: messageText || undefined, 
        imageUrl,
        createdBy: currentUser as "alpha 1" | "delta 1",
        repliedTo: currentReplyingTo?._id
      });
      fetchInitialData(true);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setNewMessage(messageText); // Restore input
      setSelectedImage(currentSelectedImage);
      setReplyingTo(currentReplyingTo);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to send message (${errorMessage}). Please try again.`);
    } finally {
      if (isImageUpload) {
        setIsUploading(false);
        setUploadProgress(0);
      }
      // Final focus attempt after any potential state-driven disable cycles
      messageInputRef.current?.focus();
    }
  };

  const handleDeleteMessage = async (id: string) => {
    const message = messages.find(m => m._id === id);
    const isSaved = message?.savedBy?.includes(view as string);
    
    if (isSaved) {
      if (!confirm("This message is saved. Do you want to delete it too?")) {
        return;
      }
    }

    try {
      await actions.deleteMessage(id);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message. Please check your database connection.');
    }
  };

  const handleToggleSaveMessage = async (id: string) => {
    try {
      await actions.toggleSaveMessage(id, view as string);
      fetchInitialData(true);
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const handleDeleteAllMessages = async (deleteForEveryone = false) => {
    try {
      await actions.deleteAllMessages(deleteForEveryone, view as string, includeSavedInDelete);
      setMessages([]);
      fetchInitialData();
      setShowClearHistoryModal(false);
      setIncludeSavedInDelete(false);
    } catch (error) {
      console.error('Failed to clear chat:', error);
      alert('Failed to clear chat. Please check your database connection.');
    }
  };

  const handleCreateWish = async () => {
    if (!newWish.trim()) return;
    try {
      await actions.createWish({ content: newWish, createdBy: currentUser as "alpha 1" | "delta 1" });
      setNewWish("");
      fetchInitialData();
    } catch (error) {
      console.error('Failed to create wish:', error);
      alert('Failed to add to wishlist. Please check your database connection.');
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.trim()) return;
    try {
      await actions.createPlan({ content: newPlan, createdBy: currentUser as "alpha 1" | "delta 1" });
      setNewPlan("");
      fetchInitialData();
    } catch (error) {
      console.error('Failed to create plan:', error);
      alert('Failed to add plan. Please check your database connection.');
    }
  };

  const handleCreateDate = async () => {
    if (!newEvent.trim() || !newDate.trim()) return;
    try {
      await actions.createDate({ event: newEvent, date: newDate, createdBy: currentUser as "alpha 1" | "delta 1" });
      setNewEvent("");
      setNewDate("");
      fetchInitialData();
    } catch (error) {
      console.error('Failed to create date:', error);
      alert('Failed to add timeline event. Please check your database connection.');
    }
  };

  // Update handlers
  const handleUpdateWish = async (id: string, content: string) => {
    try {
      await actions.updateWish(id, content);
      setEditingWish(null);
      setEditingWishText("");
      fetchInitialData();
    } catch (error) {
      console.error('Failed to update wish:', error);
      alert('Failed to update wishlist item. Please check your database connection.');
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
      alert('Failed to update plan. Please check your database connection.');
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
      alert('Failed to update timeline event. Please check your database connection.');
    }
  };

  const handleUpdateMessage = async (id: string, text: string) => {
    try {
      await actions.updateMessage(id, text);
      setEditingMessage(null);
      setEditingMessageText("");
      fetchInitialData();
    } catch (error) {
      console.error('Failed to update message:', error);
      alert('Failed to update message. Please check your database connection.');
    }
  };

  const handleDownloadImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download image:', error);
      // Fallback for data URLs or if fetch fails
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleUpdateChatPreferences = async (updates: { chatBackgroundColor?: string; chatBubbleColor?: string }) => {
    try {
      await actions.updateChatPreferences(view as string, updates);
      fetchInitialData(true);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const handleLogout = () => {
    setView("login");
    window.location.href = "about:blank";
  };

  // Delete handlers
  const handleDeleteWish = async (id: string) => {
    try {
      await actions.deleteWish(id);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to delete wish:', error);
      alert('Failed to delete wishlist item. Please check your database connection.');
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      await actions.deletePlan(id);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to delete plan:', error);
      alert('Failed to delete plan. Please check your database connection.');
    }
  };

  const handleDeleteDate = async (id: string) => {
    try {
      await actions.deleteDate(id);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to delete date:', error);
      alert('Failed to delete timeline event. Please check your database connection.');
    }
  };

  if (isIncognito === null) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-950 font-sans p-6">
        <div className="w-12 h-12 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-6">Verifying Environment...</p>
      </div>
    );
  }

  if (isIncognito === false) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-white font-sans p-10">
        <div className="max-w-lg w-full">
          <div className="mb-8">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h1 className="text-2xl font-medium text-zinc-800 mb-4">
              This site can’t be reached
            </h1>
            <p className="text-zinc-600 text-sm leading-relaxed mb-1">
              The connection was reset.
            </p>
          </div>
          
          <div className="space-y-4">
            <p className="text-zinc-600 text-sm">Try:</p>
            <ul className="list-disc ml-6 text-zinc-600 text-sm space-y-2">
              <li>Checking the connection</li>
              <li>Checking the proxy and the firewall</li>
            </ul>
          </div>

          <div className="mt-10 pt-6 border-t border-zinc-200">
            <p className="text-zinc-400 text-xs font-mono uppercase tracking-tight">
              ERR_CONNECTION_RESET
            </p>
          </div>
        </div>
      </div>
    );
  }

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

  if (view === "login") {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-950 font-sans p-6">
        <form onSubmit={handleLogin} className="w-full max-w-xs flex flex-col items-center gap-4">
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="w-full px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:border-white focus:ring-1 focus:ring-white/20 outline-none transition-all font-mono text-center text-sm placeholder:text-zinc-600"
            placeholder="enter your web token here"
            required
            autoFocus
          />
          <button 
            type="submit"
            className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5"
          >
            Access System
          </button>
        </form>
      </div>
    );
  }

  const getPartnerStatus = () => {
    const partnerUsername = currentUser.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1";
    const partner = users.find(u => u.username.trim().toLowerCase() === partnerUsername);
    if (!partner) return null;
    
    const lastSeenDate = new Date(partner.lastSeen);
    const lastSeen = lastSeenDate.getTime();
    const now = new Date().getTime();
    const isOnline = now - lastSeen < 15000; // 15 seconds threshold
    
    if (isOnline) return "Online";
    
    // Format last seen
    const diff = now - lastSeen;
    if (diff < 3600000) { // Less than 1 hour
      const mins = Math.floor(diff / 60000);
      return mins <= 0 ? "Last seen just now" : `Last seen ${mins} minutes ago`;
    }
    
    const day = lastSeenDate.getDate();
    const month = lastSeenDate.toLocaleString('default', { month: 'short' });
    const time = lastSeenDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    const isToday = lastSeenDate.toDateString() === new Date().toDateString();
    return isToday ? `Last seen at ${time}` : `Last seen ${day} ${month}, ${time}`;
  };

  const hasNewContent = (tabId: string) => {
    switch (tabId) {
      case "complaints":
        return tickets.some(t => t.createdBy !== currentUser && t.status === "open");
      case "wishlist":
        return wishlist.length > 0;
      case "plans":
        return plans.length > 0;
      case "messages":
        return messages.some(m => m.createdBy !== currentUser);
      case "news":
        return false;
      default:
        return false;
    }
  };

  const tabs = [
    { id: "complaints", label: "Complaints", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
    { id: "wishlist", label: "Wishlist", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
    { id: "plans", label: "Plans", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
    { id: "dates", label: "Timeline", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { id: "messages", label: "Message", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    { id: "emergency", label: "Emergency", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> },
    { id: "news", label: "What's New", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> },
  ] as const;

  const sortedTabs = [...tabs].sort((a, b) => {
    const aNew = hasNewContent(a.id);
    const bNew = hasNewContent(b.id);
    if (aNew && !bNew) return -1;
    if (!aNew && bNew) return 1;
    return 0;
  });

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      // Show button if we're not at the bottom (with some threshold)
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-2 selection:bg-white selection:text-black">
      {!connectionStatusDisplay && (
        <div className="bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.3em] py-1.5 text-center sticky top-0 z-[60] shadow-lg animate-pulse">
          Connection Broken
        </div>
      )}
      {/* Header */}
      <header className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800/50 px-6 py-3 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-md mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-white leading-none tracking-tight flex items-center gap-2">
                HeyYou
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider border border-zinc-800 px-1.5 py-0.5 rounded-md bg-zinc-950/50">
                  {currentUser}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${connectionStatusDisplay ? "text-green-500 bg-green-500/10 border border-green-500/20" : "text-red-500 bg-red-500/10 border border-red-500/20 animate-pulse"}`}>
                  {connectionStatusDisplay ? "You're connected" : "Connection Broken"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleToggleSound}
              className={`p-3 rounded-2xl transition-all active:scale-90 border flex items-center gap-2 ${
                isSoundEnabled 
                  ? "bg-white text-black border-white shadow-lg shadow-white/5" 
                  : "bg-zinc-800/50 text-zinc-500 border-zinc-700/50"
              }`}
              title={isSoundEnabled ? "Disable Sound" : "Enable Sound"}
            >
              {isSoundEnabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              )}
            </button>
            <button 
              onClick={() => fetchInitialData()}
              className={`group p-3 bg-zinc-800/50 rounded-2xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all active:scale-90 border border-zinc-700/50 ${isRefreshing ? "animate-spin" : ""}`}
              title="Refresh Data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
            <button 
              onClick={handleLogout}
              className="group p-3 bg-zinc-800/50 rounded-2xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all active:scale-90 border border-zinc-700/50 flex items-center gap-2"
              title="Log Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest pr-1 hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="max-w-md mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar pt-3">
          {sortedTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                activeTab === tab.id 
                  ? "bg-white text-black shadow-xl shadow-white/10 border-white scale-105" 
                  : "bg-zinc-900/50 text-zinc-500 border-zinc-800/50 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>{tab.icon}</span>
                {tab.label}
                {hasNewContent(tab.id) && (
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </div>
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-6 pt-4 pb-2 space-y-8 mt-2">
        {activeTab === "complaints" && (
          <div className="space-y-12">
            {/* Section 1: Register Complaint */}
            <section className="space-y-6">
              <div className="flex items-end justify-between px-1">
                <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                  <span className="w-2 h-2 bg-white rounded-full"></span>
                  New Complaint
                </h2>
                <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Priority: High</span>
              </div>
              <div className="bg-zinc-900 p-6 sm:p-8 rounded-[2.5rem] border border-zinc-800/50 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[80px] -mr-16 -mt-16 rounded-full"></div>
                <form onSubmit={(e) => handleCreateTicket(e, currentUser as "alpha 1" | "delta 1")} className="flex flex-col gap-6 relative z-10">
                  <textarea autoComplete="off" spellCheck={false}
                    value={newTicket}
                    onChange={(e) => setNewTicket(e.target.value)}
                    className="w-full p-6 bg-zinc-950 border border-zinc-800 rounded-3xl focus:border-zinc-600 outline-none text-white font-bold text-sm min-h-[140px] placeholder:text-zinc-800 transition-all shadow-inner resize-none"
                    placeholder="Describe the issue in detail..."
                    required
                  />
                  <button
                    type="submit"
                    className="bg-white text-black py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-zinc-200 transition-all active:scale-[0.97] shadow-xl shadow-white/5"
                  >
                    Submit
                  </button>
                </form>
                
                {/* Your Own Complaints Feed */}
                <div className="mt-10 space-y-6">
                  <div className="flex items-center gap-3 px-1">
                    <div className="flex-1 h-px bg-zinc-800"></div>
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em] whitespace-nowrap">Your Entries</p>
                    <div className="flex-1 h-px bg-zinc-800"></div>
                  </div>
                  <div className="space-y-4">
                    {tickets.filter(t => t.createdBy === currentUser).length === 0 ? (
                      <p className="text-zinc-800 text-[10px] font-black text-center uppercase tracking-widest py-4 italic border border-dashed border-zinc-800 rounded-3xl">Zero outgoing logs</p>
                    ) : (
                      tickets.filter(t => t.createdBy === currentUser).map((ticket) => (
                        <div key={ticket._id} className="p-6 bg-zinc-950/40 border border-zinc-800 rounded-3xl hover:border-zinc-700 transition-colors group">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[9px] text-zinc-600 font-black uppercase tracking-tighter bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 group-hover:text-zinc-400 transition-colors">ID: {ticket._id.slice(-6)}</span>
                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${ticket.status === 'closed' ? 'bg-green-950/30 text-green-500 border border-green-900/30' : 'bg-amber-950/30 text-amber-500 border border-amber-900/30'}`}>
                              {ticket.status === 'closed' ? 'Verified' : 'In Progress'}
                            </span>
                          </div>
                          <p className={`text-zinc-300 text-sm font-bold leading-relaxed ${ticket.status === 'closed' ? 'line-through text-zinc-700' : ''}`}>{ticket.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Complaint Against You */}
            <section className="space-y-6">
              <div className="flex items-end justify-between px-1">
                <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                  <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                  Incoming Issues
                </h2>
                <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Status: Alert</span>
              </div>
              <div className="space-y-4">
                {tickets.filter(t => t.createdBy !== currentUser).length === 0 ? (
                  <div className="bg-zinc-900/30 border-2 border-dashed border-zinc-900 rounded-[3rem] p-16 text-center group">
                    <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.4em] group-hover:text-zinc-500 transition-colors">Integrity Maintained</p>
                  </div>
                ) : (
                  tickets.filter(t => t.createdBy !== currentUser).map((ticket) => (
                    <div 
                      key={ticket._id} 
                      className={`p-8 rounded-[2.5rem] border transition-all duration-500 ${
                        ticket.status === "closed" 
                          ? "bg-zinc-900/20 border-zinc-900 opacity-40 grayscale" 
                          : "bg-zinc-900 border-zinc-800 shadow-2xl hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 bg-red-950/50 text-red-500 rounded-full border border-red-900/30">
                          Critical Alert
                        </span>
                        <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{ticket.createdAt.split(',')[0]}</span>
                      </div>
                      <p className={`text-white text-lg font-bold leading-relaxed mb-8 ${ticket.status === "closed" ? "line-through text-zinc-700" : ""}`}>
                        {ticket.description}
                      </p>
                      <div className="flex justify-between items-center pt-6 border-t border-zinc-800/50">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${ticket.status === "closed" ? "bg-green-500" : "bg-amber-500 animate-pulse"}`}></div>
                          <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${ticket.status === "closed" ? "text-green-500" : "text-amber-500"}`}>
                            {ticket.status === "closed" ? "Resolved" : "Active"}
                          </span>
                        </div>
                        <button
                          onClick={() => handleToggleTicketStatus(ticket._id, ticket.status)}
                          className={`text-[9px] px-8 py-3 rounded-2xl font-black uppercase tracking-[0.2em] transition-all ${
                            ticket.status === "closed" 
                              ? "bg-zinc-800/50 text-zinc-600 border border-zinc-700/50" 
                              : "bg-white text-black hover:bg-zinc-200 hover:scale-105"
                          }`}
                        >
                          {ticket.status === "closed" ? "Re-Open" : "Fix Issue"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "wishlist" && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-sm font-black text-white px-1 uppercase tracking-[0.3em] flex items-center gap-3">
              <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
              Wishlist Terminal
            </h2>
            <div className="bg-zinc-900 p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border border-zinc-800/50 shadow-2xl space-y-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 blur-[80px] -mr-16 -mt-16 rounded-full"></div>
              <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                <input autoComplete="off" spellCheck={false} 
                  value={newWish}
                  onChange={(e) => setNewWish(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none focus:border-zinc-600 placeholder:text-zinc-800 transition-all shadow-inner" 
                  placeholder="Data entry..."
                />
                <button 
                  onClick={handleCreateWish}
                  className="bg-white text-black w-full sm:w-16 h-16 flex items-center justify-center rounded-2xl shadow-xl active:scale-90 transition-all hover:bg-zinc-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
              <div className="space-y-3 relative z-10">
                {wishlist.length === 0 ? (
                  <p className="text-zinc-800 text-[10px] font-black text-center uppercase tracking-widest py-8 italic">Wishlist buffer empty</p>
                ) : (
                  wishlist.map((w) => (
                    <div key={w._id} className="flex items-center gap-5 text-sm text-zinc-200 font-bold bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-colors group">
                      <span className="text-zinc-700 group-hover:text-pink-500 transition-colors">♥</span>
                      {editingWish === w._id ? (
                        <input
                          value={editingWishText}
                          onChange={(e) => setEditingWishText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateWish(w._id, editingWishText);
                            if (e.key === 'Escape') {
                              setEditingWish(null);
                              setEditingWishText("");
                            }
                          }}
                          className="flex-1 bg-zinc-950 border border-zinc-600 rounded-lg px-3 py-1 text-sm font-bold text-white outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1">{w.content}</span>
                      )}
                      <div className="flex gap-2">
                        {editingWish === w._id ? (
                          <>
                            <button
                              onClick={() => handleUpdateWish(w._id, editingWishText)}
                              className="text-green-500 hover:text-green-400 text-xs px-2 py-1 rounded"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setEditingWish(null);
                                setEditingWishText("");
                              }}
                              className="text-zinc-500 hover:text-zinc-400 text-xs px-2 py-1 rounded"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingWish(w._id);
                                setEditingWishText(w.content);
                              }}
                              className="text-zinc-500 hover:text-white text-xs px-2 py-1 rounded transition-colors"
                            >
                              ✏
                            </button>
                            <button
                              onClick={() => handleDeleteWish(w._id)}
                              className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded transition-colors"
                            >
                              🗑
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "plans" && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-sm font-black text-white px-1 uppercase tracking-[0.3em] flex items-center gap-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Tactical Ops
            </h2>
            <div className="bg-zinc-900 p-8 rounded-[3rem] border border-zinc-800 shadow-2xl space-y-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[80px] -mr-16 -mt-16 rounded-full"></div>
              <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                <input autoComplete="off" spellCheck={false} 
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none focus:border-zinc-600 placeholder:text-zinc-800" 
                  placeholder="Objective..."
                />
                <button 
                  onClick={handleCreatePlan}
                  className="bg-white text-black w-full sm:w-16 h-16 flex items-center justify-center rounded-2xl shadow-xl active:scale-90 transition-all hover:bg-zinc-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
              <div className="space-y-4 relative z-10">
                {plans.length === 0 ? (
                  <p className="text-zinc-800 text-[10px] font-black text-center uppercase tracking-widest py-8 italic">No objectives queued</p>
                ) : (
                  plans.map((p) => (
                    <div key={p._id} className="flex items-center gap-5 text-sm text-white font-black bg-zinc-950/80 p-6 rounded-3xl border border-zinc-800 shadow-lg group hover:border-blue-900/50 transition-all">
                      <div className="w-2 h-2 bg-zinc-800 group-hover:bg-blue-500 rounded-full transition-colors"></div>
                      {editingPlan === p._id ? (
                        <input
                          value={editingPlanText}
                          onChange={(e) => setEditingPlanText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdatePlan(p._id, editingPlanText);
                            if (e.key === 'Escape') {
                              setEditingPlan(null);
                              setEditingPlanText("");
                            }
                          }}
                          className="flex-1 bg-zinc-950 border border-zinc-600 rounded-lg px-3 py-1 text-sm font-bold text-white outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1">{p.content}</span>
                      )}
                      <div className="flex gap-2">
                        {editingPlan === p._id ? (
                          <>
                            <button
                              onClick={() => handleUpdatePlan(p._id, editingPlanText)}
                              className="text-green-500 hover:text-green-400 text-xs px-2 py-1 rounded"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setEditingPlan(null);
                                setEditingPlanText("");
                              }}
                              className="text-zinc-500 hover:text-zinc-400 text-xs px-2 py-1 rounded"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingPlan(p._id);
                                setEditingPlanText(p.content);
                              }}
                              className="text-zinc-500 hover:text-white text-xs px-2 py-1 rounded transition-colors"
                            >
                              ✏
                            </button>
                            <button
                              onClick={() => handleDeletePlan(p._id)}
                              className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded transition-colors"
                            >
                              🗑
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "dates" && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-sm font-black text-white px-1 uppercase tracking-[0.3em] flex items-center gap-3">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              Timeline Logs
            </h2>
            <div className="bg-zinc-900 p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border border-zinc-800/50 shadow-2xl space-y-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[80px] -mr-16 -mt-16 rounded-full"></div>
              <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                <input autoComplete="off" spellCheck={false} 
                  value={newEvent}
                  onChange={(e) => setNewEvent(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none focus:border-zinc-600 placeholder:text-zinc-800 transition-all shadow-inner" 
                  placeholder="Event description..."
                />
                <input autoComplete="off" spellCheck={false} 
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none focus:border-zinc-600 placeholder:text-zinc-800 transition-all shadow-inner" 
                  placeholder="Date (e.g., 2024-01-15)"
                />
                <button 
                  onClick={handleCreateDate}
                  className="bg-white text-black w-full sm:w-16 h-16 flex items-center justify-center rounded-2xl shadow-xl active:scale-90 transition-all hover:bg-zinc-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
              <div className="space-y-6 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-700 flex items-center gap-3">
                  <span className="flex-1 h-px bg-zinc-800"></span>
                  Timeline History
                  <span className="flex-1 h-px bg-zinc-800"></span>
                </p>
                <div className="space-y-4">
                  {dates.length === 0 ? (
                    <p className="text-zinc-800 text-[10px] font-black text-center uppercase tracking-widest py-8 italic">Timeline buffer empty</p>
                  ) : (
                    dates.map((d) => (
                      <div key={d._id} className="flex flex-col bg-zinc-950 p-6 rounded-2xl border border-zinc-800 hover:border-zinc-600 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-900/20 group-hover:bg-amber-500 transition-all"></div>
                        {editingDate === d._id ? (
                          <div className="space-y-3">
                            <input
                              value={editingEventText}
                              onChange={(e) => setEditingEventText(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-600 rounded-lg px-3 py-2 text-sm font-bold text-white outline-none"
                              placeholder="Event description..."
                              autoFocus
                            />
                            <input
                              value={editingDateText}
                              onChange={(e) => setEditingDateText(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-600 rounded-lg px-3 py-2 text-sm font-bold text-white outline-none"
                              placeholder="Date (e.g., 2024-01-15)"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateDate(d._id, editingEventText, editingDateText)}
                                className="text-green-500 hover:text-green-400 text-xs px-3 py-1 rounded"
                              >
                                ✓ Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingDate(null);
                                  setEditingDateText("");
                                  setEditingEventText("");
                                }}
                                className="text-zinc-500 hover:text-zinc-400 text-xs px-3 py-1 rounded"
                              >
                                ✕ Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="text-lg font-black mb-2 text-white group-hover:translate-x-1 transition-transform">{d.event}</span>
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">{d.date}</span>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => {
                                  setEditingDate(d._id);
                                  setEditingEventText(d.event);
                                  setEditingDateText(d.date);
                                }}
                                className="text-zinc-500 hover:text-white transition-colors text-xs px-2 py-1 rounded"
                              >
                                ✏ Edit
                              </button>
                              <button
                                onClick={() => handleDeleteDate(d._id)}
                                className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded"
                              >
                                🗑 Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
        {activeTab === "messages" && (
          <>
            <section className={`${isMessageExpanded ? "space-y-1" : "space-y-3"} animate-in fade-in slide-in-from-bottom-4 duration-700 ${messagingSectionWrapperClass}`}>
            <div className={`bg-zinc-950/95 backdrop-blur-md flex items-center justify-between px-3 border-b border-zinc-800/50 ${isMessageExpanded && isHeaderCollapsed ? "h-0 overflow-hidden opacity-0" : "py-3"}`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-2xl ${activeTheme.bubbleMe} flex items-center justify-center text-white shadow-lg`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 ${getPartnerStatus() === "Online" ? "bg-green-500 animate-pulse" : "bg-zinc-600"}`}></span>
                </div>
                
                <div className="flex flex-col">
                  <h2 className="text-sm font-bold text-white leading-none mb-1 flex items-center gap-2">
                    Direct Messages
                    {hasUnreadMessages() && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}
                  </h2>
                  {!isHeaderCollapsed && (
                    <div className="flex flex-col items-start gap-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${getPartnerStatus() === "Online" ? "text-green-500/80" : "text-zinc-500"}`}>
                        {getPartnerStatus() || "Offline"}
                      </span>
                      {users.find(u => u.username.trim().toLowerCase() === (currentUser.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1"))?.lastReadAt && (
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${activeTheme.bubbleMe} shadow-sm shadow-black/10 mt-0.5`}>
                          <span className={`text-[8px] font-black uppercase tracking-widest ${activeTheme.textMe || 'text-white'} flex items-center gap-1`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
                            {(() => {
                              const partnerUsername = currentUser.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1";
                              const partner = users.find(u => u.username.trim().toLowerCase() === partnerUsername)!;
                              const readDate = new Date(partner.lastReadAt!);
                              const now = new Date();
                              const isToday = readDate.toDateString() === now.toDateString();
                              const time = readDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                              if (isToday) return time;
                              return `${readDate.getDate()} ${readDate.toLocaleString('default', { month: 'short' })}`;
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
                <div className="flex items-center gap-1 pr-1 mr-1 border-r border-zinc-800/50">
                  <button
                    type="button"
                    onClick={handleToggleSound}
                    className={`p-1.5 rounded-lg transition-all active:scale-90 flex items-center justify-center min-w-[30px] min-h-[30px] ${
                      isSoundEnabled 
                        ? "bg-white text-black shadow-md" 
                        : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                    }`}
                    title={isSoundEnabled ? "Mute" : "Unmute"}
                  >
                    {isSoundEnabled ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchInitialData()}
                    className={`p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all active:scale-90 flex items-center justify-center min-w-[30px] min-h-[30px] ${isRefreshing ? "animate-spin text-white" : ""}`}
                    title="Refresh"
                    disabled={isRefreshing}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.27L21 8"/><path d="M21 3v5h-5"/></svg>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {hasUnreadMessages() && (
                    <button
                      type="button"
                      onClick={handleMarkAsRead}
                      className={`p-1.5 rounded-lg ${activeTheme.accent} hover:bg-white/10 transition-all active:scale-90 flex items-center justify-center min-w-[30px] min-h-[30px]`}
                      title="Mark Read"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
                    </button>
                  )}
                  {isMessageExpanded && (
                    <button
                      type="button"
                      onClick={() => setIsHeaderCollapsed(prev => !prev)}
                      className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all active:scale-90 flex items-center justify-center min-w-[30px] min-h-[30px]"
                      title={isHeaderCollapsed ? "Expand" : "Collapse"}
                    >
                      {isHeaderCollapsed ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m17 9-5-5-5 5"/><path d="m17 15-5 5-5-5"/></svg>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsMessageExpanded(prev => !prev)}
                    className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all active:scale-90 flex items-center justify-center min-w-[30px] min-h-[30px]"
                    title={isMessageExpanded ? "Minimize" : "Maximize"}
                  >
                    {isMessageExpanded ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v5H3M21 8h-5V3M3 16h5v5M16 21v-5h5"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className={`${activeTheme.bg} ${isMessageExpanded ? "rounded-2xl" : "rounded-[2.5rem]"} border border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col backdrop-blur-sm ${isMessageExpanded ? "flex-1" : ""}`}>
              {/* Wallpaper Layer */}
              {chatWallpaper && (
                <div 
                  className="absolute inset-0 pointer-events-none z-0"
                  style={
                    chatWallpaper.startsWith('http') 
                      ? { 
                          backgroundImage: `url(${chatWallpaper})`, 
                          backgroundSize: 'cover', 
                          backgroundPosition: 'center', 
                          opacity: 0.3 
                        } 
                      : { 
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-size='24' text-anchor='middle' dominant-baseline='middle' opacity='0.15'%3E${encodeURIComponent(chatWallpaper)}%3C/text%3E%3C/svg%3E")`, 
                          backgroundRepeat: 'repeat',
                          opacity: 1
                        }
                  }
                ></div>
              )}

              <div className={`absolute top-0 right-0 w-64 h-64 ${activeTheme.glow.replace('/5', '/10')} blur-[100px] -mr-32 -mt-32 rounded-full`}></div>
              
              {isHeaderCollapsed && isMessageExpanded && (
                <button 
                  onClick={() => setIsHeaderCollapsed(false)}
                  className="absolute top-2 left-1/2 -translate-x-1/2 z-[70] p-1 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all active:scale-95"
                  title="Expand header"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
                </button>
              )}

              <div 
                ref={messagesContainerRef} 
                onScroll={handleScroll}
                className={`flex-1 overflow-y-auto no-scrollbar scroll-smooth px-4 ${isMessageExpanded ? "py-6 h-full" : "py-4 max-h-[35vh] min-h-[250px]"}`}
              >
                {showScrollButton && (
                  <button
                    onClick={() => scrollToBottom()}
                    className={`fixed bottom-32 right-10 z-[70] p-4 ${activeTheme.bubbleMe} text-white rounded-full shadow-2xl animate-bounce hover:opacity-90 active:scale-90 transition-all border-4 border-zinc-950`}
                    title="Scroll to bottom"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m7 13 5 5 5-5M7 6l5 5 5-5"/></svg>
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
                    {(() => {
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

                      return groups.map((group) => (
                        <div key={group.date} className="flex flex-col relative">
                          <div className="flex justify-center mb-4 sticky top-0 z-[40] -mx-4 py-2 pointer-events-none">
                            <div className="bg-zinc-800/80 text-zinc-400 text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-zinc-700/50 shadow-sm backdrop-blur-sm pointer-events-auto">
                              {group.label}
                            </div>
                          </div>
                          {group.messages.map((m) => {
                            const isMe = m.createdBy.trim().toLowerCase() === currentUser.trim().toLowerCase();
                            const partnerUsername = (currentUser.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1");
                            const partner = users.find(u => u.username.trim().toLowerCase() === partnerUsername);
                            const isRead = isMe && !!partner?.lastReadAt && (new Date(m.createdAt).getTime() <= new Date(partner.lastReadAt).getTime() + 100);
                            
                            return (
                              <div 
                                key={m._id}
                                id={`message-${m._id}`}
                                className={`flex flex-col w-full transition-all duration-200 rounded-3xl mb-6 ${isMe ? "items-end" : "items-start"}`}
                                onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientX)}
                                onTouchEnd={(e) => {
                                  if (touchStart === null) return;
                                  const touchEnd = e.changedTouches[0].clientX;
                                  const distance = touchEnd - touchStart;
                                  if (distance > 70) {
                                    setReplyingTo(m);
                                    if (window.navigator.vibrate) window.navigator.vibrate(10);
                                  }
                                  setTouchStart(null);
                                }}
                              >
                                <div className={`flex items-center gap-2 mb-1.5 px-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                  <span className="text-[10px] text-zinc-600 font-medium">
                                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </span>
                                </div>

                                <div className={`flex items-end gap-2 w-full ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                  <div 
                                    onClick={() => {
                                      setActiveMessageActions(activeMessageActions === m._id ? null : m._id);
                                    }}
                                    className={`max-w-[85%] min-w-[50px] w-fit ${m.imageUrl && !m.text ? "p-3" : "p-4"} rounded-3xl text-[14.5px] leading-[1.6] relative break-words whitespace-pre-wrap shadow-xl cursor-pointer flex-shrink-0 ${
                                      isMe 
                                        ? `${activeTheme.bubbleMe} ${activeTheme.textMe || 'text-white'} rounded-tr-none ${activeTheme.shadow}` 
                                        : `${activeTheme.bubblePartner} text-zinc-100 rounded-tl-none border border-zinc-700/30 shadow-black/20`
                                    }`}
                                  >
                                    {m.savedBy?.includes(view as string) && (
                                      <div className={`absolute top-1 ${isMe ? "right-2" : "right-2"} z-10 text-yellow-400 opacity-80`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                                        </svg>
                                      </div>
                                    )}
                                    {m.repliedTo && (
                                      <div 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          scrollToMessage(m.repliedTo!._id);
                                        }}
                                        className={`mb-2 p-2 border-l-2 bg-black/10 rounded-r-lg max-w-full overflow-hidden cursor-pointer hover:bg-black/20 transition-colors ${isMe ? "border-white/50" : "border-indigo-500/50"}`}
                                      >
                                        <p className="text-[10px] font-black uppercase tracking-wider opacity-60 mb-0.5">
                                          {m.repliedTo.createdBy}
                                        </p>
                                        <p className="text-[11px] truncate opacity-80 italic">
                                          {m.repliedTo.imageUrl ? "Sent an image" : m.repliedTo.text}
                                        </p>
                                      </div>
                                    )}
                                    {m.imageUrl && (
                                      <div 
                                        className={`${m.text ? "mb-1.5" : ""} rounded-2xl overflow-hidden cursor-zoom-in group relative`}
                                        onClick={() => {
                                          setPreviewMessage(m);
                                        }}
                                      >
                                        <img 
                                          src={m.imageUrl} 
                                          alt="Message attachment" 
                                          className="w-full max-h-[400px] object-cover hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                      </div>
                                    )}
                                    {m.text && (
                                      <div className={m.imageUrl ? "px-2.5 pb-2.5 pt-0.5" : ""}>
                                        {editingMessage === m._id ? (
                                          <div className="flex flex-col gap-2 min-w-[200px]">
                                            <textarea
                                              value={editingMessageText}
                                              onChange={(e) => setEditingMessageText(e.target.value)}
                                              className="w-full bg-black/20 border border-white/20 rounded-xl px-3 py-2 text-sm font-medium outline-none text-white resize-none"
                                              autoFocus
                                              rows={2}
                                            />
                                            <div className="flex justify-end gap-2">
                                              <button onClick={(e) => { e.stopPropagation(); handleUpdateMessage(m._id, editingMessageText); }} className="text-[10px] font-black text-white bg-green-600 px-3 py-1 rounded-lg">SAVE</button>
                                              <button onClick={(e) => { e.stopPropagation(); setEditingMessage(null); setEditingMessageText(""); }} className="text-[10px] font-black text-white bg-zinc-700 px-3 py-1 rounded-lg">CANCEL</button>
                                            </div>
                                          </div>
                                        ) : (
                                          m.text
                                        )}
                                      </div>
                                    )}
                                    
                                    {activeMessageActions === m._id && editingMessage !== m._id && (
                                      <div className={`absolute ${isMe ? "-left-12" : "-right-12"} top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20`}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setReplyingTo(m);
                                            setActiveMessageActions(null);
                                          }}
                                          className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-indigo-400 hover:text-white transition-colors shadow-2xl"
                                          title="Reply"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleSaveMessage(m._id);
                                          }}
                                          className={`p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg transition-colors shadow-2xl ${
                                            m.savedBy?.includes(view as string) ? "text-yellow-400" : "text-indigo-400 hover:text-white"
                                          }`}
                                          title={m.savedBy?.includes(view as string) ? "Unsave" : "Save"}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={m.savedBy?.includes(view as string) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                                          </svg>
                                        </button>
                                        {isMe && (
                                          <>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingMessage(m._id);
                                                setEditingMessageText(m.text || "");
                                                setActiveMessageActions(null);
                                              }}
                                              className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-indigo-400 hover:text-white transition-colors shadow-2xl"
                                              title="Edit"
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteMessage(m._id);
                                              }}
                                              className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-red-500 hover:bg-red-950 transition-colors shadow-2xl"
                                              title="Delete"
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {isMe && (
                                    <span className={`text-[10px] mb-2 flex-shrink-0 ${isRead ? "text-blue-500" : "text-zinc-600"}`} title={isRead ? "Read" : "Sent"}>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        {isRead ? (
                                          <path d="M18 6 7 17l-5-5m16 0-7.5 7.5L13 16" />
                                        ) : (
                                          <path d="M20 6 9 17l-5-5" />
                                        )}
                                      </svg>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ));
                    })()}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="p-4 bg-zinc-950/50 border-t border-zinc-800/50 backdrop-blur-md">
                {replyingTo && (
                  <div className="mb-3 p-3 bg-zinc-900/80 border-l-4 border-indigo-500 rounded-lg flex justify-between items-start animate-in slide-in-from-bottom-2 duration-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                        Replying to {replyingTo.createdBy}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">{replyingTo.text}</p>
                    </div>
                    <button 
                      onClick={() => setReplyingTo(null)}
                      className="ml-2 p-1 text-zinc-500 hover:text-white transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
                  {selectedImage && (
                    <div className="relative w-24 sm:w-32 aspect-square rounded-xl overflow-hidden border-2 border-indigo-500 shadow-xl animate-in zoom-in-90 duration-200 group">
                      <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-1.5 right-1.5 bg-black/70 text-white rounded-full p-1.5 hover:bg-black transition-colors shadow-lg"
                        title="Remove image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-[65%]">
                      <textarea autoComplete="off" spellCheck={false} 
                        ref={messageInputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3 text-[15px] text-white outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/5 placeholder:text-zinc-600 transition-all shadow-inner resize-none min-h-[48px] max-h-[200px]" 
                        placeholder={isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : "Type a message..."}
                        rows={1}
                      />
                    </div>
                    
                    <div className="w-[14%] flex justify-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-zinc-900 border border-zinc-800 text-zinc-400 w-full h-12 rounded-xl hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-lg p-1"
                        disabled={isUploading}
                        title="Upload Photo"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                      </button>
                    </div>

                    <div className="w-[22%]">
                      <button 
                        type="submit"
                        className={`w-full ${activeTheme.bubbleMe} text-white h-12 flex items-center justify-center rounded-xl ${activeTheme.shadow} active:scale-95 transition-all hover:opacity-90 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none group gap-2 text-[10px] font-bold uppercase tracking-wider overflow-hidden relative`}
                        disabled={(!newMessage.trim() && !selectedImage) || isUploading}
                      >
                        {isUploading ? (
                          <>
                            <div 
                              className={`absolute inset-0 ${activeTheme.bubbleMe} opacity-50 transition-all duration-300`} 
                              style={{ width: `${uploadProgress}%` }}
                            />
                            <span className="relative z-10">{Math.round(uploadProgress)}%</span>
                          </>
                        ) : (
                          <>
                            <span className="hidden xs:inline">Send</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </section>
            {!isMessageExpanded && (
              <div className="flex flex-row gap-2 mt-2 px-2">
                <button 
                  onClick={() => setShowClearHistoryModal(true)}
                  className="flex-1 py-2 bg-red-500/5 border border-red-500/10 rounded-xl text-red-400 text-[10px] font-bold hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-95 flex items-center justify-center gap-1.5 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  Clear History
                </button>
                <button 
                  onClick={() => setShowThemeSettings(true)}
                  className="flex-1 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-indigo-400 text-[10px] font-bold hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-1.5 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                  Customize Interface
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === "emergency" && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-sm font-black text-white px-1 uppercase tracking-[0.3em] flex items-center gap-3">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              Emergency Protocols
            </h2>
            <div className="bg-zinc-900 p-10 rounded-[3rem] border border-red-900/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[80px] -mr-16 -mt-16 rounded-full"></div>
              <div className="relative z-10 space-y-6">
                <div className="p-6 bg-zinc-950 border border-red-900/20 rounded-3xl group hover:border-red-900/50 transition-all">
                  <p className="text-[10px] text-red-900 font-black uppercase tracking-[0.3em] mb-2">Priority 01</p>
                  <p className="text-lg font-black text-white mb-1">Primary Response</p>
                  <p className="text-sm text-zinc-500 font-bold">{currentUser === "alpha 1" ? "9648974867" : "+91 **********"}</p>
                </div>
                <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl group hover:border-zinc-700 transition-all">
                  <p className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.3em] mb-2">Backup 02</p>
                  <p className="text-lg font-black text-white mb-1">Secondary Channel</p>
                  <p className="text-sm text-zinc-500 font-bold">{currentUser === "alpha 1" ? "Shriyamparashar5@gmail.com" : "Encrypted VOIP Only"}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "news" && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-sm font-black text-white px-1 uppercase tracking-[0.3em] flex items-center gap-3">
              <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
              System Updates
            </h2>
            <div className="bg-zinc-900 p-8 rounded-[3rem] border border-zinc-800 shadow-2xl space-y-6 relative overflow-hidden flex items-center justify-center min-h-[200px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[80px] -mr-16 -mt-16 rounded-full"></div>
              <div className="relative z-10">
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] italic text-center">
                  nothing new here
                </p>
              </div>
            </div>
          </section>
        )}

        {showThemeSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl sm:rounded-[3rem] w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
              <div className="p-6 sm:p-8 border-b border-zinc-800 flex justify-between items-center flex-shrink-0">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Customize Experience</h3>
                <button 
                  onClick={() => setShowThemeSettings(false)}
                  className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {themes.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => handleUpdateTheme(theme.bg, theme.bubbleMe, theme.name)}
                      className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all flex flex-col gap-4 text-left group ${
                        themeName === theme.name 
                          ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10" 
                          : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-300">{theme.name}</span>
                        {themeName === theme.name && (
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <div className={`h-12 w-full rounded-2xl ${theme.bg} border border-white/5 overflow-hidden flex items-center justify-center relative`}>
                        <div className={`absolute left-2 w-1/2 h-6 ${theme.bubblePartner} rounded-full rounded-tl-none opacity-40 scale-75`}></div>
                        <div className={`absolute right-2 w-1/2 h-6 ${theme.bubbleMe} rounded-full rounded-tr-none scale-75`}></div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-10 mb-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-zinc-800"></div>
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] italic whitespace-nowrap">Chat Wallpapers</h4>
                  <div className="h-px flex-1 bg-zinc-800"></div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 sm:gap-4 pb-4">
                  {wallpapers.map((wp) => (
                    <button
                      key={wp.id}
                      onClick={() => handleUpdateWallpaper(wp.value)}
                      className={`aspect-square rounded-2xl border-2 transition-all flex items-center justify-center relative overflow-hidden group ${
                        chatWallpaper === wp.value 
                          ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10" 
                          : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
                      }`}
                      title={wp.name}
                    >
                      {wp.type === "emoji" ? (
                        <span className="text-2xl group-hover:scale-110 transition-transform">{wp.value}</span>
                      ) : wp.type === "image" ? (
                        <>
                          <img src={wp.value} alt={wp.name} className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all"></div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        </div>
                      )}
                      {chatWallpaper === wp.value && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 sm:p-8 bg-zinc-950/50 border-t border-zinc-800 flex-shrink-0">
                <button 
                  onClick={() => setShowThemeSettings(false)}
                  className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-zinc-200 transition-all active:scale-95"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
        {showClearHistoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl sm:rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
              <div className="p-6 sm:p-8 border-b border-zinc-800 flex justify-between items-center flex-shrink-0">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Clear History</h3>
                <button 
                  onClick={() => setShowClearHistoryModal(false)}
                  className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="p-6 sm:p-8 space-y-4">
                <p className="text-zinc-400 text-sm leading-relaxed">
                  How do you want to clear the chat history? This action cannot be undone.
                </p>
                <div 
                  className="flex items-center gap-3 p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 mb-2 cursor-pointer group hover:border-yellow-500/30 transition-all" 
                  onClick={() => setIncludeSavedInDelete(!includeSavedInDelete)}
                >
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${includeSavedInDelete ? "bg-yellow-500 border-yellow-500 shadow-lg shadow-yellow-500/20" : "border-zinc-700 group-hover:border-zinc-500"}`}>
                    {includeSavedInDelete && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-900"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold transition-colors ${includeSavedInDelete ? "text-yellow-400" : "text-zinc-400 group-hover:text-zinc-300"}`}>Delete saved messages too</span>
                    <span className="text-[10px] text-zinc-600 uppercase font-black tracking-tighter italic">Recommended: False (Default)</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => handleDeleteAllMessages(false)}
                    className="w-full p-6 rounded-2xl bg-zinc-800 border border-zinc-700 hover:border-indigo-500/50 hover:bg-zinc-800/80 transition-all text-left group"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">Option 01</span>
                      <span className="text-white font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-2">
                        Delete for me
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      </span>
                      <span className="text-[10px] text-zinc-500 mt-1">Hide all messages from your view only.</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteAllMessages(true)}
                    className="w-full p-6 rounded-2xl bg-red-500/5 border border-red-500/10 hover:border-red-500/50 hover:bg-red-500/10 transition-all text-left group"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-widest text-red-500 mb-1">Option 02</span>
                      <span className="text-white font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-2">
                        Delete for everyone
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      </span>
                      <span className="text-[10px] text-red-500/50 mt-1">Permanently remove all messages from the database.</span>
                    </div>
                  </button>
                </div>
              </div>
              <div className="p-6 sm:p-8 bg-zinc-950/50 border-t border-zinc-800 flex-shrink-0">
                <button 
                  onClick={() => setShowClearHistoryModal(false)}
                  className="w-full py-5 bg-zinc-800 text-zinc-400 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-zinc-700 hover:text-white transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-2 px-6 py-4 flex flex-col items-center gap-12 border-t border-zinc-900/50 bg-gradient-to-b from-transparent to-zinc-900/20">
        <div className="flex flex-col items-center gap-4 group opacity-30 hover:opacity-100 transition-all duration-1000 cursor-none">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.6em] group-hover:text-white transition-colors">Internal OS v2.4</span>
            <span className="text-[7px] font-bold text-zinc-800 uppercase tracking-widest">End of Line</span>
          </div>
        </div>
        {previewMessage && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"
            onClick={() => setPreviewMessage(null)}
          >
            <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewMessage(null);
                }}
                className="fixed top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-90 z-[120]"
                title="Close preview"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <img 
                src={previewMessage.imageUrl} 
                alt="Full size preview" 
                className="w-full h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
              />
              <div 
                className="fixed bottom-10 flex gap-4 animate-in slide-in-from-bottom-4 duration-500 z-[120]"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => handleDownloadImage(previewMessage.imageUrl!)}
                  className="px-6 py-3 bg-white text-black rounded-full font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-zinc-200 transition-all active:scale-95 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Save Image
                </button>
                {previewMessage.createdBy.trim().toLowerCase() === currentUser.trim().toLowerCase() && (
                  <button 
                    onClick={async () => {
                      if (confirm("Delete this image message?")) {
                        await handleDeleteMessage(previewMessage._id);
                        setPreviewMessage(null);
                      }
                    }}
                    className="px-6 py-3 bg-red-600 text-white rounded-full font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-red-500 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {showSoundPrompt && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-700">
            <div className="relative bg-zinc-900 border border-white/10 rounded-[3.5rem] w-full max-w-sm overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 slide-in-from-bottom-10 duration-700">
              {/* Decorative elements */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/5 blur-[60px] rounded-full"></div>
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/5 blur-[60px] rounded-full"></div>
              
              <div className="p-12 flex flex-col items-center text-center space-y-10 relative z-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                  <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl relative rotate-3 hover:rotate-0 transition-transform duration-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">
                    Audio <br/> Preference
                  </h3>
                  <div className="h-1 w-12 bg-white/20 mx-auto rounded-full"></div>
                  <p className="text-zinc-400 text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed max-w-[200px] mx-auto">
                    Configure your notification system for real-time alerts.
                  </p>
                </div>

                <div className="flex flex-col w-full gap-4 pt-4">
                  <button
                    onClick={async () => {
                      setIsSoundEnabled(true);
                      setShowSoundPrompt(false);
                      if ("Notification" in window) {
                        Notification.requestPermission();
                      }
                      
                      // Initialize Web Audio API on user gesture
                      try {
                        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                        const ctx = new AudioContextClass();
                        audioContextRef.current = ctx;
                        
                        const response = await fetch("/notification1.mp3");
                        const arrayBuffer = await response.arrayBuffer();
                        audioBufferRef.current = await ctx.decodeAudioData(arrayBuffer);
                        
                        // Play a test sound to confirm and unlock
                        const source = ctx.createBufferSource();
                        source.buffer = audioBufferRef.current;
                        source.connect(ctx.destination);
                        source.start(0);

                        // Start silent loop to keep background active
                        if (silentAudioRef.current) {
                          silentAudioRef.current.play().catch(() => {});
                        }
                      } catch (e) {
                        console.error("Gesture-based audio init failed:", e);
                        // Fallback
                        const audio = new Audio("/notification1.mp3");
                        audio.play().catch(() => {});
                      }
                    }}
                    className={`group w-full py-6 rounded-3xl font-black uppercase tracking-[0.25em] text-[10px] transition-all active:scale-95 flex items-center justify-center gap-3 ${
                      isSoundEnabled 
                        ? "bg-white text-black shadow-[0_20px_40px_rgba(255,255,255,0.15)] hover:bg-zinc-100" 
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    <span>Enable Audio</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:translate-x-1 transition-transform"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsSoundEnabled(false);
                      setShowSoundPrompt(false);
                    }}
                    className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.25em] text-[10px] transition-all active:scale-95 border border-white/5 ${
                      !isSoundEnabled 
                        ? "bg-white text-black" 
                        : "bg-transparent text-zinc-600 hover:text-zinc-400 hover:bg-white/5"
                    }`}
                  >
                    Stay Muted
                  </button>
                </div>

                <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest pt-4">
                  Current Session: {currentUser}
                </p>
              </div>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
