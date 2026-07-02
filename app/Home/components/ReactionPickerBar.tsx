"use client";

import React, { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { REACTION_EMOJIS, REACTION_OPTIONS } from "../constants";
import { ReactionType } from "../types";

interface ReactionPickerBarProps {
  messageId: string;
  myReactionType?: ReactionType;
  onSelect: (type: ReactionType) => void;
  onRemove?: () => void;
  onClose: () => void;
}

const PICKER_HEIGHT = 52;
const VIEWPORT_PADDING = 8;

export const ReactionPickerBar: React.FC<ReactionPickerBarProps> = ({
  messageId,
  myReactionType,
  onSelect,
  onRemove,
  onClose,
}) => {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    const updatePosition = () => {
      const bubble = document.querySelector(
        `#message-${messageId} [data-message-bubble]`
      );
      if (!bubble) return;

      const rect = bubble.getBoundingClientRect();
      const width = Math.min(window.innerWidth - VIEWPORT_PADDING * 2, 360);
      const gap = 10;

      let top = rect.top - PICKER_HEIGHT - gap;
      if (top < VIEWPORT_PADDING) {
        top = rect.bottom + gap;
      }

      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(
        VIEWPORT_PADDING,
        Math.min(left, window.innerWidth - width - VIEWPORT_PADDING)
      );

      setPosition({ top, left, width });
    };

    updatePosition();

    const scrollParent = document.querySelector(
      `#message-${messageId}`
    )?.closest(".overflow-y-auto");

    window.addEventListener("resize", updatePosition);
    scrollParent?.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      scrollParent?.removeEventListener("scroll", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [messageId]);

  if (!position || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[145]"
        aria-hidden
        onClick={onClose}
      />
      <div
        data-reaction-picker
        role="toolbar"
        aria-label="React to message"
        className="fixed z-[150] flex items-center gap-0.5 px-2 py-1.5 bg-zinc-900/98 border border-zinc-600/60 rounded-full shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 overflow-x-auto no-scrollbar touch-pan-x"
        style={{
          top: position.top,
          left: position.left,
          width: position.width,
          maxWidth: position.width,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {REACTION_OPTIONS.map((opt) => {
          const isActive = myReactionType === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => onSelect(opt.type)}
              className={`p-1.5 sm:p-2 rounded-full text-lg sm:text-xl shrink-0 transition-all active:scale-125 hover:scale-110 ${
                isActive
                  ? "bg-white/20 ring-2 ring-white/40 scale-110"
                  : "hover:bg-zinc-800"
              }`}
              title={opt.label}
            >
              {REACTION_EMOJIS[opt.type]}
            </button>
          );
        })}
        {myReactionType && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 bg-red-500/20 text-red-200 border border-red-400/30 hover:bg-red-500/30 transition-colors"
            title="Remove my reaction"
          >
            Remove
          </button>
        )}
      </div>
    </>,
    document.body
  );
};
