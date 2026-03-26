"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
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
  text: string;
  createdAt: string;
  createdBy: "alpha 1" | "delta 1";
}

interface PresenceUser {
  _id: string;
  username: string;
  lastSeen: string;
  lastReadAt?: string;
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

export default function Home() {
  const [isIncognito, setIsIncognito] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [view, setView] = useState<"login" | "alpha 1" | "delta 1">("login");
  const [error, setError] = useState("");
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
  const [activeMessageActions, setActiveMessageActions] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMessageExpanded, setIsMessageExpanded] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

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

  const messagingSectionWrapperClass = isMessageExpanded
    ? "fixed inset-0 z-[60] bg-zinc-950 p-4 flex flex-col sm:relative sm:inset-auto sm:bg-transparent sm:z-auto sm:p-0"
    : "";

  const fetchInitialData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      const data = await actions.fetchData(messageLimit);
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
      if (!silent) setIsRefreshing(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      if (!silent) alert('Failed to load data. Please check your database connection.');
      setIsRefreshing(false);
    }
  }, [messageLimit]);

  useEffect(() => {
    if (activeTab === "messages" && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Only scroll if last message changed OR if we just switched to this tab
      if (lastMessage._id !== lastMessageIdRef.current) {
        lastMessageIdRef.current = lastMessage._id;
        scrollToBottom(lastMessage.createdBy === currentUser);
      }
    }
  }, [messages, activeTab, currentUser]);

  const loadMoreMessages = () => {
    setMessageLimit(prev => prev + 50);
  };

  useEffect(() => {
    if (view !== "login") {
      fetchInitialData(true);
    }
  }, [messageLimit, view]);

  useEffect(() => {
    if (view !== "login") {
      const interval = setInterval(() => {
        fetchInitialData(true);
      }, 2500);
      return () => clearInterval(interval);
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const lowerPassword = password.toLowerCase().trim();
    if (lowerPassword === "icai") {
      setView("alpha 1");
      setError("");
    } else if (lowerPassword === "gamma2") {
      setView("delta 1");
      setError("");
    } else {
      setError("Unauthorized access. Check credentials.");
    }
  };

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await actions.createMessage({ text: newMessage, createdBy: currentUser as "alpha 1" | "delta 1" });
      setNewMessage("");
      fetchInitialData();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please check your database connection.');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await actions.deleteMessage(id);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message. Please check your database connection.');
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

  const handleMarkAsRead = async () => {
    try {
      await actions.markAllAsRead(view as string);
      fetchInitialData(true);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
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

  if (view === "login") {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-950 font-sans p-6">
        <div className="bg-zinc-900 p-10 rounded-[40px] border border-zinc-800 w-full max-w-sm flex flex-col items-center shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent"></div>
          
          <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-[0.1em] text-center">
            Internal Terminal
          </h1>
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-10">Sign in to continue</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-6 w-full">
            <div className="space-y-3">
              <label htmlFor="password" title="Password" className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white focus:border-white focus:ring-1 focus:ring-white/20 outline-none transition-all font-mono text-sm placeholder:text-zinc-800"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl">
                <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="group relative bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-xl shadow-white/5 overflow-hidden"
            >
              <span className="relative z-10">Log In</span>
              <div className="absolute inset-0 bg-zinc-200 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </form>
          
          <p className="mt-10 text-[9px] text-zinc-700 font-black uppercase tracking-[0.2em]">
            Authorized Personnel Only
          </p>
        </div>
      </div>
    );
  }

  const getPartnerStatus = () => {
    const partner = users.find(u => u.username !== currentUser);
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
    const month = lastSeenDate.toLocaleString('default', { month: 'long' });
    const time = lastSeenDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    return `Last seen ${day} ${month}, ${time}`;
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

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-2 selection:bg-white selection:text-black">
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
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchInitialData()}
              className={`group p-3 bg-zinc-800/50 rounded-2xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all active:scale-90 border border-zinc-700/50 ${isRefreshing ? "animate-spin" : ""}`}
              title="Refresh Data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
            <button 
              onClick={() => setView("login")}
              className="group p-3 bg-zinc-800/50 rounded-2xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all active:scale-90 border border-zinc-700/50"
              title="Log Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
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
                  <textarea
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
                <input 
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
                <input 
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
                <input 
                  value={newEvent}
                  onChange={(e) => setNewEvent(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none focus:border-zinc-600 placeholder:text-zinc-800 transition-all shadow-inner" 
                  placeholder="Event description..."
                />
                <input 
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
          <section className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ${messagingSectionWrapperClass}`}>
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
                <div className="flex flex-col">
                  <span className="leading-tight">Direct Messages</span>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {getPartnerStatus() && (
                      <span className={`text-[9px] font-bold uppercase tracking-[0.1em] ${getPartnerStatus() === "Online" ? "text-green-500 animate-pulse" : "text-zinc-600"}`}>
                        {getPartnerStatus()}
                      </span>
                    )}
                    {users.find(u => u.username !== currentUser)?.lastReadAt && (
                      <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-indigo-400">
                        {(() => {
                          const partner = users.find(u => u.username !== currentUser)!;
                          const readDate = new Date(partner.lastReadAt!);
                          const now = new Date();
                          const isToday = readDate.toDateString() === now.toDateString();
                          const time = readDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                          if (isToday) return `Read at ${time}`;
                          const day = readDate.getDate();
                          const month = readDate.toLocaleString('default', { month: 'long' });
                          return `Read ${day} ${month}, ${time}`;
                        })()}
                      </span>
                    )}
                  </div>
                </div>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAsRead}
                  className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 hover:bg-indigo-500/20 transition-all active:scale-90 flex items-center justify-center min-w-[36px] min-h-[36px]"
                  title="Mark all as read"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMessageExpanded(prev => !prev)}
                  className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all active:scale-90 flex items-center justify-center min-w-[36px] min-h-[36px]"
                  title={isMessageExpanded ? "Minimize messages" : "Maximize messages"}
                >
                  {isMessageExpanded ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v5H3M21 8h-5V3M3 16h5v5M16 21v-5h5"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                  )}
                </button>
                <button 
                  onClick={() => fetchInitialData()}
                  className={`p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all active:scale-90 ${isRefreshing ? "animate-spin text-white" : ""}`}
                  title="Refresh Messages"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                </button>
              </div>
            </div>

            <div className={`bg-zinc-900/50 rounded-[2.5rem] border border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col backdrop-blur-sm ${isMessageExpanded ? "flex-1" : ""}`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
              
              <div 
                ref={messagesContainerRef} 
                className={`flex-1 overflow-y-auto no-scrollbar scroll-smooth px-4 py-6 ${isMessageExpanded ? "h-full" : "max-h-[60vh] min-h-[400px]"}`}
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
                      <span className="text-xl text-indigo-500">✉</span>
                    </div>
                    <p className="text-zinc-400 font-medium text-sm tracking-tight px-4 max-w-[200px]">
                      Encrypted bridge active. Send a message to start.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {messages.map((m) => {
                      const isMe = m.createdBy === currentUser;
                      
                      return (
                        <div 
                          key={m._id} 
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div className={`flex items-center gap-2 mb-1.5 px-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                            <span className="text-[10px] text-zinc-600 font-medium">
                              {m.createdAt.split(',')[1]}
                            </span>
                          </div>

                          <div 
                            onClick={() => {
                              if (isMe) {
                                setActiveMessageActions(activeMessageActions === m._id ? null : m._id);
                              }
                            }}
                            className={`max-w-[85%] p-4 rounded-3xl text-[14.5px] leading-[1.6] relative break-words whitespace-pre-wrap shadow-xl cursor-pointer ${
                              isMe 
                                ? "bg-indigo-600 text-white rounded-tr-none shadow-indigo-900/10" 
                                : "bg-zinc-800/80 text-zinc-100 rounded-tl-none border border-zinc-700/30 shadow-black/20"
                            }`}
                          >
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
                            
                            {isMe && activeMessageActions === m._id && editingMessage !== m._id && (
                              <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingMessage(m._id);
                                    setEditingMessageText(m.text);
                                    setActiveMessageActions(null);
                                  }}
                                  className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors shadow-2xl"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMessage(m._id);
                                  }}
                                  className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-red-500 hover:bg-red-950 transition-colors shadow-2xl"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="p-4 bg-zinc-950/50 border-t border-zinc-800/50 backdrop-blur-md">
                <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                  <textarea 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-[15px] text-white outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/5 placeholder:text-zinc-600 transition-all shadow-inner resize-none min-h-[58px] max-h-[120px]" 
                    placeholder="Type a message..."
                    rows={1}
                  />
                  <button 
                    type="submit"
                    className="bg-indigo-500 text-white min-w-[80px] px-6 h-[58px] flex items-center justify-center rounded-2xl shadow-xl active:scale-90 transition-all hover:bg-indigo-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none group"
                    disabled={!newMessage.trim()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </form>
              </div>
            </div>
          </section>
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
      </main>

      {/* Footer */}
      <footer className="mt-2 px-6 py-4 flex flex-col items-center gap-12 border-t border-zinc-900/50 bg-gradient-to-b from-transparent to-zinc-900/20">
        <div className="flex flex-col items-center gap-4 group opacity-30 hover:opacity-100 transition-all duration-1000 cursor-none">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.6em] group-hover:text-white transition-colors">Internal OS v2.4</span>
            <span className="text-[7px] font-bold text-zinc-800 uppercase tracking-widest">End of Line</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
