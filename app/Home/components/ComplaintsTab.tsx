import React from "react";
import { Ticket, ViewType } from "../types";

interface ComplaintsTabProps {
  currentUser: ViewType;
  newTicket: string;
  setNewTicket: (val: string) => void;
  handleCreateTicket: (e: React.FormEvent) => void;
  tickets: Ticket[];
  handleUpdateTicketStatus: (id: string, currentStatus: string) => void;
}

function StatusBadge({ status }: { status: string }) {
  const closed = status === "closed";
  return (
    <span
      className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-md ${
        closed
          ? "bg-green-950/40 text-green-400"
          : "bg-amber-950/40 text-amber-400"
      }`}
    >
      {closed ? "Resolved" : "Open"}
    </span>
  );
}

export function ComplaintsTab({
  currentUser,
  newTicket,
  setNewTicket,
  handleCreateTicket,
  tickets,
  handleUpdateTicketStatus
}: ComplaintsTabProps) {
  const mine = tickets.filter((t) => t.createdBy === currentUser);
  const incoming = tickets.filter((t) => t.createdBy !== currentUser);

  return (
    <div className="space-y-5">
      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold text-white tracking-tight px-0.5">
          New complaint
        </h2>
        <form
          onSubmit={handleCreateTicket}
          className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 space-y-2.5"
        >
          <textarea
            autoComplete="off"
            spellCheck={false}
            value={newTicket}
            onChange={(e) => setNewTicket(e.target.value)}
            className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-zinc-600 outline-none text-white text-sm leading-snug min-h-[72px] placeholder:text-zinc-600 resize-none"
            placeholder="Describe the issue…"
            required
          />
          <button
            type="submit"
            className="w-full bg-white text-black py-2 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors active:scale-[0.98]"
          >
            Submit
          </button>
        </form>

        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-medium text-zinc-500 px-0.5">
            Your entries ({mine.length})
          </p>
          {mine.length === 0 ? (
            <p className="text-zinc-600 text-xs text-center py-3 border border-dashed border-zinc-800 rounded-xl">
              No complaints yet
            </p>
          ) : (
            <div className="space-y-1.5">
              {mine.map((ticket) => (
                <div
                  key={ticket._id}
                  className="px-3 py-2.5 bg-zinc-900/70 border border-zinc-800 rounded-xl"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[11px] text-zinc-500 font-medium">
                      #{ticket._id.slice(-6)}
                    </span>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p
                    className={`text-sm leading-snug ${
                      ticket.status === "closed"
                        ? "line-through text-zinc-600"
                        : "text-zinc-200"
                    }`}
                  >
                    {ticket.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold text-white tracking-tight px-0.5 flex items-center gap-2">
          Incoming
          {incoming.some((t) => t.status === "open") && (
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          )}
        </h2>
        {incoming.length === 0 ? (
          <p className="text-zinc-600 text-xs text-center py-3 border border-dashed border-zinc-800 rounded-xl">
            Nothing against you
          </p>
        ) : (
          <div className="space-y-1.5">
            {incoming.map((ticket) => (
              <button
                key={ticket._id}
                type="button"
                onClick={() => handleUpdateTicketStatus(ticket._id, ticket.status)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                  ticket.status === "closed"
                    ? "bg-zinc-900/40 border-zinc-900 opacity-70"
                    : "bg-zinc-900 border-zinc-800 hover:border-zinc-600 active:scale-[0.99]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] text-zinc-500 truncate">
                    {ticket.createdBy}
                    <span className="text-zinc-700"> · </span>
                    {new Date(ticket.createdAt).toLocaleDateString([], {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <StatusBadge status={ticket.status} />
                </div>
                <p
                  className={`text-sm leading-snug ${
                    ticket.status === "closed"
                      ? "text-zinc-600 line-through"
                      : "text-white"
                  }`}
                >
                  {ticket.description}
                </p>
                {ticket.status === "open" && (
                  <p className="text-[11px] text-zinc-500 mt-1.5">Tap to resolve</p>
                )}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
