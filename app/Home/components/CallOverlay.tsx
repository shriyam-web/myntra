"use client";

import React, { useEffect, useRef, useState } from "react";

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
    } else {
      setDuration(0);
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
    <div className="fixed inset-0 z-[1000] bg-zinc-950 flex flex-col items-center justify-between text-white overflow-hidden font-sans">
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,rgba(168,85,247,0.1)_25%,rgba(0,0,0,1)_100%)] animate-pulse" />
        
        {/* Floating particles/glows */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/20 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[120px] animate-blob animation-delay-2000" />
        
        {/* Mesh Gradient Overlay */}
        <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* Top Bar / Status */}
      <div className="relative z-10 w-full px-8 pt-12 flex flex-col items-center animate-in fade-in slide-in-from-top-8 duration-1000">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl">
          <div className={`w-2 h-2 rounded-full ${callStatus === 'on-call' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse'}`} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
            {callStatus === 'ringing' 
              ? (isIncoming ? 'Incoming Audio Call' : 'Calling...') 
              : 'Secure Connection Active'}
          </span>
        </div>
      </div>

      {/* Center Content: Avatar & Info */}
      <div className="relative z-10 flex flex-col items-center gap-8 mt-4">
        <div className="relative group">
          {/* Outer Ring Animations */}
          <div className="absolute -inset-8 rounded-full border border-white/5 animate-[spin_10s_linear_infinite]" />
          <div className="absolute -inset-12 rounded-full border border-white/5 animate-[spin_15s_linear_infinite_reverse]" />
          
          {/* Pulse Effect for Ringing */}
          {callStatus === 'ringing' && (
            <>
              <div className="absolute -inset-4 rounded-full border-2 border-indigo-500/30 animate-ping" />
              <div className="absolute -inset-8 rounded-full border border-purple-500/20 animate-ping animation-delay-700" />
            </>
          )}

          {/* Avatar */}
          <div className="relative w-40 h-40 rounded-full p-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_80px_rgba(99,102,241,0.3)]">
            <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden border-4 border-zinc-950">
              <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 tracking-tighter">
                {partnerName[0]?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-5xl font-black tracking-tighter uppercase italic bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/20">
            {partnerName}
          </h2>
          {callStatus === 'on-call' && (
            <div className="px-6 py-2 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-xl">
               <span className="text-2xl font-mono font-medium tracking-widest text-indigo-400">
                {formatDuration(duration)}
               </span>
            </div>
          )}
        </div>
      </div>

      {/* Visualizer / Audio Wave */}
      <div className="relative z-10 w-full max-w-lg h-32 flex items-center justify-center px-12">
        <div className="flex items-center justify-center gap-1.5 w-full h-16">
          {[...Array(24)].map((_, i) => (
            <div 
              key={i} 
              className={`w-1 rounded-full bg-gradient-to-t from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ${callStatus === 'on-call' ? 'opacity-100' : 'opacity-20'}`}
              style={{ 
                height: callStatus === 'on-call' ? `${30 + Math.random() * 70}%` : '10%',
                animation: callStatus === 'on-call' ? `wave-enhanced 1.2s ease-in-out infinite` : 'none',
                animationDelay: `${i * 0.05}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="relative z-10 w-full max-w-md px-12 pb-20 flex justify-center gap-10 animate-in slide-in-from-bottom-12 duration-1000 delay-300">
        {callStatus === 'ringing' && isIncoming ? (
          <>
            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={onReject}
                className="group relative w-20 h-20 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-red-500 transition-all hover:bg-red-500 hover:text-white hover:scale-110 active:scale-90"
              >
                <div className="absolute inset-0 rounded-full bg-red-500 blur-xl opacity-0 group-hover:opacity-40 transition-opacity" />
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[135deg] relative z-10">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={onAccept}
                className="group relative w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white shadow-[0_0_40px_rgba(34,197,94,0.5)] transition-all hover:scale-125 hover:rotate-12 active:scale-95 animate-bounce"
              >
                <div className="absolute inset-0 rounded-full bg-green-400 blur-2xl opacity-60 animate-pulse" />
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Accept</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <button 
              onClick={onEnd}
              className="group relative w-20 h-20 rounded-full bg-red-600 flex items-center justify-center text-white shadow-[0_0_50px_rgba(220,38,38,0.4)] transition-all hover:scale-110 hover:bg-red-500 active:scale-95"
            >
              <div className="absolute inset-0 rounded-full bg-red-600 blur-2xl opacity-40 group-hover:opacity-70 transition-opacity" />
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[135deg] relative z-10">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">End Session</span>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes wave-enhanced {
          0%, 100% { height: 15%; opacity: 0.3; }
          50% { height: 100%; opacity: 1; transform: scaleY(1.2); }
        }
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>

      {/* Audio elements */}
      <audio ref={remoteVideoRef} autoPlay playsInline />
      <audio ref={localVideoRef} autoPlay playsInline muted />
    </div>
  );
}
