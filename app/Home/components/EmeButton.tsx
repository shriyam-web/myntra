"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as actions from "../../../lib/actions";
import { MAINTENANCE_REDIRECT_URL } from "../../../lib/maintenance";

const TAP_THRESHOLD_PX = 8;
const BUTTON_SIZE = 56;
const STORAGE_KEY = "sos_emergency_button_position";

interface Position {
  x: number;
  y: number;
}

function getDefaultPosition(): Position {
  if (typeof window === "undefined") return { x: 0, y: 0 };

  return {
    x: Math.max(12, window.innerWidth - BUTTON_SIZE - 16),
    y: Math.max(12, window.innerHeight - BUTTON_SIZE - 96),
  };
}

function clampPosition(pos: Position): Position {
  if (typeof window === "undefined") return pos;
  const maxX = window.innerWidth - BUTTON_SIZE - 8;
  const maxY = window.innerHeight - BUTTON_SIZE - 8;
  return {
    x: Math.min(Math.max(8, pos.x), maxX),
    y: Math.min(Math.max(8, pos.y), maxY),
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
  }, []);

  useEffect(() => {
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
      style={{ left: position.x, top: position.y, width: BUTTON_SIZE, height: BUTTON_SIZE }}
      className="fixed z-[210] touch-none select-none rounded-full bg-[#7B1E3A] text-white border-2 border-[#9B3A55]/80 shadow-[0_0_20px_rgba(123,30,58,0.4)] hover:bg-[#6B1A32] disabled:opacity-75 cursor-grab active:cursor-grabbing flex items-center justify-center"
      title="Emergency — drag to move, tap to activate"
      aria-label="Emergency SOS"
    >
      {isEnabling ? (
        <span className="text-lg font-black">…</span>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="relative drop-shadow-sm pointer-events-none"
          aria-hidden
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" fill="white" fillOpacity="0.15" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" strokeWidth="3" />
        </svg>
      )}
    </button>
  );
};
