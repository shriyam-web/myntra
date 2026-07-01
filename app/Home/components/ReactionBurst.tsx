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
    const count = subtle ? 8 : 18;
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: burstKeyRef.current * 100 + i,
      emoji,
      left: 10 + Math.random() * 80,
      delay: Math.random() * (subtle ? 0.3 : 0.4),
      duration: (subtle ? 1.4 : 1.8) + Math.random() * (subtle ? 0.8 : 1.2),
      size: (subtle ? 0.9 : 1.2) + Math.random() * (subtle ? 0.8 : 1.6),
      drift: (Math.random() - 0.5) * (subtle ? 80 : 120),
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
      onComplete();
    }, subtle ? 2400 : 3200);

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
