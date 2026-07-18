"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as actions from "../../../lib/actions";
import type { CallSessionDTO, CallSignalDTO } from "../../../lib/calls/types";
import { useCallStats, type CallQuality } from "./useCallStats";

type UiStatus = "idle" | "dialing" | "ringing" | "connecting" | "active" | "reconnecting" | "ended";
type EndReason =
  | "completed"
  | "missed"
  | "rejected"
  | "cancelled"
  | "timeout"
  | "failed"
  | "disconnected"
  | "busy"
  | null;

type IceServer = { urls: string | string[]; username?: string; credential?: string };

const IDLE_POLL_MS = 3000;
// Fast polling only while signaling matters (dialing/ringing/connecting/reconnecting).
const SIGNALING_POLL_MS = 800;
// Once media flows peer-to-peer the server is only needed for hangup/ICE-restart
// signals, so poll gently — hammering server actions queues them up and lags the UI.
const ACTIVE_POLL_MS = 3000;
const HEARTBEAT_MS = 10_000; // server marks stale at 45s

export function useCall(currentUser: string, view: string) {
  const [callStatus, setCallStatus] = useState<UiStatus>("idle");
  const [endReason, setEndReason] = useState<EndReason>(null);
  const [isIncoming, setIsIncoming] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [activeAt, setActiveAt] = useState<string | null>(null);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [pcVersion, setPcVersion] = useState(0);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceServersRef = useRef<IceServer[] | null>(null);
  const sessionRef = useRef<CallSessionDTO | null>(null);
  const lastSeqRef = useRef(0);
  const processedSignalIdsRef = useRef<Set<string>>(new Set());
  const pendingRemoteCandidatesRef = useRef<Array<{ cand: RTCIceCandidateInit; gen: number }>>([]);
  const remoteDescSetRef = useRef(false);
  const signalingOpenRef = useRef(false);
  const candidateOutboxRef = useRef<Array<{ payload: string; signalId: string; gen: number }>>([]);
  const iceGenerationRef = useRef(0);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const politeRef = useRef(false);
  const restartAttemptsRef = useRef(0);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false);
  const callStatusRef = useRef<UiStatus>("idle");
  // Calls ended locally: ignore stale server echoes of them (prevents UI flicker/resurrection).
  const endedCallIdsRef = useRef<Set<string>>(new Set());
  // User hit End while startCall was still in flight (no session yet).
  const cancelRequestedRef = useRef(false);
  const endedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHeartbeatAtRef = useRef(0);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  const reconnecting = callStatus === "reconnecting";
  const { quality, statsLabel } = useCallStats(
    pcRef.current,
    callStatus === "active" || callStatus === "connecting" || callStatus === "reconnecting",
    reconnecting
  );

  // Force stats hook to see pc changes
  void pcVersion;

  const otherUser = currentUser.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1";

  useEffect(() => {
    let mounted = true;
    actions
      .getIceServersAuthed()
      .then((servers) => {
        if (mounted) iceServersRef.current = servers;
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const resetLocal = useCallback(() => {
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    lastSeqRef.current = 0;
    processedSignalIdsRef.current = new Set();
    pendingRemoteCandidatesRef.current = [];
    remoteDescSetRef.current = false;
    signalingOpenRef.current = false;
    candidateOutboxRef.current = [];
    iceGenerationRef.current = 0;
    makingOfferRef.current = false;
    ignoreOfferRef.current = false;
    restartAttemptsRef.current = 0;
    sessionRef.current = null;
    startingRef.current = false;
    lastHeartbeatAtRef.current = 0;
  }, []);

  const teardownMedia = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onnegotiationneeded = null;
      pcRef.current.close();
      pcRef.current = null;
      setPcVersion((v) => v + 1);
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const showEnded = useCallback((reason: EndReason) => {
    setCallStatus("ended");
    setEndReason(reason);
    if (endedTimerRef.current) clearTimeout(endedTimerRef.current);
    endedTimerRef.current = setTimeout(() => {
      endedTimerRef.current = null;
      setCallStatus("idle");
      setEndReason(null);
      setIsIncoming(false);
      setActiveAt(null);
      setBusyMessage(null);
    }, 2800);
  }, []);

  const flushRemoteCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !remoteDescSetRef.current) return;
    const pending = pendingRemoteCandidatesRef.current.splice(0);
    for (const item of pending) {
      if (item.gen !== iceGenerationRef.current) continue;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(item.cand));
      } catch (e) {
        console.error("flush candidate failed", e);
      }
    }
  }, []);

  const openSignaling = useCallback(() => {
    signalingOpenRef.current = true;
    const outbox = candidateOutboxRef.current.splice(0);
    for (const item of outbox) {
      void actions.pushCallSignalAction({
        callId: sessionRef.current!.callId,
        signalId: item.signalId,
        type: "ice-candidate",
        payload: item.payload,
        iceGeneration: item.gen,
      });
    }
  }, []);

  const sendLocalCandidate = useCallback(
    (payload: string) => {
      const signalId = crypto.randomUUID();
      const gen = iceGenerationRef.current;
      if (!signalingOpenRef.current || !sessionRef.current) {
        candidateOutboxRef.current.push({ payload, signalId, gen });
        return;
      }
      void actions.pushCallSignalAction({
        callId: sessionRef.current.callId,
        signalId,
        type: "ice-candidate",
        payload,
        iceGeneration: gen,
      });
    },
    []
  );

  const applySession = useCallback((session: CallSessionDTO) => {
    // A call we already ended/handled locally must never re-open or re-trigger
    // the ended screen from a stale poll — that caused flicker.
    if (endedCallIdsRef.current.has(session.callId)) return;

    sessionRef.current = session;
    setPartnerName(session.partner);
    setIsIncoming(session.role === "callee" && session.state === "ringing");
    setActiveAt(session.activeAt);
    politeRef.current = session.role === "callee";

    if (session.state === "ringing") {
      setCallStatus(session.role === "caller" ? "dialing" : "ringing");
    } else if (session.state === "connecting") {
      setCallStatus("connecting");
    } else if (session.state === "active") {
      setCallStatus("active");
    } else if (session.state === "ended") {
      endedCallIdsRef.current.add(session.callId);
      const mapped: EndReason =
        session.endReason === "rejected"
          ? "rejected"
          : session.endReason === "timeout" || session.endReason === "missed"
            ? "missed"
            : session.endReason === "cancelled"
              ? "cancelled"
              : session.endReason === "failed"
                ? "failed"
                : session.endReason === "disconnected"
                  ? "disconnected"
                  : "completed";
      teardownMedia();
      resetLocal();
      showEnded(mapped);
    }
  }, [resetLocal, showEnded, teardownMedia]);

  const setupPeerConnection = useCallback(async () => {
    let iceServers = iceServersRef.current;
    if (!iceServers) {
      try {
        iceServers = await actions.getIceServersAuthed();
        iceServersRef.current = iceServers;
      } catch {
        iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
      }
    }

    const pc = new RTCPeerConnection({
      iceServers: iceServers as RTCIceServer[],
      iceCandidatePoolSize: 4,
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendLocalCandidate(JSON.stringify(event.candidate));
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream((prev) => {
        if (event.streams?.[0]) return event.streams[0];
        if (prev) {
          prev.addTrack(event.track);
          return new MediaStream(prev.getTracks());
        }
        return new MediaStream([event.track]);
      });
    };

    const onConnected = () => {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      restartAttemptsRef.current = 0;
      setCallStatus("active");
      if (sessionRef.current) {
        void actions.reportCallConnectedAction(sessionRef.current.callId);
      }
    };

    const onFailed = async () => {
      if (!sessionRef.current) return;
      if (restartAttemptsRef.current >= 2) {
        await actions.endCallAction(sessionRef.current.callId, "failed");
        teardownMedia();
        resetLocal();
        showEnded("failed");
        return;
      }
      restartAttemptsRef.current += 1;
      setCallStatus("reconnecting");
      iceGenerationRef.current += 1;
      try {
        makingOfferRef.current = true;
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        await actions.pushCallSignalAction({
          callId: sessionRef.current.callId,
          signalId: crypto.randomUUID(),
          type: "ice-restart-offer",
          payload: JSON.stringify(pc.localDescription),
          iceGeneration: iceGenerationRef.current,
          revision: iceGenerationRef.current,
        });
      } catch (e) {
        console.error("ICE restart failed", e);
      } finally {
        makingOfferRef.current = false;
      }
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "connected") onConnected();
      else if (st === "failed") void onFailed();
      else if (st === "disconnected") {
        setCallStatus("reconnecting");
        if (!disconnectTimerRef.current) {
          disconnectTimerRef.current = setTimeout(() => {
            void onFailed();
          }, 4000);
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      const st = pc.iceConnectionState;
      if (st === "connected" || st === "completed") onConnected();
      else if (st === "failed") void onFailed();
    };

    pc.onnegotiationneeded = async () => {
      // Initial offer is created explicitly; only handle later renegotiation for caller (impolite).
      if (!sessionRef.current || sessionRef.current.role !== "caller") return;
      if (makingOfferRef.current) return;
      try {
        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await actions.pushCallSignalAction({
          callId: sessionRef.current.callId,
          signalId: crypto.randomUUID(),
          type: "ice-restart-offer",
          payload: JSON.stringify(pc.localDescription),
          iceGeneration: iceGenerationRef.current,
          revision: iceGenerationRef.current,
        });
      } catch (e) {
        console.error("negotiationneeded failed", e);
      } finally {
        makingOfferRef.current = false;
      }
    };

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    localStreamRef.current = stream;
    setLocalStream(stream);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pcRef.current = pc;
    setPcVersion((v) => v + 1);
    return pc;
  }, [resetLocal, sendLocalCandidate, showEnded, teardownMedia]);

  const handleSignal = useCallback(
    async (signal: CallSignalDTO) => {
      if (processedSignalIdsRef.current.has(signal.signalId)) return;
      processedSignalIdsRef.current.add(signal.signalId);
      lastSeqRef.current = Math.max(lastSeqRef.current, signal.seq);

      const pc = pcRef.current;
      if (signal.type === "offer") {
        // Initial offer stored for accept path when callee; caller ignores.
        return;
      }

      if (!pc) return;

      if (signal.type === "answer" || signal.type === "ice-restart-answer") {
        try {
          if (pc.signalingState === "have-local-offer" || !remoteDescSetRef.current) {
            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.payload)));
            remoteDescSetRef.current = true;
            if (typeof signal.iceGeneration === "number") {
              iceGenerationRef.current = Math.max(iceGenerationRef.current, signal.iceGeneration);
            }
            await flushRemoteCandidates();
            setCallStatus((prev) => (prev === "dialing" || prev === "connecting" ? "connecting" : prev));
          }
        } catch (e) {
          console.error("apply answer failed", e);
        }
        return;
      }

      if (signal.type === "ice-restart-offer") {
        const offerCollision =
          makingOfferRef.current || pc.signalingState !== "stable";
        ignoreOfferRef.current = !politeRef.current && offerCollision;
        if (ignoreOfferRef.current) return;
        try {
          if (offerCollision) {
            await pc.setLocalDescription({ type: "rollback" });
          }
          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.payload)));
          remoteDescSetRef.current = true;
          iceGenerationRef.current = Math.max(iceGenerationRef.current, signal.iceGeneration || 0);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await actions.pushCallSignalAction({
            callId: signal.callId,
            signalId: crypto.randomUUID(),
            type: "ice-restart-answer",
            payload: JSON.stringify(pc.localDescription),
            iceGeneration: iceGenerationRef.current,
            revision: iceGenerationRef.current,
          });
          await flushRemoteCandidates();
        } catch (e) {
          console.error("apply restart offer failed", e);
        }
        return;
      }

      if (signal.type === "ice-candidate") {
        try {
          const cand = JSON.parse(signal.payload) as RTCIceCandidateInit;
          const gen = signal.iceGeneration || 0;
          if (!remoteDescSetRef.current) {
            pendingRemoteCandidatesRef.current.push({ cand, gen });
          } else if (gen === iceGenerationRef.current || gen === 0) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
        } catch (e) {
          console.error("apply candidate failed", e);
        }
      }
    },
    [flushRemoteCandidates]
  );

  const pullSignals = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    const res = await actions.fetchCallSignalsAction(session.callId, lastSeqRef.current);
    if (!res.ok) return;
    applySession(res.session);
    for (const signal of res.signals) {
      await handleSignal(signal);
    }
  }, [applySession, handleSignal]);

  const handleStartCall = useCallback(async () => {
    if (startingRef.current || callStatusRef.current !== "idle") return;
    startingRef.current = true;
    cancelRequestedRef.current = false;
    setBusyMessage(null);
    try {
      resetLocal();
      setPartnerName(otherUser);
      setIsIncoming(false);
      setCallStatus("dialing");
      setEndReason(null);

      const pc = await setupPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const startRequestId = crypto.randomUUID();
      const result = await actions.startCallAction(startRequestId, JSON.stringify(pc.localDescription));
      if (!result.ok) {
        teardownMedia();
        resetLocal();
        if (result.code === "BUSY") {
          setBusyMessage("Partner is busy");
          showEnded("busy");
        } else {
          showEnded("failed");
        }
        return;
      }

      // User hung up while the call was still being created — cancel it server-side.
      if (cancelRequestedRef.current) {
        endedCallIdsRef.current.add(result.session.callId);
        void actions.endCallAction(result.session.callId, "cancelled").catch(() => undefined);
        teardownMedia();
        resetLocal();
        return;
      }

      applySession(result.session);
      openSignaling();
      await pullSignals();
    } catch (err) {
      console.error("Failed to start call:", err);
      teardownMedia();
      resetLocal();
      showEnded("failed");
    } finally {
      startingRef.current = false;
    }
  }, [
    applySession,
    openSignaling,
    otherUser,
    pullSignals,
    resetLocal,
    setupPeerConnection,
    showEnded,
    teardownMedia,
  ]);

  const handleAcceptCall = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    try {
      setCallStatus("connecting");
      const fetched = await actions.fetchCallSignalsAction(session.callId, 0);
      if (!fetched.ok) throw new Error("No signals");
      const offer = fetched.signals.find((s) => s.type === "offer");
      if (!offer) throw new Error("No offer");

      const pc = await setupPeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer.payload)));
      remoteDescSetRef.current = true;
      processedSignalIdsRef.current.add(offer.signalId);
      lastSeqRef.current = Math.max(lastSeqRef.current, offer.seq);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const res = await actions.acceptCallAction(session.callId, JSON.stringify(pc.localDescription));
      if (!res.ok) throw new Error(res.error);
      applySession(res.session);
      openSignaling();
      await flushRemoteCandidates();
      await pullSignals();
    } catch (err) {
      console.error("Failed to accept call:", err);
      if (sessionRef.current) {
        await actions.endCallAction(sessionRef.current.callId, "failed");
      }
      teardownMedia();
      resetLocal();
      showEnded("failed");
    }
  }, [
    applySession,
    flushRemoteCandidates,
    openSignaling,
    pullSignals,
    resetLocal,
    setupPeerConnection,
    showEnded,
    teardownMedia,
  ]);

  const handleEndCall = useCallback(() => {
    const session = sessionRef.current;
    const wasRinging = callStatusRef.current === "dialing" || callStatusRef.current === "ringing";

    // End instantly in the UI; notify the server in the background.
    cancelRequestedRef.current = true;
    if (session) endedCallIdsRef.current.add(session.callId);
    teardownMedia();
    resetLocal();
    showEnded(wasRinging ? "cancelled" : "completed");

    if (session) {
      void actions.endCallAction(session.callId, "hangup").catch(() => {
        // beacon fallback
        try {
          navigator.sendBeacon?.(
            "/api/calls/beacon",
            new Blob([JSON.stringify({ type: "end", callId: session.callId, reason: "disconnected" })], {
              type: "application/json",
            })
          );
        } catch {
          // ignore
        }
      });
    }
  }, [resetLocal, showEnded, teardownMedia]);

  const handleRejectCall = useCallback(() => {
    const session = sessionRef.current;
    // Reject instantly in the UI; notify the server in the background.
    if (session) endedCallIdsRef.current.add(session.callId);
    teardownMedia();
    resetLocal();
    showEnded("rejected");
    if (session) {
      void actions.rejectCallAction(session.callId).catch((e) => console.error(e));
    }
  }, [resetLocal, showEnded, teardownMedia]);

  // Poll + SSE wake for call state / signals
  useEffect(() => {
    if (view === "login") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let eventSource: EventSource | null = null;
    let inFlight = false;

    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        if (!sessionRef.current) {
          const active = await actions.getActiveCallAction();
          if (cancelled) return;
          if (active) {
            applySession(active);
            if (active.role === "callee" && active.state === "ringing" && !pcRef.current) {
              // wait for accept
            }
          }
        } else {
          await pullSignals();
          if (sessionRef.current && sessionRef.current.state !== "ended") {
            // Throttled heartbeat — one lightweight write every 10s is enough.
            const nowTs = Date.now();
            if (nowTs - lastHeartbeatAtRef.current >= HEARTBEAT_MS) {
              lastHeartbeatAtRef.current = nowTs;
              void actions.heartbeatCallAction(sessionRef.current.callId);
            }
          }
        }
      } catch (e) {
        console.error("call poll error", e);
      } finally {
        inFlight = false;
        if (!cancelled) {
          if (timer) clearTimeout(timer);
          const st = callStatusRef.current;
          const delay =
            st === "idle" || st === "ended"
              ? IDLE_POLL_MS
              : st === "active"
                ? ACTIVE_POLL_MS
                : SIGNALING_POLL_MS;
          timer = setTimeout(tick, delay);
        }
      }
    };

    tick();

    try {
      eventSource = new EventSource(`/api/realtime?user=${encodeURIComponent(currentUser)}`);
      eventSource.addEventListener("call", () => {
        void tick();
      });
    } catch {
      // ignore
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      eventSource?.close();
    };
  }, [view, currentUser, applySession, pullSignals]);

  useEffect(() => {
    const handleUnload = () => {
      const session = sessionRef.current;
      if (!session) return;
      try {
        navigator.sendBeacon?.(
          "/api/calls/beacon",
          new Blob([JSON.stringify({ type: "end", callId: session.callId, reason: "disconnected" })], {
            type: "application/json",
          })
        );
      } catch {
        // ignore
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  // Map UI status to overlay-compatible legacy statuses
  const overlayStatus: "idle" | "ringing" | "on-call" =
    callStatus === "idle" || callStatus === "ended"
      ? "idle"
      : callStatus === "dialing" || callStatus === "ringing"
        ? "ringing"
        : "on-call";

  return {
    callStatus: overlayStatus,
    uiStatus: callStatus,
    endReason,
    isIncoming,
    partnerName,
    localStream,
    remoteStream,
    activeAt,
    busyMessage,
    quality: quality as CallQuality,
    statsLabel,
    handleStartCall,
    handleAcceptCall,
    handleEndCall,
    handleRejectCall,
  };
}
