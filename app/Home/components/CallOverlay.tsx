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
    <div className="fixed inset-0 z-[500] bg-black flex flex-col items-center justify-between p-12 text-white overflow-hidden">
      {/* Background Animated Gradient / Glow */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle,rgba(79,70,229,0.15)_0%,rgba(0,0,0,1)_70%)] animate-pulse" />
        <div className="absolute top-0 left-0 w-full h-full backdrop-blur-3xl opacity-50" />
      </div>

      {/* Caller Info */}
      <div className="relative z-10 flex flex-col items-center gap-6 mt-16 animate-in slide-in-from-top duration-1000 ease-out">
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-5xl font-black shadow-[0_0_50px_rgba(79,70,229,0.3)] ring-4 ring-white/10">
            {partnerName[0]?.toUpperCase()}
          </div>
          {callStatus === 'ringing' && (
             <div className="absolute -inset-4 rounded-full border-2 border-indigo-500/30 animate-ping" />
          )}
        </div>
        
        <div className="flex flex-col items-center text-center">
          <h2 className="text-4xl font-black tracking-tighter uppercase drop-shadow-2xl">
            {partnerName}
          </h2>
          <div className="mt-3 flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <span className={`w-2 h-2 rounded-full ${callStatus === 'on-call' ? 'bg-green-500 animate-pulse' : 'bg-indigo-500 animate-bounce'}`} />
            <p className="text-sm font-bold uppercase tracking-widest text-zinc-300">
              {callStatus === 'ringing' 
                ? (isIncoming ? 'Incoming Audio...' : 'Requesting Audio...') 
                : `Connected • ${formatDuration(duration)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Visualizer Area */}
      <div className="relative z-10 w-full max-w-sm flex items-center justify-center py-12">
        {callStatus === 'on-call' ? (
          <div className="flex items-end justify-center gap-2 h-32 w-full px-8">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className="w-2 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-full transition-all duration-150"
                style={{ 
                  height: `${20 + Math.random() * 80}%`,
                  animation: `wave 1.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`
                }}
              ></div>
            ))}
          </div>
        ) : (
          <div className="relative">
             <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
             <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 relative z-10 animate-pulse">
               <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
             </svg>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes wave {
          0%, 100% { height: 20%; }
          50% { height: 100%; }
        }
      `}</style>

      {/* Action Buttons */}
      <div className="relative z-10 w-full max-w-md flex justify-center gap-12 pb-12 animate-in slide-in-from-bottom duration-1000 ease-out">
        {callStatus === 'ringing' && isIncoming ? (
          <>
            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={onReject}
                className="group relative w-20 h-20 rounded-full bg-red-500/10 border border-red-500/50 flex items-center justify-center text-red-500 transition-all hover:bg-red-500 hover:text-white active:scale-90"
              >
                <div className="absolute inset-0 rounded-full bg-red-500 blur-md opacity-0 group-hover:opacity-40 transition-opacity" />
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[135deg] relative z-10">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
              <span className="text-xs font-black uppercase tracking-widest text-red-500/70">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={onAccept}
                className="group relative w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all hover:scale-110 active:scale-95 animate-bounce"
              >
                <div className="absolute inset-0 rounded-full bg-green-400 blur-xl opacity-50 animate-pulse" />
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
              <span className="text-xs font-black uppercase tracking-widest text-green-500">Accept</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <button 
              onClick={onEnd}
              className="group relative w-20 h-20 rounded-full bg-red-600 flex items-center justify-center text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all hover:scale-110 hover:bg-red-500 active:scale-95"
            >
              <div className="absolute inset-0 rounded-full bg-red-600 blur-xl opacity-30 group-hover:opacity-60 transition-opacity" />
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[135deg] relative z-10">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
            <span className="text-xs font-black uppercase tracking-widest text-white/50">End Call</span>
          </div>
        )}
      </div>

      {/* Audio elements */}
      <audio ref={remoteVideoRef} autoPlay playsInline />
      <audio ref={localVideoRef} autoPlay playsInline muted />
    </div>
  );
}
