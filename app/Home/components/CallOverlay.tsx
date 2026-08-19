"use client";

import React, { useEffect, useRef, useState, useMemo, memo } from "react";

interface CallOverlayProps {
  currentUser: string;
  partnerName: string;
  callStatus: 'idle' | 'ringing' | 'on-call';
  uiStatus?: 'idle' | 'dialing' | 'ringing' | 'connecting' | 'active' | 'reconnecting' | 'ended';
  endReason?: 'completed' | 'missed' | 'rejected' | 'cancelled' | 'timeout' | 'failed' | 'disconnected' | 'busy' | null;
  isIncoming: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  stream: MediaStream | null;
  remoteStream: MediaStream | null;
  activeAt?: string | null;
  statsLabel?: string;
  quality?: string;
  busyMessage?: string | null;
}

// Isolated so the 1s tick doesn't re-render the whole overlay.
const CallTimer = memo(function CallTimer({ activeAt }: { activeAt: string | null }) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!activeAt) {
      setDuration(0);
      return;
    }
    const start = new Date(activeAt).getTime();
    const tick = () => setDuration(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeAt]);

  if (!activeAt) return null;

  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  return (
    <span className="text-xl font-mono font-medium tracking-[0.2em] text-zinc-400 tabular-nums">
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  );
});

const BAR_COUNT = 16;

