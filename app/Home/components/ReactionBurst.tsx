"use client";

import React, { useEffect, useRef, useState } from "react";
import { ReactionType } from "../types";
import { REACTION_EMOJIS } from "../constants";

interface Particle {
  id: number;
  emoji: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
}

interface ReactionBurstProps {
  reaction: ReactionType | null;
  onComplete: () => void;
  subtle?: boolean;
}

const BURST_TOTAL_MS = 2000;

export const ReactionBurst: React.FC<ReactionBurstProps> = ({
  reaction,
  onComplete,
  subtle = false,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const burstKeyRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const playingReactionRef = useRef<ReactionType | null>(null);

  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!reaction) {
      setParticles([]);
      playingReactionRef.current = null;
      return;
    }

    if (playingReactionRef.current === reaction) {
      return;
    }

    playingReactionRef.current = reaction;
    burstKeyRef.current += 1;
    const burstId = burstKeyRef.current;
    const emoji = REACTION_EMOJIS[reaction];
    const count = subtle ? 2 : 3;

    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: burstId * 100 + i,
      emoji,
      left: 20 + (i / Math.max(count - 1, 1)) * 60 + (Math.random() - 0.5) * 12,
      delay: i * 0.08 + Math.random() * 0.06,
      duration: 0.9 + Math.random() * 0.2,
      size: 1.1 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 50,
    }));

    setParticles(newParticles);

    const timer = window.setTimeout(() => {
      playingReactionRef.current = null;
      setParticles([]);
      onCompleteRef.current();
    }, BURST_TOTAL_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [reaction, subtle]);

  if (!reaction || particles.length === 0) return null;

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-[50] overflow-hidden ${subtle ? "opacity-70" : ""}`}
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="reaction-particle absolute bottom-0 select-none"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}rem`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--drift" as string]: `${p.drift}px`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
};
