import React from "react";
import { Message, UserType } from "../types";

interface PollCardProps {
  message: Message;
  currentUser: UserType;
  isMe: boolean;
  onVote: (messageId: string, optionId: string) => void;
  onClose: (messageId: string) => void;
}

export const PollCard: React.FC<PollCardProps> = ({
  message,
  currentUser,
  isMe,
  onVote,
  onClose,
}) => {
  const poll = message.pollMeta;
  if (!poll) return null;

  const totalVotes = poll.votes?.length || 0;
  const myVote = poll.votes?.find(
    (v) => v.user.trim().toLowerCase() === currentUser.trim().toLowerCase()
  );
  const closed = Boolean(poll.closed);

  return (
    <div className="mt-1.5 min-w-[220px] max-w-[280px] space-y-2">
      <p className="text-sm font-semibold text-white leading-snug">{poll.question}</p>
      <div className="space-y-1.5">
        {poll.options.map((opt) => {
          const count = (poll.votes || []).filter((v) => v.optionId === opt.id).length;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const selected = myVote?.optionId === opt.id;
          return (
            <button
              key={opt.id}
              disabled={closed}
              onClick={(e) => {
                e.stopPropagation();
                if (!closed) onVote(message._id, opt.id);
              }}
              className={`relative w-full text-left overflow-hidden rounded-xl border px-3 py-2.5 transition-all ${
                selected
                  ? isMe
                    ? "border-white/40 bg-white/15"
                    : "border-indigo-400/50 bg-indigo-500/20"
                  : "border-white/10 bg-black/20 hover:bg-black/30"
              } ${closed ? "cursor-default" : "active:scale-[0.99]"}`}
            >
              <div
                className={`absolute inset-y-0 left-0 ${
                  isMe ? "bg-white/10" : "bg-indigo-500/15"
                }`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-white truncate">
                  {selected ? "✓ " : ""}
                  {opt.text}
                </span>
                <span className="text-[10px] text-white/60 shrink-0">
                  {count > 0 ? `${pct}%` : ""}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-white/50">
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
          {closed ? " · Closed" : ""}
        </p>
        {isMe && !closed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(message._id);
            }}
            className="text-[10px] font-semibold text-white/70 hover:text-white uppercase tracking-wider"
          >
            Close poll
          </button>
        )}
      </div>
    </div>
  );
};
