import { useState, useCallback } from "react";
import * as actions from "../../../lib/actions";
import { Ticket, Message, WishlistItem, PlanItem, TimelineDate, PresenceUser, ViewType, CallLog } from "../types";

export function useAppData(view: ViewType, messageLimit: number) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [mediaMessages, setMediaMessages] = useState<Message[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [dates, setDates] = useState<TimelineDate[]>([]);
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const updateMessagesState = useCallback((newMessagesFromData: Message[]) => {
    setMessages(prev => {
      // 1. Map existing messages for easy lookup
      const prevMap = new Map(prev.map(m => [m._id, m]));
      
      // 2. Identify optimistic messages (not yet in server)
      const optimistic = prev.filter(m => /^\d+$/.test(m._id));
      const pendingOptimistic = optimistic.filter(opt => 
        !newMessagesFromData.some((m: Message) => 
          m.text === opt.text && 
          m.createdBy === opt.createdBy &&
          Math.abs(new Date(m.createdAt).getTime() - new Date(opt.createdAt).getTime()) < 30000
        )
      );

      // 3. Create a map for the new state
      const nextMap = new Map();
      
      // 4. Add server messages, but be careful not to overwrite a very recent local change 
      // if the server might be stale. For now, we trust the server if it's there.
      newMessagesFromData.forEach(m => {
        nextMap.set(m._id, m);
      });
      
      // 5. Add pending optimistic messages
      pendingOptimistic.forEach(m => {
        nextMap.set(m._id, m);
      });

      // 6. Convert back to array and sort by createdAt
      const finalMessages = Array.from(nextMap.values());
      finalMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // 7. Check if anything actually changed to avoid unnecessary re-renders
      if (prev.length === finalMessages.length) {
        const hasChange = prev.some((m, i) => 
          m._id !== finalMessages[i]._id || 
          m.text !== finalMessages[i].text ||
          (m.savedBy?.length || 0) !== (finalMessages[i].savedBy?.length || 0) ||
          JSON.stringify(m.reactions || []) !== JSON.stringify(finalMessages[i].reactions || [])
        );
        if (!hasChange) return prev;
      }
      
      return finalMessages;
    });
  }, []);

  const fetchMessagesOnly = useCallback(async (silent = true) => {
    if (view === "login") return;
    try {
      if (!silent) setIsRefreshing(true);
      const data = await actions.fetchMessages(messageLimit, view as string);
      setUsers(data.users || []);
      setCallLogs(data.callLogs || []);
      setHasMoreMessages(data.messages.length >= messageLimit);
      updateMessagesState(data.messages);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setIsConnected(false);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [messageLimit, view, updateMessagesState]);

  const fetchInitialData = useCallback(async (silent = false) => {
    if (view === "login") return;
    try {
      if (!silent) setIsRefreshing(true);
      const data = await actions.fetchData(messageLimit, view as string);
      setTickets(data.tickets);
      setWishlist(data.wishlist);
      setPlans(data.plans);
      setDates(data.dates);
      setUsers(data.users || []);
      setCallLogs(data.callLogs || []);
      setHasMoreMessages(data.messages.length >= messageLimit);
      updateMessagesState(data.messages);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setIsConnected(false);
      if (!silent) alert('Failed to load data. Please check your database connection.');
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [messageLimit, view, updateMessagesState]);

  const fetchAllMedia = useCallback(async (silent = false) => {
    if (view === "login") return;
    try {
      if (!silent) setIsRefreshing(true);
      const data = await actions.fetchAllMedia(view as string);
      setMediaMessages(data);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to fetch all media:', error);
      setIsConnected(false);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [view]);

  return {
    tickets, setTickets,
    messages, setMessages,
    callLogs, setCallLogs,
    mediaMessages, setMediaMessages,
    wishlist, setWishlist,
    plans, setPlans,
    dates, setDates,
    users, setUsers,
    hasMoreMessages,
    isConnected,
    isRefreshing,
    fetchInitialData,
    fetchMessagesOnly,
    fetchAllMedia
  };
}
