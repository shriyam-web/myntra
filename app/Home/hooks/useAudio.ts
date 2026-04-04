import { useEffect, useRef, useCallback } from "react";
import { ViewType } from "../types";

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export function useAudio(isSoundEnabled: boolean, setIsSoundEnabled: (val: boolean) => void, view: ViewType) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const lastSoundTimeRef = useRef<number>(0);

  // Keep-alive silent audio loop to prevent background throttling
  useEffect(() => {
    if (isSoundEnabled && view !== "login") {
      if (!silentAudioRef.current) {
        // 1-second silent WAV base64
        const silentSrc = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
        silentAudioRef.current = new Audio(silentSrc);
        silentAudioRef.current.loop = true;
        silentAudioRef.current.volume = 0.01; // Nearly silent
      }
      
      const playSilent = async () => {
        try {
          await silentAudioRef.current?.play();
          console.log("🔊 Keep-alive silent audio started");
        } catch (e) {
          console.warn("Silent audio failed (interaction required):", e);
        }
      };
      
      playSilent();
      
      return () => {
        silentAudioRef.current?.pause();
      };
    }
  }, [isSoundEnabled, view]);

  // Initialize Audio Context and load sound
  useEffect(() => {
    if (isSoundEnabled && !audioContextRef.current) {
      const initAudio = async () => {
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          audioContextRef.current = new AudioContextClass();
          
          const response = await fetch("/notification1.mp3");
          const arrayBuffer = await response.arrayBuffer();
          if (audioContextRef.current) {
            audioBufferRef.current = await audioContextRef.current.decodeAudioData(arrayBuffer);
          }
        } catch (e) {
          console.error("Failed to initialize Web Audio API:", e);
        }
      };
      initAudio();
    }
  }, [isSoundEnabled]);

  const playSound = useCallback(() => {
    if (!isSoundEnabled) return;

    // Prevent "sound burst" by throttling playSound calls (max once every 2 seconds)
    const now = Date.now();
    if (now - lastSoundTimeRef.current < 2000) {
      console.log("🔊 Sound throttled to prevent burst");
      return;
    }
    lastSoundTimeRef.current = now;

    const play = async (retryCount = 0) => {
      try {
        // Try Web Audio API first
        if (audioContextRef.current && audioBufferRef.current) {
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }
          const source = audioContextRef.current.createBufferSource();
          source.buffer = audioBufferRef.current;
          source.connect(audioContextRef.current.destination);
          source.start(0);
          return;
        }

        // Fallback to standard Audio object
        if (!audioRef.current) {
          audioRef.current = new Audio("/notification1.mp3");
          audioRef.current.preload = "auto";
        }
        
        // Ensure properties are set every time for background playback
        audioRef.current.muted = false;
        audioRef.current.volume = 1.0;
        audioRef.current.currentTime = 0;
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      } catch (e) {
        console.warn(`Sound play attempt ${retryCount + 1} failed:`, e);
        if (retryCount < 3) {
          setTimeout(() => play(retryCount + 1), 500);
        }
      }
    };

    play();
  }, [isSoundEnabled]);

  const handleToggleSound = useCallback(() => {
    const newSoundState = !isSoundEnabled;
    setIsSoundEnabled(newSoundState);
    
    if (newSoundState) {
      // Re-initialize AudioContext and Silent Loop on user gesture
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextClass();
        }
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        // Start silent loop immediately
        if (silentAudioRef.current) {
          silentAudioRef.current.play().catch(e => console.warn("Silent audio failed to start on toggle:", e));
        }
      } catch (e) {
        console.error("Manual audio init failed:", e);
      }
    } else {
      // Pause silent loop if turning off
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
      }
    }
  }, [isSoundEnabled, setIsSoundEnabled]);

  return { playSound, handleToggleSound };
}