export const CallOverlay = memo(function CallOverlay({
  partnerName,
  callStatus,
  uiStatus = callStatus === 'on-call' ? 'active' : callStatus === 'ringing' ? 'ringing' : 'idle',
  endReason,
  isIncoming,
  onAccept,
  onReject,
  onEnd,
  stream,
  remoteStream,
  activeAt = null,
  statsLabel = "",
  quality = "unknown",
  busyMessage = null,
}: CallOverlayProps) {
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const ringbackCtxRef = useRef<AudioContext | null>(null);
  const ringbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [speakerSupported, setSpeakerSupported] = useState(false);
  const audioRoutesRef = useRef<{ earpiece: string | null; speaker: string | null }>({
    earpiece: null,
    speaker: null,
  });

  // Fixed heights computed once — no per-render randomness.
  const barHeights = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, i) => 30 + ((i * 37) % 60)),
    []
  );

  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el || !remoteStream) return;

    el.srcObject = remoteStream;
    el.autoplay = true;
    el.muted = false;
    el.volume = 1;
    el.setAttribute("playsinline", "true");

    const tryPlay = () => {
      const playPromise = el.play();
      if (playPromise) {
        playPromise.catch(() => {
          window.setTimeout(() => {
            void el.play().catch(() => undefined);
          }, 200);
        });
      }
    };

    tryPlay();
    const onUnmute = () => tryPlay();
    const onAddTrack = () => tryPlay();
    remoteStream.getAudioTracks().forEach((track) => {
      track.addEventListener("unmute", onUnmute);
    });
    remoteStream.addEventListener("addtrack", onAddTrack);

    return () => {
      remoteStream.getAudioTracks().forEach((track) => {
        track.removeEventListener("unmute", onUnmute);
      });
      remoteStream.removeEventListener("addtrack", onAddTrack);
    };
  }, [remoteStream]);

  useEffect(() => {
    if (localAudioRef.current && stream) {
      localAudioRef.current.srcObject = stream;
    }
  }, [stream]);

  // Incoming ringtone for the callee (best-effort — some browsers block it until a tap).
  useEffect(() => {
    const shouldRing = callStatus === "ringing" && isIncoming && !endReason && !accepting;
    if (!shouldRing) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const playBurst = (startAt: number, durationSec: number) => {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.16, startAt + 0.02);
      gain.gain.setValueAtTime(0.16, startAt + durationSec - 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
      gain.connect(ctx.destination);
      for (const freq of [440, 480]) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(startAt);
        osc.stop(startAt + durationSec);
      }
    };

    const scheduleCycle = () => {
      if (ctx.state === "closed") return;
      if (ctx.state === "suspended") void ctx.resume();
      const now = ctx.currentTime;
      playBurst(now, 0.9);
      playBurst(now + 1.1, 0.9);
      timer = setTimeout(scheduleCycle, 3200);
    };

    scheduleCycle();

    return () => {
      if (timer) clearTimeout(timer);
      void ctx.close().catch(() => undefined);
    };
  }, [callStatus, isIncoming, endReason, accepting]);

  // Outgoing ringback: tring…tring… while waiting for the partner to pick up.
  useEffect(() => {
    const shouldRing = callStatus === 'ringing' && !isIncoming && !endReason;

    const stopRingback = () => {
      if (ringbackTimerRef.current) {
        clearTimeout(ringbackTimerRef.current);
        ringbackTimerRef.current = null;
      }
      if (ringbackCtxRef.current) {
        void ringbackCtxRef.current.close().catch(() => undefined);
        ringbackCtxRef.current = null;
      }
    };

    if (!shouldRing) {
      stopRingback();
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    ringbackCtxRef.current = ctx;

    const playBurst = (startAt: number, durationSec: number) => {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.03);
      gain.gain.setValueAtTime(0.12, startAt + durationSec - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
      gain.connect(ctx.destination);

      // Classic dual-tone ringback (440 + 480 Hz)
      for (const freq of [440, 480]) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(startAt);
        osc.stop(startAt + durationSec);
      }
    };

    const scheduleCycle = () => {
      if (ringbackCtxRef.current !== ctx) return;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const now = ctx.currentTime;
      // tring (0.4s) — short gap — tring (0.4s) — pause
      playBurst(now, 0.4);
      playBurst(now + 0.6, 0.4);
      ringbackTimerRef.current = setTimeout(scheduleCycle, 2800);
    };

    scheduleCycle();

    return stopRingback;
  }, [callStatus, isIncoming, endReason]);

  useEffect(() => {
    if (callStatus !== "ringing") setAccepting(false);
  }, [callStatus]);

  // Keep the screen awake while a call is live so mobile browsers don't freeze WebRTC.
  useEffect(() => {
    if (callStatus !== "on-call") return;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    if (!nav.wakeLock?.request) return;
    let sentinel: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    nav.wakeLock
      .request("screen")
      .then((lock) => {
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      void sentinel?.release();
    };
  }, [callStatus]);

  useEffect(() => {
    if (callStatus !== "on-call" || !remoteStream) return;

    const el = remoteAudioRef.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!el || typeof el.setSinkId !== "function") {
      setSpeakerSupported(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter((d) => d.kind === "audiooutput");
        const earpiece = outputs.find((d) => /earpiece|receiver/i.test(d.label));
        const speaker = outputs.find((d) => /speakerphone|loudspeaker/i.test(d.label))
          || outputs.find((d) => /speaker/i.test(d.label) && !/earpiece|receiver/i.test(d.label));
        if (cancelled) return;

        audioRoutesRef.current = {
          earpiece: earpiece?.deviceId ?? null,
          speaker: speaker?.deviceId ?? "",
        };

        // Default to the loudspeaker. Forcing the earpiece previously made some
        // Android Chrome calls silent.
        try {
          await el.setSinkId(audioRoutesRef.current.speaker ?? "");
        } catch {
          // keep browser default
        }
        if (!cancelled) {
          setIsSpeakerOn(true);
          setSpeakerSupported(Boolean(earpiece));
        }
      } catch (e) {
        console.error("Failed to enumerate audio outputs:", e);
        if (!cancelled) setSpeakerSupported(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [callStatus, remoteStream]);

  // Reset per-call toggles and re-apply mute to the current mic track.
  useEffect(() => {
    if (callStatus === 'idle') {
      setIsMuted(false);
      setIsSpeakerOn(true);
      audioRoutesRef.current = { earpiece: null, speaker: null };
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
    void remoteAudioRef.current?.play().catch(() => undefined);
    onAccept();
  };

  const toggleMute = () => setIsMuted((prev) => !prev);

  const toggleSpeaker = async () => {
    const el = remoteAudioRef.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!el?.setSinkId) return;

    const { earpiece, speaker } = audioRoutesRef.current;
    const next = !isSpeakerOn;
    const targetId = next ? speaker : earpiece;
    if (targetId == null) return;

    try {
      await el.setSinkId(targetId);
      setIsSpeakerOn(next);
    } catch (e) {
      console.error("Failed to switch audio output:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-white flex flex-col items-center justify-between text-zinc-900 overflow-hidden font-sans">
      {/* Top Bar / Status */}
      <div className="relative z-10 w-full px-8 pt-14 flex flex-col items-center">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100">
          <div className={`w-1.5 h-1.5 rounded-full ${
            endReason ? 'bg-red-500' :
            callStatus === 'on-call' ? 'bg-green-500' :
            'bg-indigo-500 animate-pulse'
          }`} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            {endReason === 'rejected' ? 'Call Rejected' :
             endReason === 'missed' || endReason === 'timeout' ? 'Call Missed' :
             endReason === 'busy' ? (busyMessage || 'Busy') :
             endReason === 'cancelled' ? 'Call Cancelled' :
             endReason === 'failed' ? 'Call Failed' :
             endReason === 'disconnected' ? 'Disconnected' :
             endReason === 'completed' ? 'Call Ended' :
             uiStatus === 'reconnecting' ? 'Reconnecting…' :
             uiStatus === 'connecting' ? 'Connecting…' :
             callStatus === 'ringing'
              ? (isIncoming ? (accepting ? 'Connecting…' : 'Incoming Call') : 'Calling…')
              : 'Secure Call'}
          </span>
        </div>
        {callStatus === 'on-call' && statsLabel && (
          <p className={`mt-3 text-[10px] font-medium uppercase tracking-widest ${
            quality === 'poor' ? 'text-amber-600' : 'text-zinc-400'
          }`}>
            {statsLabel}
          </p>
        )}
      </div>

      {/* Center Content: Avatar & Info */}
      <div className="relative z-10 flex flex-col items-center gap-7 mt-4">
        <div className="relative">
          {/* Single lightweight ping while ringing */}
          {callStatus === 'ringing' && !endReason && !accepting && (
            <div className="absolute -inset-3 rounded-full border border-indigo-300 animate-ping" />
          )}

          {/* Avatar */}
          <div className="relative w-36 h-36 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden">
            <span className="text-6xl font-semibold text-indigo-500 tracking-tight">
              {partnerName[0]?.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 capitalize">
            {partnerName}
          </h2>
          <CallTimer activeAt={activeAt} />
        </div>
      </div>

      {/* Visualizer — pure CSS animation, fixed heights, GPU-friendly scaleY */}
      <div className="relative z-10 w-full max-w-lg h-24 flex items-center justify-center px-12">
        <div className="flex items-end justify-center gap-1.5 w-full h-12">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full bg-indigo-400 origin-bottom ${
                callStatus === 'on-call' ? 'opacity-100 call-wave-bar' : 'opacity-15'
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
                className="w-[72px] h-[72px] rounded-full bg-red-500 flex items-center justify-center text-white active:scale-90 active:bg-red-600 transition-transform duration-100 touch-manipulation select-none disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[135deg] pointer-events-none">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
              <span className="text-[11px] font-medium tracking-wide text-zinc-500">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={handleAcceptTap}
                disabled={accepting}
                className="w-[72px] h-[72px] rounded-full bg-green-500 flex items-center justify-center text-white active:scale-90 active:bg-green-600 transition-transform duration-100 touch-manipulation select-none disabled:opacity-70"
              >
                {accepting ? (
                  <span className="w-7 h-7 border-[3px] border-white/40 border-t-white rounded-full animate-spin pointer-events-none" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                )}
              </button>
              <span className="text-[11px] font-medium tracking-wide text-zinc-500">
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
                  className={`w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-transform duration-100 touch-manipulation select-none ${
                    isMuted
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-700 active:bg-zinc-200'
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
                <span className="text-[11px] font-medium tracking-wide text-zinc-500">
                  {isMuted ? 'Unmute' : 'Mute'}
                </span>
              </div>
            )}

            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={onEnd}
                className="w-[72px] h-[72px] rounded-full bg-red-500 flex items-center justify-center text-white active:scale-90 active:bg-red-600 transition-transform duration-100 touch-manipulation select-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[135deg] pointer-events-none">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
              <span className="text-[11px] font-medium tracking-wide text-zinc-500">
                {callStatus === 'on-call' ? 'End' : 'Cancel'}
              </span>
            </div>

            {callStatus === 'on-call' && speakerSupported && (
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={toggleSpeaker}
                  className={`w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-transform duration-100 touch-manipulation select-none ${
                    isSpeakerOn
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-700 active:bg-zinc-200'
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
                <span className="text-[11px] font-medium tracking-wide text-zinc-500">
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
