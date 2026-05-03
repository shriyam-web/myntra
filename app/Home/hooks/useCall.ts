"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as actions from "../../../lib/actions";

export function useCall(currentUser: string, view: string) {
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'on-call'>('idle');
  const [endReason, setEndReason] = useState<'completed' | 'missed' | 'rejected' | null>(null);
  const [isIncoming, setIsIncoming] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [incomingSignal, setIncomingSignal] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const lastSignalRef = useRef<string | null>(null);

  const callStartTime = useRef<number | null>(null);

  useEffect(() => {
    if (callStatus === 'on-call' && !callStartTime.current) {
      callStartTime.current = Date.now();
    } else if (callStatus === 'idle') {
      callStartTime.current = null;
    }
  }, [callStatus]);

  const endCall = useCallback(async (statusOverride?: 'missed' | 'rejected' | 'completed') => {
    let finalStatus: 'missed' | 'rejected' | 'completed' = statusOverride || 'completed';
    let duration = 0;

    if (callStartTime.current) {
      duration = Math.floor((Date.now() - callStartTime.current) / 1000);
      finalStatus = 'completed';
    } else if (callStatus === 'ringing') {
      finalStatus = isIncoming ? 'rejected' : 'missed';
    }

    const partner = partnerName || (currentUser === "alpha 1" ? "delta 1" : "alpha 1");

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallStatus('idle');
    setEndReason(finalStatus);
    setIsIncoming(false);
    lastSignalRef.current = null;

    setTimeout(() => {
      setEndReason(null);
    }, 3000);

    await actions.endCall(currentUser, {
      from: isIncoming ? partner : currentUser,
      to: isIncoming ? currentUser : partner,
      status: finalStatus,
      duration: duration
    });
  }, [currentUser, localStream, callStatus, isIncoming, partnerName]);

  const awaitIceGathering = useCallback(async (pc: RTCPeerConnection) => {
    if (pc.iceGatheringState === 'complete') return;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', check);
        resolve(null);
      }, 1000); 
      function check() {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          pc.removeEventListener('icegatheringstatechange', check);
          resolve(null);
        }
      }
      pc.addEventListener('icegatheringstatechange', check);
    });
  }, []);

  const setupPeerConnection = useCallback(async () => {
    console.log("📞 Setting up PeerConnection...");
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 New ICE candidate");
        // Send candidate to partner
        const target = partnerName || (currentUser === "alpha 1" ? "delta 1" : "alpha 1");
        actions.updateSignal(target, JSON.stringify({ type: 'candidate', candidate: event.candidate }));
      } else {
        console.log("🧊 ICE gathering complete");
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("🔌 Connection state:", pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallStatus('on-call');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.error("🔌 Connection failed/disconnected");
        endCall();
      }
    };

    pc.ontrack = (event) => {
      console.log("🎵 Received remote track:", event.track.kind);
      setRemoteStream(prev => {
        if (event.streams && event.streams[0]) {
          return event.streams[0];
        }
        if (prev) {
          prev.addTrack(event.track);
          return new MediaStream(prev.getTracks());
        }
        return new MediaStream([event.track]);
      });
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setLocalStream(stream);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      console.log("🎤 Local stream acquired and tracks added");
    } catch (err) {
      console.error("🎤 Failed to get local stream:", err);
    }

    peerConnection.current = pc;
    return pc;
  }, []);

  const handleStartCall = useCallback(async () => {
    try {
      const targetUser = currentUser === "alpha 1" ? "delta 1" : "alpha 1";
      console.log(`📞 Starting call to ${targetUser}...`);
      setPartnerName(targetUser);
      setCallStatus('ringing');
      setEndReason(null);
      setIsIncoming(false);

      const pc = await setupPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log("⏳ Waiting for ICE candidates...");
      await awaitIceGathering(pc);

      const finalOffer = pc.localDescription;
      const signalStr = JSON.stringify(finalOffer);
      await actions.initiateCall(currentUser, targetUser, signalStr);
      lastSignalRef.current = signalStr;
      console.log("📲 Call initiated with signal data");
    } catch (err) {
      console.error("❌ Failed to start call:", err);
      setCallStatus('idle');
    }
  }, [currentUser, setupPeerConnection, awaitIceGathering]);

  const handleAcceptCall = useCallback(async () => {
    try {
      console.log("📞 Accepting call...");
      
      let signalData = incomingSignal;
      if (!signalData) {
        console.error("❌ No incoming signal data available in state, fetching...");
        const status = await actions.fetchCallStatus(currentUser);
        if (!status || !status.signalData) {
            throw new Error("No signal data found even after fetch");
        }
        signalData = status.signalData;
      }

      const pc = await setupPeerConnection();
      if (!signalData) throw new Error("Signal data is missing");
      const offer = JSON.parse(signalData);
      console.log("📩 Received offer, setting remote description");
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log("⏳ Waiting for ICE candidates (answer)...");
      await awaitIceGathering(pc);

      const finalAnswer = pc.localDescription;
      const answerStr = JSON.stringify(finalAnswer);
      await actions.acceptCall(currentUser, answerStr);
      lastSignalRef.current = answerStr;
      setCallStatus('on-call');
      setIncomingSignal(null);
      console.log("📲 Call accepted and answer sent");
    } catch (err) {
      console.error("❌ Failed to accept call:", err);
      endCall();
    }
  }, [currentUser, incomingSignal, setupPeerConnection, awaitIceGathering, endCall]);

  // Polling for call status
  useEffect(() => {
    if (view === "login") return;

    const interval = setInterval(async () => {
      try {
        const status = await actions.fetchCallStatus(currentUser);
        if (!status) return;

        if (status.callStatus === 'idle' && callStatus !== 'idle') {
          console.log("📴 Call ended by remote, reason:", status.lastCallEndReason);
          if (peerConnection.current) {
              peerConnection.current.close();
              peerConnection.current = null;
          }
          if (localStream) {
              localStream.getTracks().forEach(track => track.stop());
              setLocalStream(null);
          }
          setRemoteStream(null);
          
          if (status.lastCallEndReason) {
            setEndReason(status.lastCallEndReason);
            setCallStatus('idle');
            // Keep the endReason for 3 seconds to show the status in the UI
            setTimeout(() => {
              setEndReason(null);
            }, 3000);
          } else {
            setCallStatus('idle');
          }
        } 
        else if (status.callStatus === 'ringing' && callStatus === 'idle') {
          console.log("🔔 Incoming call from:", status.callerId);
          setCallStatus('ringing');
          setEndReason(null);
          setIsIncoming(true);
          setPartnerName(status.callerId);
          if (status.signalData) {
            setIncomingSignal(status.signalData);
          }
        } 
        else if (status.callStatus === 'ringing' && callStatus === 'ringing' && isIncoming) {
          // Update signal if it changes while ringing
          if (status.signalData && status.signalData !== incomingSignal) {
            setIncomingSignal(status.signalData);
          }
        }
        else if (status.callStatus === 'on-call' && callStatus === 'on-call') {
          // Process incremental candidates
          if (status.signalData && status.signalData !== lastSignalRef.current) {
            try {
              const signal = JSON.parse(status.signalData);
              if (signal.type === 'candidate' && peerConnection.current) {
                console.log("🧊 Received remote ICE candidate");
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
                lastSignalRef.current = status.signalData;
              }
            } catch (e) {
              console.error("Error adding ice candidate:", e);
            }
          }
        }
        else if (status.callStatus === 'on-call' && callStatus === 'ringing' && !isIncoming) {
          // Other person accepted my call
          if (status.signalData && status.signalData !== lastSignalRef.current) {
              const answer = JSON.parse(status.signalData);
              if (answer.type === 'answer' && peerConnection.current) {
                  console.log("📩 Received answer, setting remote description");
                  await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
                  setCallStatus('on-call');
                  lastSignalRef.current = status.signalData;
              }
          }
        }
      } catch (err) {
        console.error("📡 Polling error:", err);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [currentUser, view, callStatus, isIncoming, localStream]);

  // Handle tab close/navigation
  useEffect(() => {
    const handleUnload = () => {
      if (callStatus !== 'idle') {
        endCall();
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [callStatus, endCall]);

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
    handleRejectCall: endCall
  };
}
