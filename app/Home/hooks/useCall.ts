"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as actions from "../../../lib/actions";

export function useCall(currentUser: string, view: string) {
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'on-call'>('idle');
  const [isIncoming, setIsIncoming] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const lastSignalRef = useRef<string | null>(null);

  const endCall = useCallback(async () => {
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
    setIsIncoming(false);
    await actions.endCall(currentUser);
  }, [currentUser, localStream]);

  const setupPeerConnection = useCallback(async () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        // In a real app, we'd send candidates individually. 
        // For polling simplicity, we'll wait for the full offer/answer usually,
        // but WebRTC works better if we can trickle. 
        // We'll just update the signal data with the latest local description including candidates.
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    setLocalStream(stream);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    peerConnection.current = pc;
    return pc;
  }, []);

  const handleStartCall = useCallback(async () => {
    const targetUser = currentUser === "alpha 1" ? "delta 1" : "alpha 1";
    setPartnerName(targetUser);
    setCallStatus('ringing');
    setIsIncoming(false);

    const pc = await setupPeerConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await actions.initiateCall(currentUser, targetUser, JSON.stringify(offer));
  }, [currentUser, setupPeerConnection]);

  const handleAcceptCall = useCallback(async () => {
    const pc = await setupPeerConnection();
    
    // Get the offer from the signalData (will be fetched in polling)
    const status = await actions.fetchCallStatus(currentUser);
    if (status && status.signalData) {
        const offer = JSON.parse(status.signalData);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await actions.acceptCall(currentUser, JSON.stringify(answer));
        setCallStatus('on-call');
    }
  }, [currentUser, setupPeerConnection]);

  // Polling for call status
  useEffect(() => {
    if (view === "login") return;

    const interval = setInterval(async () => {
      const status = await actions.fetchCallStatus(currentUser);
      if (!status) return;

      if (status.callStatus === 'idle' && callStatus !== 'idle') {
        // Call was ended by the other person
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
      } 
      else if (status.callStatus === 'ringing' && callStatus === 'idle') {
        // Incoming call
        setCallStatus('ringing');
        setIsIncoming(true);
        setPartnerName(status.callerId);
      }
      else if (status.callStatus === 'on-call' && callStatus === 'ringing' && !isIncoming) {
        // Other person accepted my call
        if (status.signalData && status.signalData !== lastSignalRef.current) {
            const answer = JSON.parse(status.signalData);
            if (answer.type === 'answer' && peerConnection.current) {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
                setCallStatus('on-call');
                lastSignalRef.current = status.signalData;
            }
        }
      }
      // If we are on-call, we might still need to sync ICE candidates via signalData,
      // but for a basic implementation, if both set remote descriptions, audio might start.
    }, 2000);

    return () => clearInterval(interval);
  }, [currentUser, view, callStatus, isIncoming, localStream]);

  return {
    callStatus,
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
