import { useCallback, useEffect, useRef, useState } from "react";
import { ViewType } from "../types";

async function postTyping(user: string, typing: boolean) {
  try {
    await fetch("/api/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, typing }),
      keepalive: true,
    });
  } catch {
    // best-effort only
  }
}

export function useTypingSignal(currentUser: ViewType, enabled = true) {
  const isTypingRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTyping = useCallback(() => {
    if (currentUser === "login" || !enabled) return;
    if (!isTypingRef.current) return;

    isTypingRef.current = false;
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    void postTyping(currentUser, false);
  }, [currentUser, enabled]);

  const signalTyping = useCallback(
    (hasContent: boolean) => {
      if (currentUser === "login" || !enabled) return;

      if (!hasContent) {
        stopTyping();
        return;
      }

      if (!isTypingRef.current) {
        isTypingRef.current = true;
        void postTyping(currentUser, true);
        refreshTimerRef.current = setInterval(() => {
          void postTyping(currentUser, true);
        }, 2500);
      }

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        stopTyping();
      }, 3500);
    },
    [currentUser, enabled, stopTyping]
  );

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  return { signalTyping, stopTyping };
}

export function usePartnerTypingState(view: ViewType) {
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTypingEvent = useCallback(
    (payload: { user: string; typing: boolean }) => {
      if (view === "login") return;

      const partnerUsername =
        view.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1";
      if (payload.user.trim().toLowerCase() !== partnerUsername) return;

      const typing = Boolean(payload.typing);
      setPartnerIsTyping(typing);

      // The server re-sends `typing: true` every ~1.2s while the partner types.
      // If those refreshes stop (dropped SSE, closed tab), auto-clear so the
      // indicator can never get stuck on.
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      if (typing) {
        staleTimerRef.current = setTimeout(() => setPartnerIsTyping(false), 6000);
      }
    },
    [view]
  );

  useEffect(() => {
    return () => {
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      setPartnerIsTyping(false);
    };
  }, [view]);

  return { partnerIsTyping, handleTypingEvent };
}
