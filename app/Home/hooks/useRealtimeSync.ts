import { useEffect, useRef } from "react";
import { ViewType } from "../types";

/**
 * Real-time message sync via Server-Sent Events (push channel).
 * Falls back to polling-worker.js if SSE is unavailable.
 */
export function useRealtimeSync(
  view: ViewType,
  onSync: () => void,
  enabled = true
) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (view === "login" || !enabled) return;

    let eventSource: EventSource | null = null;
    let worker: Worker | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let safetyInterval: ReturnType<typeof setInterval> | null = null;
    let disposed = false;

    const sync = () => {
      if (!disposed) onSyncRef.current();
    };

    const startPollingFallback = () => {
      if (worker || fallbackInterval) return;
      try {
        worker = new Worker("/polling-worker.js");
        worker.onmessage = (e) => {
          if (e.data?.action === "tick") sync();
        };
        worker.postMessage({ action: "start", interval: 2000 });
      } catch {
        fallbackInterval = setInterval(sync, 2000);
      }
    };

    const connect = () => {
      eventSource = new EventSource(`/api/realtime?user=${encodeURIComponent(view)}`);

      eventSource.addEventListener("messages", sync);
      eventSource.addEventListener("heartbeat", () => {
        // keep-alive only
      });

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        startPollingFallback();
      };
    };

    connect();
    safetyInterval = setInterval(sync, 30000);

    return () => {
      disposed = true;
      eventSource?.close();
      worker?.postMessage({ action: "stop" });
      worker?.terminate();
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (safetyInterval) clearInterval(safetyInterval);
    };
  }, [view, enabled]);
}
