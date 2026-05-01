import { useState, useRef, useCallback } from "react";
import * as actions from "../../../lib/actions";
import { Message, PresenceUser, ViewType } from "../types";

export function usePresence(users: PresenceUser[], setUsers: React.Dispatch<React.SetStateAction<PresenceUser[]>>, view: ViewType, messages: Message[]) {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionStatusDisplay, setConnectionStatusDisplay] = useState(true);
  const isMarkingReadRef = useRef(false);

  const handleMarkAsRead = useCallback(async () => {
    if (isMarkingReadRef.current || view === "login") return;
    
    try {
      isMarkingReadRef.current = true;
      await actions.markAllAsRead(view as string);
      
      const now = new Date().toISOString();
      setUsers(prev => prev.map(u => 
        u.username.trim().toLowerCase() === view.trim().toLowerCase() 
          ? { ...u, lastReadAt: now } 
          : u
      ));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    } finally {
      isMarkingReadRef.current = false;
    }
  }, [view, setUsers]);

  const hasUnreadMessages = useCallback(() => {
    const me = users.find(u => u.username.trim().toLowerCase() === view.trim().toLowerCase());
    if (!me) return false;
    
    if (!me.lastReadAt) return messages.some(m => m.createdBy.trim().toLowerCase() !== view.trim().toLowerCase());
    
    const lastRead = new Date(me.lastReadAt).getTime();
    return messages.some(m => 
      m.createdBy.trim().toLowerCase() !== view.trim().toLowerCase() && 
      new Date(m.createdAt).getTime() > lastRead
    );
  }, [users, view, messages]);

  const getPartnerStatus = useCallback(() => {
    const partnerUsername = view.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1";
    const partner = users.find(u => u.username.trim().toLowerCase() === partnerUsername);
    if (!partner) return null;
    
    const lastSeenDate = new Date(partner.lastSeen);
    const lastSeen = lastSeenDate.getTime();
    const now = Date.now();
    const diff = now - lastSeen;
    const isOnline = diff < 20000; // Increased to 20s to be safer with 10s update interval
    
    if (isOnline) return "Online";
    
    if (diff < 0) return "Online"; // Handle client clock behind server

    if (diff < 60000) {
      return "Last seen just now";
    }
    
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `Last seen ${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    const isToday = lastSeenDate.toDateString() === new Date().toDateString();
    const time = lastSeenDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    if (isToday) {
      return `Last seen at ${time}`;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = lastSeenDate.toDateString() === yesterday.toDateString();
    
    if (isYesterday) {
      return `Last seen yesterday at ${time}`;
    }
    
    const day = lastSeenDate.getDate();
    const month = lastSeenDate.toLocaleString('default', { month: 'short' });
    return `Last seen ${day} ${month}, ${time}`;
  }, [users, view]);

  return {
    isOnline,
    setIsOnline,
    connectionStatusDisplay,
    setConnectionStatusDisplay,
    handleMarkAsRead,
    hasUnreadMessages,
    getPartnerStatus
  };
}
