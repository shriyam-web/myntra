"use client";

import React, { useEffect, useRef, useState } from "react";
import * as actions from "../../../lib/actions";

interface CallOverlayProps {
  currentUser: string;
  partnerName: string;
  callStatus: 'idle' | 'ringing' | 'on-call';
  isIncoming: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  stream: MediaStream | null;
  remoteStream: MediaStream | null;
}

export function CallOverlay({
  currentUser,
  partnerName,
  callStatus,
  isIncoming,
  onAccept,
  onReject,
  onEnd,
  stream,
  remoteStream
}: CallOverlayProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'on-call') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (callStatus === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[300] bg-zinc-950 flex flex-col items-center justify-between p-8 text-white animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-4 mt-20">
        <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-4xl font-bold shadow-2xl shadow-indigo-500/20 animate-pulse">
          {partnerName[0]?.toUpperCase()}
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-black uppercase tracking-widest">{partnerName}</h2>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-tighter mt-1">
            {callStatus === 'ringing' ? (isIncoming ? 'Incoming Call...' : 'Calling...') : `On Call • ${formatDuration(duration)}`}
          </p>
        </div>
      </div>

      <div className="relative w-full max-w-sm aspect-square bg-zinc-900 rounded-[3rem] overflow-hidden border border-zinc-800 shadow-2xl">
        {/* Remote Stream Visualizer (or video if we add it) */}
        <div className="absolute inset-0 flex items-center justify-center">
            {callStatus === 'on-call' ? (
                <div className="flex gap-1 items-end h-12">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s`, height: `${20 + Math.random() * 80}%` }}></div>
                    ))}
                </div>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-800"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            )}
        </div>
        
        {/* Hidden audio elements for actual WebRTC */}
        <audio ref={remoteVideoRef} autoPlay playsInline />
        <audio ref={localVideoRef} autoPlay playsInline muted />
      </div>

      <div className="flex gap-8 mb-20">
        {callStatus === 'ringing' && isIncoming ? (
          <>
            <button 
                onClick={onReject}
                className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white shadow-xl hover:bg-red-700 transition-all active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[135deg]"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
            <button 
                onClick={onAccept}
                className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white shadow-xl hover:bg-green-700 transition-all active:scale-90 animate-bounce"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
          </>
        ) : (
          <button 
              onClick={onEnd}
              className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white shadow-xl hover:bg-red-700 transition-all active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[135deg]"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}
