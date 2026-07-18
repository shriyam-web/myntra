import { useState, useCallback, useRef } from "react";
import * as actions from "../../../lib/actions";
import { Ticket, Message, WishlistItem, PlanItem, TimelineDate, PresenceUser, ViewType, CallLog, isOptimisticMessageId } from "../types";

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
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceEnabledAt, setMaintenanceEnabledAt] = useState<string | null>(null);
  const [maintenanceEnabledBy, setMaintenanceEnabledBy] = useState<string | null>(null);

  const syncInFlightRef = useRef(false);
  const syncAgainRef = useRef(false);
  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyMaintenance = useCallback((data: {
    maintenanceMode?: boolean;
    maintenanceEnabledAt?: string | null;
    maintenanceEnabledBy?: string | null;
  }) => {
    if (typeof data.maintenanceMode === "boolean") {
      setMaintenanceMode(data.maintenanceMode);
    }
    if (data.maintenanceEnabledAt !== undefined) {
      setMaintenanceEnabledAt(data.maintenanceEnabledAt);
    }
    if (data.maintenanceEnabledBy !== undefined) {
      setMaintenanceEnabledBy(data.maintenanceEnabledBy);
    }
  }, []);

  const updateMessagesState = useCallback((newMessagesFromData: Message[]) => {
    setMessages(prev => {
      const optimistic = prev.filter(m => isOptimisticMessageId(m._id));
      const pendingOptimistic = optimistic.filter(opt => 
        !newMessagesFromData.some((m: Message) => 
          (opt.clientMessageId && m.clientMessageId === opt.clientMessageId) ||
          (
            m.text === opt.text && 
            m.createdBy === opt.createdBy &&
            Math.abs(new Date(m.createdAt).getTime() - new Date(opt.createdAt).getTime()) < 30000 &&
            Boolean(opt.location) === Boolean(m.location) &&
            (opt.documents?.length || 0) === (m.documents?.length || 0)
          )
        )
      );

      const nextMap = new Map<string, Message>();
      
      newMessagesFromData.forEach(m => {
        nextMap.set(m._id, m);
      });
      
      pendingOptimistic.forEach(m => {
        nextMap.set(m._id, m);
      });

      const finalMessages = Array.from(nextMap.values());
      finalMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      if (prev.length === finalMessages.length) {
        const hasChange = prev.some((m, i) => 
          m._id !== finalMessages[i]._id || 
          m.text !== finalMessages[i].text ||
          (m.savedBy?.length || 0) !== (finalMessages[i].savedBy?.length || 0) ||
          (m.pinnedBy?.length || 0) !== (finalMessages[i].pinnedBy?.length || 0) ||
          JSON.stringify(m.reactions || []) !== JSON.stringify(finalMessages[i].reactions || [])
        );
        if (!hasChange) return prev;
      }
      
      return finalMessages;
    });
  }, []);

  const runFetchMessages = useCallback(async (silent: boolean) => {
    if (view === "login") return;
    try {
      if (!silent) setIsRefreshing(true);
      const data = await actions.fetchMessages(messageLimit, view as string);
      setUsers(data.users || []);
      setCallLogs(data.callLogs || []);
      setHasMoreMessages(data.messages.length >= messageLimit);
      updateMessagesState(data.messages);
      applyMaintenance(data);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setIsConnected(false);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [messageLimit, view, updateMessagesState, applyMaintenance]);

  const fetchMessagesOnly = useCallback(async (silent = true) => {
    if (view === "login") return;

    if (syncInFlightRef.current) {
      syncAgainRef.current = true;
      return;
    }

    syncInFlightRef.current = true;
    try {
      await runFetchMessages(silent);
    } finally {
      syncInFlightRef.current = false;
      if (syncAgainRef.current) {
        syncAgainRef.current = false;
        void fetchMessagesOnly(true);
      }
    }
  }, [view, runFetchMessages]);

  const scheduleFetchMessages = useCallback((silent = true, delayMs = 450) => {
    if (view === "login") return;
    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    syncDebounceRef.current = setTimeout(() => {
      syncDebounceRef.current = null;
      void fetchMessagesOnly(silent);
    }, delayMs);
  }, [view, fetchMessagesOnly]);

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
      applyMaintenance(data);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setIsConnected(false);
      if (!silent) alert('Failed to load data. Please check your database connection.');
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [messageLimit, view, updateMessagesState, applyMaintenance]);

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
    maintenanceMode,
    maintenanceEnabledAt,
    maintenanceEnabledBy,
    fetchInitialData,
    fetchMessagesOnly,
    scheduleFetchMessages,
    fetchAllMedia
  };
}
