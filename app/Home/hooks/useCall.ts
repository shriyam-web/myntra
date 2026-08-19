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
type OutboxItem = { payload: string; signalId: string; gen: number; type: "ice-candidate" | "ice-complete" };

const IDLE_POLL_MS = 1500;
const SIGNALING_POLL_MS = 400;
const ACTIVE_POLL_MS = 2500;
const HEARTBEAT_MS = 8_000;
const ICE_GATHER_WAIT_MS = 1800;
const CANDIDATE_FLUSH_MS = 120;

function waitForIceGathering(pc: RTCPeerConnection, timeoutMs: number) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const finish = () => {
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    pc.addEventListener("icegatheringstatechange", onChange);
    window.setTimeout(finish, timeoutMs);
  });
}

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
  const candidateOutboxRef = useRef<OutboxItem[]>([]);
  const flushingCandidatesRef = useRef(false);
  const iceGenerationRef = useRef(0);
  const makingOfferRef = useRef(false);
  const politeRef = useRef(false);
  const restartAttemptsRef = useRef(0);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false);
  const callStatusRef = useRef<UiStatus>("idle");
  const endedCallIdsRef = useRef<Set<string>>(new Set());
  const cancelRequestedRef = useRef(false);
  const endedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHeartbeatAtRef = useRef(0);
  const initialOfferSentRef = useRef(false);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  const reconnecting = callStatus === "reconnecting";
  const { quality, statsLabel } = useCallStats(
    pcRef.current,
    callStatus === "active" || callStatus === "connecting" || callStatus === "reconnecting",
    reconnecting
  );

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
    flushingCandidatesRef.current = false;
    iceGenerationRef.current = 0;
    makingOfferRef.current = false;
    restartAttemptsRef.current = 0;
    sessionRef.current = null;
    startingRef.current = false;
    lastHeartbeatAtRef.current = 0;
    initialOfferSentRef.current = false;
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
      if (item.gen !== iceGenerationRef.current && item.gen !== 0) continue;
      try {
        if (item.cand.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(item.cand));
        } else {
          await pc.addIceCandidate(null);
        }
      } catch (e) {
        console.error("flush candidate failed", e);
      }
    }
  }, []);

  const flushCandidateOutbox = useCallback(async () => {
    if (!signalingOpenRef.current || !sessionRef.current) return;
    if (flushingCandidatesRef.current) return;
    const batch = candidateOutboxRef.current.splice(0);
    if (batch.length === 0) return;

    flushingCandidatesRef.current = true;
    const callId = sessionRef.current.callId;
    let ok = false;
    try {
      const res = await actions.pushCallSignalsBatchAction({
        callId,
        items: batch.map((item) => ({
          signalId: item.signalId,
          type: item.type,
          payload: item.payload,
          iceGeneration: item.gen,
        })),
      });
      ok = res.ok;
      if (!res.ok) {
        candidateOutboxRef.current.unshift(...batch);
      }
    } catch {
      candidateOutboxRef.current.unshift(...batch);
    } finally {
      flushingCandidatesRef.current = false;
    }
    if (candidateOutboxRef.current.length > 0 && signalingOpenRef.current) {
      window.setTimeout(() => {
        void flushCandidateOutbox();
      }, ok ? 0 : 400);
    }
  }, []);

  const openSignaling = useCallback(() => {
    signalingOpenRef.current = true;
    void flushCandidateOutbox();
  }, [flushCandidateOutbox]);

  const queueLocalCandidate = useCallback((item: OutboxItem) => {
    candidateOutboxRef.current.push(item);
    if (signalingOpenRef.current) {
      window.setTimeout(() => {
        void flushCandidateOutbox();
      }, CANDIDATE_FLUSH_MS);
    }
  }, [flushCandidateOutbox]);

  const applySession = useCallback((session: CallSessionDTO) => {
    if (endedCallIdsRef.current.has(session.callId)) return;

    sessionRef.current = session;
    setPartnerName(session.partner);
    setIsIncoming(session.role === "callee" && session.state === "ringing");
    setActiveAt(session.activeAt);
    politeRef.current = session.role === "callee";

    if (session.state === "ringing") {
      setCallStatus(session.role === "caller" ? "dialing" : "ringing");
    } else if (session.state === "connecting") {
      setCallStatus((prev) => (prev === "active" || prev === "reconnecting" ? prev : "connecting"));
    } else if (session.state === "active") {
      setCallStatus((prev) => (prev === "reconnecting" ? prev : "active"));
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
      iceCandidatePoolSize: 2,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        queueLocalCandidate({
          payload: JSON.stringify(event.candidate),
          signalId: crypto.randomUUID(),
          gen: iceGenerationRef.current,
          type: "ice-candidate",
        });
      } else {
        queueLocalCandidate({
          payload: "",
          signalId: crypto.randomUUID(),
          gen: iceGenerationRef.current,
          type: "ice-complete",
        });
      }
    };

    const attachRemoteTrack = (track: MediaStreamTrack, streams?: readonly MediaStream[]) => {
      setRemoteStream((prev) => {
        if (streams?.[0]) return streams[0];
        const next = prev ? new MediaStream(prev.getTracks()) : new MediaStream();
        if (!next.getTracks().some((t) => t.id === track.id)) next.addTrack(track);
        return next;
      });
    };

    pc.ontrack = (event) => {
      attachRemoteTrack(event.track, event.streams);
      event.track.onunmute = () => attachRemoteTrack(event.track, event.streams);
    };

    const onConnected = () => {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      restartAttemptsRef.current = 0;
      pc.getReceivers().forEach((receiver) => {
        if (receiver.track) receiver.track.enabled = true;
      });
      setCallStatus("active");
      if (sessionRef.current) {
        void actions.reportCallConnectedAction(sessionRef.current.callId);
      }
    };

    const onFailed = async () => {
      if (!sessionRef.current || !pcRef.current) return;
      // Callee waits for the caller's restart offer (avoids SDP glare).
      if (politeRef.current) {
        setCallStatus("reconnecting");
        return;
      }
      if (restartAttemptsRef.current >= 3) {
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
        await waitForIceGathering(pc, 1200);
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
          }, 5000);
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      const st = pc.iceConnectionState;
      if (st === "connected" || st === "completed") onConnected();
      else if (st === "failed") void onFailed();
    };

    pc.onnegotiationneeded = async () => {
      // Initial offer is created explicitly. Ignore until the first handshake is done
      // so Chrome doesn't replace the stored offer and break the callee's answer.
      if (!sessionRef.current || sessionRef.current.role !== "caller") return;
      if (!initialOfferSentRef.current || !remoteDescSetRef.current) return;
      if (makingOfferRef.current || pc.signalingState !== "stable") return;
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
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    localStreamRef.current = stream;
    setLocalStream(stream);
    stream.getAudioTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pcRef.current = pc;
    setPcVersion((v) => v + 1);
    return pc;
  }, [queueLocalCandidate, resetLocal, showEnded, teardownMedia]);

  const markProcessed = (signal: CallSignalDTO) => {
    processedSignalIdsRef.current.add(signal.signalId);
    lastSeqRef.current = Math.max(lastSeqRef.current, signal.seq);
  };

  const handleSignal = useCallback(
    async (signal: CallSignalDTO) => {
      if (processedSignalIdsRef.current.has(signal.signalId)) {
        lastSeqRef.current = Math.max(lastSeqRef.current, signal.seq);
        return;
      }

      const pc = pcRef.current;
      if (signal.type === "offer") {
        // Initial offer is consumed on the accept path.
        markProcessed(signal);
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
          markProcessed(signal);
        } catch (e) {
          console.error("apply answer failed", e);
        }
        return;
      }

      if (signal.type === "ice-restart-offer") {
        const offerCollision = makingOfferRef.current || pc.signalingState !== "stable";
        if (!politeRef.current && offerCollision) {
          markProcessed(signal);
          return;
        }
        try {
          if (offerCollision) {
            await pc.setLocalDescription({ type: "rollback" });
          }
          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.payload)));
          remoteDescSetRef.current = true;
          iceGenerationRef.current = Math.max(iceGenerationRef.current, signal.iceGeneration || 0);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await waitForIceGathering(pc, 1000);
          await actions.pushCallSignalAction({
            callId: signal.callId,
            signalId: crypto.randomUUID(),
            type: "ice-restart-answer",
            payload: JSON.stringify(pc.localDescription),
            iceGeneration: iceGenerationRef.current,
            revision: iceGenerationRef.current,
          });
          await flushRemoteCandidates();
          markProcessed(signal);
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
        markProcessed(signal);
        return;
      }

      if (signal.type === "ice-complete") {
        try {
          if (remoteDescSetRef.current) {
            await pc.addIceCandidate(null);
          } else {
            pendingRemoteCandidatesRef.current.push({ cand: { candidate: "" }, gen: signal.iceGeneration || 0 });
          }
        } catch {
          // ignore
        }
        markProcessed(signal);
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
      makingOfferRef.current = true;
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc, ICE_GATHER_WAIT_MS);
      makingOfferRef.current = false;

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

      if (cancelRequestedRef.current) {
        endedCallIdsRef.current.add(result.session.callId);
        void actions.endCallAction(result.session.callId, "cancelled").catch(() => undefined);
        teardownMedia();
        resetLocal();
        return;
      }

      initialOfferSentRef.current = true;
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
      makingOfferRef.current = false;
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
      markProcessed(offer);

      const queued = fetched.signals.filter((s) => s.type === "ice-candidate" || s.type === "ice-complete");
      for (const signal of queued) {
        await handleSignal(signal);
      }
      await flushRemoteCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIceGathering(pc, ICE_GATHER_WAIT_MS);
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
    handleSignal,
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

    cancelRequestedRef.current = true;
    if (session) endedCallIdsRef.current.add(session.callId);
    teardownMedia();
    resetLocal();
    showEnded(wasRinging ? "cancelled" : "completed");

    if (session) {
      void actions.endCallAction(session.callId, "hangup").catch(() => {
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
    if (session) endedCallIdsRef.current.add(session.callId);
    teardownMedia();
    resetLocal();
    showEnded("rejected");
    if (session) {
      void actions.rejectCallAction(session.callId).catch((e) => console.error(e));
    }
  }, [resetLocal, showEnded, teardownMedia]);

  useEffect(() => {
    if (view === "login") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let eventSource: EventSource | null = null;
    let inFlight = false;

    const sendHeartbeat = () => {
      const session = sessionRef.current;
      if (!session || session.state === "ended") return;
      const nowTs = Date.now();
      if (nowTs - lastHeartbeatAtRef.current < HEARTBEAT_MS - 500) return;
      lastHeartbeatAtRef.current = nowTs;
      void actions.heartbeatCallAction(session.callId).catch(() => {
        lastHeartbeatAtRef.current = 0;
      });
    };

    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        if (!sessionRef.current) {
          const active = await actions.getActiveCallAction();
          if (cancelled) return;
          if (active) applySession(active);
        } else {
          await pullSignals();
          sendHeartbeat();
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
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_MS);

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
      if (heartbeatTimer) clearInterval(heartbeatTimer);
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
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, []);

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
