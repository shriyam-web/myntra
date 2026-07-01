"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as actions from "../../../lib/actions";
import { MAINTENANCE_REDIRECT_URL } from "../../../lib/maintenance";

const STORAGE_KEY = "eme_button_position";
const TAP_THRESHOLD_PX = 8;

interface Position {
  x: number;
  y: number;
}

function getDefaultPosition(): Position {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  const width = 72;
  const height = 40;
  return {
    x: Math.max(12, window.innerWidth - width - 16),
    y: Math.max(12, window.innerHeight - height - 100),
  };
}

function loadPosition(): Position {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPosition();
    const parsed = JSON.parse(raw) as Position;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return clampPosition(parsed);
    }
  } catch {
    // ignore
  }
  return getDefaultPosition();
}

function clampPosition(pos: Position): Position {
  if (typeof window === "undefined") return pos;
  const width = 72;
  const height = 40;
  const maxX = window.innerWidth - width - 8;
  const maxY = window.innerHeight - height - 8;
  return {
    x: Math.min(Math.max(8, pos.x), maxX),
    y: Math.min(Math.max(8, pos.y), maxY),
  };
}

export const EmeButton: React.FC = () => {
  const [position, setPosition] = useState<Position | null>(null);
  const [isEnabling, setIsEnabling] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    setPosition(loadPosition());

    const handleResize = () => {
      setPosition((prev) => (prev ? clampPosition(prev) : getDefaultPosition()));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const persistPosition = useCallback((pos: Position) => {
    const next = clampPosition(pos);
    setPosition(next);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const triggerEmergency = useCallback(async () => {
    if (isEnabling) return;
    setIsEnabling(true);

    try {
      await Promise.race([
        actions.enableMaintenanceMode("alpha 1"),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);
    } catch (error) {
      console.error("Failed to enable maintenance mode:", error);
    }

    window.location.replace(MAINTENANCE_REDIRECT_URL);
  }, [isEnabling]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!position || isEnabling) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - drag.startX;
    const deltaY = e.clientY - drag.startY;

    if (Math.hypot(deltaX, deltaY) > TAP_THRESHOLD_PX) {
      drag.moved = true;
    }

    persistPosition({
      x: drag.originX + deltaX,
      y: drag.originY + deltaY,
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const wasTap = !drag.moved;
    dragRef.current = null;

    if (wasTap) {
      void triggerEmergency();
    }
  };

  if (!position) return null;

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
      disabled={isEnabling}
      style={{ left: position.x, top: position.y }}
      className="fixed z-[95] touch-none select-none px-3.5 py-2 rounded-full bg-zinc-950/95 border border-rose-500/45 text-rose-300 shadow-2xl backdrop-blur-xl hover:bg-rose-500/20 hover:border-rose-400/60 active:scale-95 transition-[transform,background-color,border-color] disabled:opacity-70 cursor-grab active:cursor-grabbing"
      title="Emergency — drag to move, tap to activate"
      aria-label="Emergency maintenance"
    >
      <span className="text-[11px] font-black tracking-[0.2em] uppercase pointer-events-none">
        {isEnabling ? "…" : "Eme."}
      </span>
    </button>
  );
};
