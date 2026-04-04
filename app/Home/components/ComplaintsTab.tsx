import React from "react";
import { Ticket, ViewType, UserType } from "../types";

interface ComplaintsTabProps {
  currentUser: ViewType;
  newTicket: string;
  setNewTicket: (val: string) => void;
  handleCreateTicket: (e: React.FormEvent) => void;
  tickets: Ticket[];
  handleUpdateTicketStatus: (id: string, currentStatus: string) => void;
}

export function ComplaintsTab({
  currentUser,
  newTicket,
  setNewTicket,
  handleCreateTicket,
  tickets,
  handleUpdateTicketStatus
}: ComplaintsTabProps) {
  return (
    <div className="space-y-12">
      {/* Section 1: Register Complaint */}
      <section className="space-y-6">
        <div className="flex items-end justify-between px-1">
          <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
            <span className="w-2 h-2 bg-white rounded-full"></span>
            New Complaint
          </h2>
          <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Priority: High</span>
        </div>
        <div className="bg-zinc-900 p-6 sm:p-8 rounded-[2.5rem] border border-zinc-800/50 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[80px] -mr-16 -mt-16 rounded-full"></div>
          <form onSubmit={handleCreateTicket} className="flex flex-col gap-6 relative z-10">
            <textarea autoComplete="off" spellCheck={false}
              value={newTicket}
              onChange={(e) => setNewTicket(e.target.value)}
              className="w-full p-6 bg-zinc-950 border border-zinc-800 rounded-3xl focus:border-zinc-600 outline-none text-white font-bold text-sm min-h-[140px] placeholder:text-zinc-800 transition-all shadow-inner resize-none"
              placeholder="Describe the issue in detail..."
              required
            />
            <button
              type="submit"
              className="bg-white text-black py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-zinc-200 transition-all active:scale-[0.97] shadow-xl shadow-white/5"
            >
              Submit
            </button>
          </form>
          
          {/* Your Own Complaints Feed */}
          <div className="mt-10 space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="flex-1 h-px bg-zinc-800"></div>
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em] whitespace-nowrap">Your Entries</p>
              <div className="flex-1 h-px bg-zinc-800"></div>
            </div>
            <div className="space-y-4">
              {tickets.filter(t => t.createdBy === currentUser).length === 0 ? (
                <p className="text-zinc-800 text-[10px] font-black text-center uppercase tracking-widest py-4 italic border border-dashed border-zinc-800 rounded-3xl">Zero outgoing logs</p>
              ) : (
                tickets.filter(t => t.createdBy === currentUser).map((ticket) => (
                  <div key={ticket._id} className="p-6 bg-zinc-950/40 border border-zinc-800 rounded-3xl hover:border-zinc-700 transition-colors group">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[9px] text-zinc-600 font-black uppercase tracking-tighter bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 group-hover:text-zinc-400 transition-colors">ID: {ticket._id.slice(-6)}</span>
                      <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${ticket.status === 'closed' ? 'bg-green-950/30 text-green-500 border border-green-900/30' : 'bg-amber-950/30 text-amber-500 border border-amber-900/30'}`}>
                        {ticket.status === 'closed' ? 'Verified' : 'In Progress'}
                      </span>
                    </div>
                    <p className={`text-zinc-300 text-sm font-bold leading-relaxed ${ticket.status === 'closed' ? 'line-through text-zinc-700' : ''}`}>{ticket.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Complaint Against You */}
      <section className="space-y-6">
        <div className="flex items-end justify-between px-1">
          <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
            Incoming Issues
          </h2>
          <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Status: Alert</span>
        </div>
        <div className="space-y-4">
          {tickets.filter(t => t.createdBy !== currentUser).length === 0 ? (
            <div className="bg-zinc-900/30 border-2 border-dashed border-zinc-900 rounded-[3rem] p-16 text-center group">
              <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.4em] group-hover:text-zinc-500 transition-colors">Integrity Maintained</p>
            </div>
          ) : (
            tickets.filter(t => t.createdBy !== currentUser).map((ticket) => (
              <div 
                key={ticket._id} 
                onClick={() => handleUpdateTicketStatus(ticket._id, ticket.status)}
                className={`p-8 rounded-[2.5rem] border transition-all cursor-pointer relative overflow-hidden group ${
                  ticket.status === 'closed' 
                    ? 'bg-zinc-900/20 border-zinc-900 opacity-60' 
                    : 'bg-zinc-900 border-zinc-800 hover:border-white shadow-2xl active:scale-[0.98]'
                }`}
              >
                {ticket.status === 'open' && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-white/5 transition-colors"></div>
                )}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">From: {ticket.createdBy}</span>
                    <span className="text-[8px] font-black text-zinc-700 uppercase tracking-tighter font-mono">{new Date(ticket.createdAt).toLocaleString()}</span>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${
                    ticket.status === 'closed' 
                      ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                      : 'bg-zinc-950 border-zinc-800 text-white group-hover:border-white'
                  }`}>
                    {ticket.status === 'closed' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    )}
                  </div>
                </div>
                <p className={`text-base font-bold leading-relaxed mb-6 ${ticket.status === 'closed' ? 'text-zinc-600 line-through' : 'text-white'}`}>{ticket.description}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl border ${
                    ticket.status === 'closed' 
                      ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500 group-hover:text-white group-hover:border-white'
                  }`}>
                    {ticket.status === 'closed' ? 'Resolution Verified' : 'Awaiting Resolution'}
                  </span>
                  {ticket.status === 'open' && (
                    <span className="text-[9px] font-black text-white uppercase tracking-widest bg-red-600 px-3 py-1.5 rounded-xl animate-pulse">Action Required</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
