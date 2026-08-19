import { useState, useCallback, useRef } from "react";
import * as actions from "../../../lib/actions";
import {
  Ticket,
  Message,
  WishlistItem,
  PlanItem,
  TimelineDate,
  ReminderItem,
  MoodCheckInItem,
  PresenceUser,
  ViewType,
  CallLog,
  isOptimisticMessageId,
} from "../types";

const CALL_LOG_PAGE_SIZE = 15;

export function useAppData(view: ViewType, messageLimit: number) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [hasMoreCallLogs, setHasMoreCallLogs] = useState(false);
  const [callLogsTotal, setCallLogsTotal] = useState(0);
  const [isLoadingCallLogs, setIsLoadingCallLogs] = useState(false);
  const [mediaMessages, setMediaMessages] = useState<Message[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [dates, setDates] = useState<TimelineDate[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [moods, setMoods] = useState<MoodCheckInItem[]>([]);
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceEnabledAt, setMaintenanceEnabledAt] = useState<string | null>(null);
  const [maintenanceEnabledBy, setMaintenanceEnabledBy] = useState<string | null>(null);
  const [disappearingMode, setDisappearingMode] = useState(false);
  const [disappearingEnabledAt, setDisappearingEnabledAt] = useState<string | null>(null);
  const [disappearingEnabledBy, setDisappearingEnabledBy] = useState<string | null>(null);

  const syncInFlightRef = useRef(false);
  const syncAgainRef = useRef(false);
  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyMaintenance = useCallback((data: {
    maintenanceMode?: boolean;
    maintenanceEnabledAt?: string | null;
    maintenanceEnabledBy?: string | null;
    disappearingMode?: boolean;
    disappearingEnabledAt?: string | null;
    disappearingEnabledBy?: string | null;
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
    if (typeof data.disappearingMode === "boolean") {
      setDisappearingMode(data.disappearingMode);
    }
    if (data.disappearingEnabledAt !== undefined) {
      setDisappearingEnabledAt(data.disappearingEnabledAt);
    }
    if (data.disappearingEnabledBy !== undefined) {
      setDisappearingEnabledBy(data.disappearingEnabledBy);
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
          Boolean(m.disappearing) !== Boolean(finalMessages[i].disappearing) ||
          (m.viewedAt || null) !== (finalMessages[i].viewedAt || null) ||
          (m.expiresAt || null) !== (finalMessages[i].expiresAt || null) ||
          JSON.stringify(m.reactions || []) !== JSON.stringify(finalMessages[i].reactions || []) ||
          JSON.stringify(m.pollMeta || null) !== JSON.stringify(finalMessages[i].pollMeta || null)
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
      setReminders(data.reminders || []);
      setMoods(data.moods || []);
      setUsers(data.users || []);
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

  const fetchSharedData = useCallback(async () => {
    if (view === "login") return;
    try {
      const data = await actions.fetchSharedData();
      setPlans(data.plans || []);
      setDates(data.dates || []);
      setReminders(data.reminders || []);
      setMoods(data.moods || []);
      setIsConnected(true);
    } catch (error) {
      console.error("Failed to fetch shared data:", error);
    }
  }, [view]);

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

  const refreshCallLogs = useCallback(async () => {
    if (view === "login") return;
    try {
      setIsLoadingCallLogs(true);
      const data = await actions.fetchCallLogsPage(0, CALL_LOG_PAGE_SIZE);
      setCallLogs(data.logs);
      setHasMoreCallLogs(data.hasMore);
      setCallLogsTotal(data.total);
    } catch (error) {
      console.error("Failed to fetch call logs:", error);
    } finally {
      setIsLoadingCallLogs(false);
    }
  }, [view]);

  const loadMoreCallLogs = useCallback(async () => {
    if (view === "login" || isLoadingCallLogs || !hasMoreCallLogs) return;
    try {
      setIsLoadingCallLogs(true);
      const data = await actions.fetchCallLogsPage(callLogs.length, CALL_LOG_PAGE_SIZE);
      setCallLogs((prev) => {
        const seen = new Set(prev.map((l) => l._id));
        return [...prev, ...data.logs.filter((l: CallLog) => !seen.has(l._id))];
      });
      setHasMoreCallLogs(data.hasMore);
      setCallLogsTotal(data.total);
    } catch (error) {
      console.error("Failed to load more call logs:", error);
    } finally {
      setIsLoadingCallLogs(false);
    }
  }, [view, isLoadingCallLogs, hasMoreCallLogs, callLogs.length]);

  return {
    tickets, setTickets,
    messages, setMessages,
    callLogs, setCallLogs,
    mediaMessages, setMediaMessages,
    wishlist, setWishlist,
    plans, setPlans,
    dates, setDates,
    reminders, setReminders,
    moods, setMoods,
    users, setUsers,
    hasMoreMessages,
    isConnected,
    isRefreshing,
    maintenanceMode,
    maintenanceEnabledAt,
    maintenanceEnabledBy,
    disappearingMode,
    disappearingEnabledAt,
    disappearingEnabledBy,
    fetchInitialData,
    fetchMessagesOnly,
    scheduleFetchMessages,
    fetchSharedData,
    fetchAllMedia,
    refreshCallLogs,
    loadMoreCallLogs,
    hasMoreCallLogs,
    callLogsTotal,
    isLoadingCallLogs,
    updateMessagesState,
    setHasMoreMessages,
  };
}
