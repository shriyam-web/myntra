import React from "react";
import { createPortal } from "react-dom";
import { Message } from "../types";

interface MessageActionMenuProps {
  messageId: string;
  message: Message;
  isMe: boolean;
  isPinned: boolean;
  onPin: () => void;
  onReply?: () => void;
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

export const MessageActionMenu: React.FC<MessageActionMenuProps> = ({
  messageId,
  message,
  isMe,
  isPinned,
  onPin,
  onReply,
  onCopy,
  onEdit,
  onDelete,
  onClose,
}) => {
  const canEdit = isMe && !!message.text;
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);

  React.useLayoutEffect(() => {
    const updatePosition = () => {
      const bubble = document.querySelector(`#message-${messageId} [data-message-bubble]`);
      if (!bubble) return;
      const rect = bubble.getBoundingClientRect();
      const menuWidth = 176;
      const menuHeight = 176;
      const gap = 8;
      const padding = 8;

      let top = rect.bottom + gap;
      if (top + menuHeight > window.innerHeight - padding) {
        top = Math.max(padding, rect.top - menuHeight - gap);
      }

      let left = isMe ? rect.right - menuWidth : rect.left;
      left = Math.max(padding, Math.min(left, window.innerWidth - menuWidth - padding));

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isMe, messageId]);

  if (!position || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-action-menu
      className="fixed z-[170] min-w-[168px] py-1.5 bg-zinc-900/98 border border-zinc-700/60 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      {onReply && (
        <button
          onClick={() => { onReply(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
            <polyline points="9 17 4 12 9 7" />
            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
          </svg>
          <span className="text-xs font-medium">Reply</span>
        </button>
      )}

      <button
        onClick={() => { onPin(); onClose(); }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-zinc-200 hover:bg-zinc-800 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isPinned ? "text-amber-400" : "text-zinc-400"}>
          <path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2z" />
        </svg>
        <span className="text-xs font-medium">{isPinned ? "Unpin" : "Pin"}</span>
      </button>

      {onCopy && (
        <button
          onClick={() => { onCopy(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          <span className="text-xs font-medium">Copy Message</span>
        </button>
      )}

      {canEdit && onEdit && (
        <button
          onClick={() => { onEdit(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
          <span className="text-xs font-medium">Edit</span>
        </button>
      )}

      {isMe && onDelete && (
        <button
          onClick={() => { onDelete(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          <span className="text-xs font-medium">Delete</span>
        </button>
      )}
    </div>
    ,
    document.body
  );
};
