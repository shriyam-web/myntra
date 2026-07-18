"use client";

import React, { useEffect, useRef, useState, useMemo, memo } from "react";

interface CallOverlayProps {
  currentUser: string;
  partnerName: string;
  callStatus: 'idle' | 'ringing' | 'on-call';
  endReason?: 'completed' | 'missed' | 'rejected' | null;
  isIncoming: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  stream: MediaStream | null;
  remoteStream: MediaStream | null;
}

// Isolated so the 1s tick doesn't re-render the whole overlay.
const CallTimer = memo(function CallTimer({ active }: { active: boolean }) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!active) {
      setDuration(0);
      return;
    }
    const interval = setInterval(() => setDuration((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  return (
    <div className="px-6 py-2 rounded-2xl bg-zinc-900/70 border border-white/5">
      <span className="text-2xl font-mono font-medium tracking-widest text-indigo-400">
        {mins}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  );
});

const BAR_COUNT = 16;

export const CallOverlay = memo(function CallOverlay({
  partnerName,
  callStatus,
  endReason,
  isIncoming,
  onAccept,
  onReject,
  onEnd,
  stream,
  remoteStream
}: CallOverlayProps) {
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const [accepting, setAccepting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [speakerSupported, setSpeakerSupported] = useState(false);

  // Fixed heights computed once — no per-render randomness.
  const barHeights = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, i) => 30 + ((i * 37) % 60)),
    []
  );

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localAudioRef.current && stream) {
      localAudioRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (callStatus !== 'ringing') setAccepting(false);
  }, [callStatus]);

  // Speaker toggle needs setSinkId (Chrome/Edge/Android). Hidden where unsupported (iOS Safari).
  useEffect(() => {
    const el = remoteAudioRef.current;
    setSpeakerSupported(Boolean(el && typeof (el as HTMLAudioElement & { setSinkId?: unknown }).setSinkId === "function"));
  }, [callStatus]);

  // Reset per-call toggles and re-apply mute to the current mic track.
  useEffect(() => {
    if (callStatus === 'idle') {
      setIsMuted(false);
      setIsSpeakerOn(false);
    }
  }, [callStatus]);

  useEffect(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
  }, [stream, isMuted]);

  if (callStatus === 'idle' && !endReason) return null;

  const handleAcceptTap = () => {
    if (accepting) return;
    setAccepting(true);
    onAccept();
  };

  const toggleMute = () => setIsMuted((prev) => !prev);

  const toggleSpeaker = async () => {
    const el = remoteAudioRef.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!el?.setSinkId) return;

    const next = !isSpeakerOn;
    try {
      if (next) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const speaker = devices.find(
          (d) => d.kind === 'audiooutput' && /speaker/i.test(d.label)
        );
        await el.setSinkId(speaker ? speaker.deviceId : 'default');
      } else {
        await el.setSinkId('default');
      }
      setIsSpeakerOn(next);
    } catch (e) {
      console.error("Failed to switch audio output:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-zinc-950 flex flex-col items-center justify-between text-white overflow-hidden font-sans">
      {/* Static, cheap background — no animated mega-blurs */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,0.14)_0%,rgba(168,85,247,0.08)_35%,rgba(9,9,11,1)_75%)]" />

      {/* Top Bar / Status */}
      <div className="relative z-10 w-full px-8 pt-12 flex flex-col items-center">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-2xl">
          <div className={`w-2 h-2 rounded-full ${
            endReason ? 'bg-red-500' :
            callStatus === 'on-call' ? 'bg-green-500' :
            'bg-indigo-500 animate-pulse'
          }`} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
            {endReason === 'rejected' ? 'Call Rejected' :
             endReason === 'missed' ? 'Call Missed' :
             endReason === 'completed' ? 'Call Ended' :
             callStatus === 'ringing'
              ? (isIncoming ? (accepting ? 'Connecting…' : 'Incoming Audio Call') : 'Calling...')
              : 'Secure Connection Active'}
          </span>
        </div>
      </div>

      {/* Center Content: Avatar & Info */}
      <div className="relative z-10 flex flex-col items-center gap-8 mt-4">
        <div className="relative">
          {/* Single lightweight ping while ringing */}
          {callStatus === 'ringing' && !endReason && !accepting && (
            <div className="absolute -inset-4 rounded-full border-2 border-indigo-500/30 animate-ping" />
          )}

          {/* Avatar */}
          <div className="relative w-40 h-40 rounded-full p-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-xl">
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
          <CallTimer active={callStatus === 'on-call'} />
        </div>
      </div>

      {/* Visualizer — pure CSS animation, fixed heights, GPU-friendly scaleY */}
      <div className="relative z-10 w-full max-w-lg h-32 flex items-center justify-center px-12">
        <div className="flex items-end justify-center gap-1.5 w-full h-16">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full bg-gradient-to-t from-indigo-500 via-purple-500 to-pink-500 origin-bottom ${
                callStatus === 'on-call' ? 'opacity-100 call-wave-bar' : 'opacity-20'
              }`}
              style={{
                height: `${h}%`,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Control Buttons — tap-based, instant feedback */}
      {!endReason && (
        <div className="relative z-10 w-full max-w-md px-12 pb-20 flex justify-center gap-10">
          {callStatus === 'ringing' && isIncoming ? (
          <>
            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={onReject}
                disabled={accepting}
                className="w-20 h-20 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-red-500 active:scale-90 active:bg-red-500 active:text-white transition-transform duration-100 touch-manipulation select-none disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[135deg] pointer-events-none">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={handleAcceptTap}
                disabled={accepting}
                className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/40 active:scale-90 transition-transform duration-100 touch-manipulation select-none disabled:opacity-70"
              >
                {accepting ? (
                  <span className="w-7 h-7 border-[3px] border-white/40 border-t-white rounded-full animate-spin pointer-events-none" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                )}
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-500">
                {accepting ? 'Connecting' : 'Accept'}
              </span>
            </div>
          </>
        ) : (
          <>
            {callStatus === 'on-call' && (
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-transform duration-100 touch-manipulation select-none border ${
                    isMuted
                      ? 'bg-white text-zinc-900 border-white'
                      : 'bg-zinc-900 text-white border-white/10'
                  }`}
                  aria-pressed={isMuted}
                >
                  {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
                      <line x1="2" y1="2" x2="22" y2="22"/>
                      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
                      <path d="M5 10v2a7 7 0 0 0 12 5"/>
                      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
                      <line x1="12" y1="19" x2="12" y2="22"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="22"/>
                    </svg>
                  )}
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  {isMuted ? 'Unmute' : 'Mute'}
                </span>
              </div>
            )}

            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={onEnd}
                className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/40 active:scale-90 transition-transform duration-100 touch-manipulation select-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[135deg] pointer-events-none">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                {callStatus === 'on-call' ? 'End' : 'End Session'}
              </span>
            </div>

            {callStatus === 'on-call' && speakerSupported && (
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={toggleSpeaker}
                  className={`w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-transform duration-100 touch-manipulation select-none border ${
                    isSpeakerOn
                      ? 'bg-white text-zinc-900 border-white'
                      : 'bg-zinc-900 text-white border-white/10'
                  }`}
                  aria-pressed={isSpeakerOn}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    {isSpeakerOn ? (
                      <>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                      </>
                    ) : (
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    )}
                  </svg>
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Speaker
                </span>
              </div>
            )}
          </>
        )}
      </div>
      )}

      <style jsx>{`
        .call-wave-bar {
          animation: call-wave 1.2s ease-in-out infinite;
        }
        @keyframes call-wave {
          0%, 100% { transform: scaleY(0.35); opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>

      {/* Audio elements */}
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <audio ref={localAudioRef} autoPlay playsInline muted />
    </div>
  );
});
