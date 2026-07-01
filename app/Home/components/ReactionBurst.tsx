"use client";

import React, { useEffect, useState } from "react";
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

export const ReactionBurst: React.FC<ReactionBurstProps> = ({ reaction, onComplete, subtle = false }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const burstKeyRef = React.useRef(0);

  useEffect(() => {
    if (!reaction) return;

    burstKeyRef.current += 1;
    const emoji = REACTION_EMOJIS[reaction];
    const count = subtle ? 2 : 3;
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: burstKeyRef.current * 100 + i,
      emoji,
      left: 20 + (i / Math.max(count - 1, 1)) * 60 + (Math.random() - 0.5) * 12,
      delay: i * 0.08 + Math.random() * 0.06,
      duration: 0.85 + Math.random() * 0.25,
      size: 1.1 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 50,
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
      onComplete();
    }, 1150);

    return () => clearTimeout(timer);
  }, [reaction, onComplete, subtle]);

  if (!reaction || particles.length === 0) return null;

  return (
    <div className={`absolute inset-0 pointer-events-none z-[50] overflow-hidden ${subtle ? "opacity-70" : ""}`}>
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
