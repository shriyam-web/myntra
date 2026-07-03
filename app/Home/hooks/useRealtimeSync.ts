import { useEffect, useRef } from "react";
import { ViewType } from "../types";

type TypingPayload = {
  user: string;
  typing: boolean;
};

const SYNC_DEBOUNCE_MS = 500;
const SAFETY_SYNC_MS = 45000;

/**
 * Real-time message sync via Server-Sent Events (push channel).
 * Falls back to polling-worker.js if SSE is unavailable.
 */
export function useRealtimeSync(
  view: ViewType,
  onSync: () => void,
  enabled = true,
  onTyping?: (payload: TypingPayload) => void
) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;
  const onTypingRef = useRef(onTyping);
  onTypingRef.current = onTyping;

  useEffect(() => {
    if (view === "login" || !enabled) return;

    let eventSource: EventSource | null = null;
    let worker: Worker | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let safetyInterval: ReturnType<typeof setInterval> | null = null;
    let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let tabHidden = typeof document !== "undefined" && document.visibilityState === "hidden";

    const clearSyncDebounce = () => {
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = null;
      }
    };

    const runSync = () => {
      if (disposed || tabHidden) return;
      onSyncRef.current();
    };

    const scheduleSync = (delayMs = SYNC_DEBOUNCE_MS) => {
      if (disposed || tabHidden) return;
      clearSyncDebounce();
      syncDebounceTimer = setTimeout(() => {
        syncDebounceTimer = null;
        runSync();
      }, delayMs);
    };

    const startPollingFallback = () => {
      if (worker || fallbackInterval) return;
      try {
        worker = new Worker("/polling-worker.js");
        worker.onmessage = (e) => {
          if (e.data?.action === "tick") scheduleSync();
        };
        worker.postMessage({ action: "start", interval: 4000 });
      } catch {
        fallbackInterval = setInterval(() => scheduleSync(), 4000);
      }
    };

    const onVisibilityChange = () => {
      tabHidden = document.visibilityState === "hidden";
      if (tabHidden) {
        clearSyncDebounce();
        return;
      }
      scheduleSync(150);
    };

    const connect = () => {
      eventSource = new EventSource(`/api/realtime?user=${encodeURIComponent(view)}`);

      eventSource.addEventListener("messages", () => scheduleSync());
      eventSource.addEventListener("typing", (event) => {
        if (disposed || !onTypingRef.current) return;
        try {
          const data = JSON.parse((event as MessageEvent<string>).data) as TypingPayload;
          if (typeof data.user === "string") {
            onTypingRef.current(data);
          }
        } catch {
          // ignore malformed events
        }
      });
      eventSource.addEventListener("heartbeat", () => {
        // keep-alive only
      });

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        startPollingFallback();
      };
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    connect();
    safetyInterval = setInterval(() => {
      if (!tabHidden) runSync();
    }, SAFETY_SYNC_MS);

    return () => {
      disposed = true;
      clearSyncDebounce();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      eventSource?.close();
      worker?.postMessage({ action: "stop" });
      worker?.terminate();
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (safetyInterval) clearInterval(safetyInterval);
    };
  }, [view, enabled]);
}
