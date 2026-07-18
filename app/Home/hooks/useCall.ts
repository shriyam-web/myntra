"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as actions from "../../../lib/actions";

type IceServer = { urls: string | string[]; username?: string; credential?: string };
type CallSignal = { kind: string; payload: string };

const IDLE_POLL_MS = 2000;
const ACTIVE_POLL_MS = 900;

export function useCall(currentUser: string, view: string) {
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'on-call'>('idle');
  const [endReason, setEndReason] = useState<'completed' | 'missed' | 'rejected' | null>(null);
  const [isIncoming, setIsIncoming] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const callStartTime = useRef<number | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceServersRef = useRef<IceServer[] | null>(null);

  // Signaling consumer state
  const consumedIndexRef = useRef(0);
  const incomingOfferRef = useRef<string | null>(null);
  const pendingRemoteCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef(false);

  // Local candidates are held here until initiateCall/acceptCall has reached the
  // server — otherwise a slow network can push candidates before the queue reset,
  // and they get wiped (old phones lost this race and calls failed).
  const signalingOpenRef = useRef(false);
  const candidateOutboxRef = useRef<string[]>([]);

  // Refs mirroring state for use inside the polling loop (avoids stale closures)
  const callStatusRef = useRef<'idle' | 'ringing' | 'on-call'>('idle');
  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);

  const otherUser = currentUser.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1";

  useEffect(() => {
    if (callStatus === 'on-call' && !callStartTime.current) {
      callStartTime.current = Date.now();
    } else if (callStatus === 'idle') {
      callStartTime.current = null;
    }
  }, [callStatus]);

  // Preload ICE servers (incl. TURN) so the first call connects without delay.
  useEffect(() => {
    let mounted = true;
    actions.getIceServers()
      .then((servers) => { if (mounted) iceServersRef.current = servers; })
      .catch(() => { /* fall back to STUN at call time */ });
    return () => { mounted = false; };
  }, []);

  const resetSignalState = useCallback(() => {
    consumedIndexRef.current = 0;
    incomingOfferRef.current = null;
    pendingRemoteCandidatesRef.current = [];
    remoteDescSetRef.current = false;
    signalingOpenRef.current = false;
    candidateOutboxRef.current = [];
  }, []);

  const sendLocalCandidate = useCallback((payload: string) => {
    if (!signalingOpenRef.current) {
      candidateOutboxRef.current.push(payload);
      return;
    }
    actions.pushCallSignal(otherUser, 'candidate', payload)
      .catch((e) => console.error("Failed to send candidate:", e));
  }, [otherUser]);

  const openSignaling = useCallback(() => {
    signalingOpenRef.current = true;
    const outbox = candidateOutboxRef.current;
    candidateOutboxRef.current = [];
    for (const payload of outbox) {
      actions.pushCallSignal(otherUser, 'candidate', payload)
        .catch((e) => console.error("Failed to flush candidate:", e));
    }
  }, [otherUser]);

  const teardownMedia = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const flushRemoteCandidates = useCallback(async () => {
    const pc = peerConnection.current;
    if (!pc) return;
    const pending = pendingRemoteCandidatesRef.current;
    pendingRemoteCandidatesRef.current = [];
    for (const cand of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.error("Error flushing ICE candidate:", e);
      }
    }
  }, []);

  const endCall = useCallback(async (statusOverride?: 'missed' | 'rejected' | 'completed') => {
    let finalStatus: 'missed' | 'rejected' | 'completed' = statusOverride || 'completed';
    let duration = 0;

    if (callStartTime.current) {
      duration = Math.floor((Date.now() - callStartTime.current) / 1000);
      finalStatus = 'completed';
    } else if (callStatusRef.current === 'ringing') {
      finalStatus = isIncoming ? 'rejected' : 'missed';
    }

    teardownMedia();
    resetSignalState();
    setCallStatus('idle');
    setEndReason(finalStatus);
    setIsIncoming(false);

    setTimeout(() => setEndReason(null), 3000);

    try {
      await actions.endCall(currentUser, {
        from: isIncoming ? otherUser : currentUser,
        to: isIncoming ? currentUser : otherUser,
        status: finalStatus,
        duration,
      });
    } catch (e) {
      console.error("Failed to end call:", e);
    }
  }, [currentUser, otherUser, isIncoming, teardownMedia, resetSignalState]);

  const setupPeerConnection = useCallback(async () => {
    let iceServers = iceServersRef.current;
    if (!iceServers) {
      try {
        iceServers = await actions.getIceServers();
        iceServersRef.current = iceServers;
      } catch {
        iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
      }
    }

    const pc = new RTCPeerConnection({
      iceServers: iceServers as RTCIceServer[],
      iceCandidatePoolSize: 4,
    });

    // Trickle ICE: candidates are buffered until the offer/answer has reached the
    // server, then sent as they are discovered (lossless append).
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendLocalCandidate(JSON.stringify(event.candidate));
      }
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') {
        setCallStatus('on-call');
      } else if (st === 'failed') {
        console.error("🔌 Connection failed");
        endCall();
      }
      // 'disconnected' is often transient — let ICE try to recover instead of ending.
    };

    // Old browsers (older Android Chrome) don't have connectionState —
    // iceConnectionState is the compatible signal for connected/failed.
    pc.oniceconnectionstatechange = () => {
      const st = pc.iceConnectionState;
      if (st === 'connected' || st === 'completed') {
        setCallStatus('on-call');
      } else if (st === 'failed') {
        if (typeof pc.restartIce === 'function') {
          try { pc.restartIce(); return; } catch { /* fall through */ }
        }
        console.error("🔌 ICE failed (no restart support)");
        endCall();
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream((prev) => {
        if (event.streams && event.streams[0]) return event.streams[0];
        if (prev) {
          prev.addTrack(event.track);
          return new MediaStream(prev.getTracks());
        }
        return new MediaStream([event.track]);
      });
    };

    // Voice-call processing dramatically improves quality on phone mics/speakers.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch {
      // Very old browsers can reject constraint objects — retry with plain audio.
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    localStreamRef.current = stream;
    setLocalStream(stream);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    peerConnection.current = pc;
    return pc;
  }, [sendLocalCandidate, endCall]);

  // Applies new signaling messages in order. Candidates are buffered until the
  // remote description is set (a WebRTC requirement).
  const consumeSignals = useCallback(async (signals: CallSignal[]) => {
    for (let i = consumedIndexRef.current; i < signals.length; i++) {
      consumedIndexRef.current = i + 1;
      const s = signals[i];
      if (!s || !s.kind) continue;

      if (s.kind === 'offer') {
        incomingOfferRef.current = s.payload;
      } else if (s.kind === 'answer') {
        const pc = peerConnection.current;
        if (pc && !remoteDescSetRef.current) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(s.payload)));
            remoteDescSetRef.current = true;
            setCallStatus('on-call');
            await flushRemoteCandidates();
          } catch (e) {
            console.error("Error applying answer:", e);
          }
        }
      } else if (s.kind === 'candidate') {
        const pc = peerConnection.current;
        const cand = JSON.parse(s.payload) as RTCIceCandidateInit;
        if (pc && remoteDescSetRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.error("Error adding candidate:", e);
          }
        } else {
          pendingRemoteCandidatesRef.current.push(cand);
        }
      }
    }
  }, [flushRemoteCandidates]);

  const handleStartCall = useCallback(async () => {
    try {
      resetSignalState();
      setPartnerName(otherUser);
      setCallStatus('ringing');
      setEndReason(null);
      setIsIncoming(false);

      const pc = await setupPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send the offer; buffered candidates flush only after the server has
      // seeded the queue, so none get wiped by the reset (old-phone race).
      await actions.initiateCall(currentUser, otherUser, JSON.stringify(pc.localDescription));
      openSignaling();
    } catch (err) {
      console.error("❌ Failed to start call:", err);
      teardownMedia();
      resetSignalState();
      setCallStatus('idle');
    }
  }, [currentUser, otherUser, setupPeerConnection, resetSignalState, teardownMedia]);

  const handleAcceptCall = useCallback(async () => {
    try {
      let offerPayload = incomingOfferRef.current;
      if (!offerPayload) {
        const status = await actions.fetchCallStatus(currentUser);
        const offerSig = (status?.callSignals as CallSignal[] | undefined)?.find((s) => s.kind === 'offer');
        offerPayload = offerSig?.payload || null;
      }
      if (!offerPayload) throw new Error("No incoming offer available");

      const pc = await setupPeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerPayload)));
      remoteDescSetRef.current = true;

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await actions.acceptCall(currentUser, JSON.stringify(pc.localDescription));
      openSignaling();

      setCallStatus('on-call');
      await flushRemoteCandidates();
    } catch (err) {
      console.error("❌ Failed to accept call:", err);
      endCall();
    }
  }, [currentUser, setupPeerConnection, openSignaling, flushRemoteCandidates, endCall]);

  // Signaling poll: detects incoming/ended calls and drains the signal queue.
  useEffect(() => {
    if (view === "login") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const status = await actions.fetchCallStatus(currentUser);
        if (cancelled || !status) return;

        const localStatus = callStatusRef.current;

        // Remote ended the call
        if (status.callStatus === 'idle' && localStatus !== 'idle') {
          teardownMedia();
          resetSignalState();
          setCallStatus('idle');
          setIsIncoming(false);
          if (status.lastCallEndReason) {
            setEndReason(status.lastCallEndReason);
            setTimeout(() => setEndReason(null), 3000);
          }
        }
        // New incoming call
        else if (status.callStatus === 'ringing' && localStatus === 'idle') {
          resetSignalState();
          setCallStatus('ringing');
          setEndReason(null);
          setIsIncoming(true);
          setPartnerName(status.callerId || otherUser);
        }

        // Always drain queued signals (offer stored, answer/candidates applied)
        if (Array.isArray(status.callSignals)) {
          await consumeSignals(status.callSignals as CallSignal[]);
        }
      } catch (err) {
        console.error("📡 Call polling error:", err);
      } finally {
        if (!cancelled) {
          const delay = callStatusRef.current === 'idle' ? IDLE_POLL_MS : ACTIVE_POLL_MS;
          timer = setTimeout(tick, delay);
        }
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [currentUser, view, otherUser, teardownMedia, resetSignalState, consumeSignals]);

  // End the call cleanly if the tab is closed mid-call.
  useEffect(() => {
    const handleUnload = () => {
      if (callStatusRef.current !== 'idle') endCall();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [endCall]);

  return {
    callStatus,
    endReason,
    isIncoming,
    partnerName,
    localStream,
    remoteStream,
    handleStartCall,
    handleAcceptCall,
    handleEndCall: endCall,
    handleRejectCall: endCall,
  };
}
