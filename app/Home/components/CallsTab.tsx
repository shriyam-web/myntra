"use client";

import React from "react";
import { CallLog } from "../types";

interface CallsTabProps {
  callLogs: CallLog[];
  currentUser: string;
}

export function CallsTab({ callLogs, currentUser }: CallsTabProps) {
  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-semibold tracking-tight text-white">Recent Calls</h2>
        <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-400">
          {callLogs.length} Logs
        </div>
      </div>

      {callLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-20">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <p className="mt-4 font-bold uppercase tracking-widest text-sm">No call history</p>
        </div>
      ) : (
        <div className="space-y-2">
          {callLogs.map((log) => {
            const isOutgoing = log.from === currentUser;
            const partner = isOutgoing ? log.to : log.from;
            
            return (
              <div 
                key={log._id} 
                className="group relative flex items-center justify-between p-4 rounded-3xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-800/50 hover:border-white/10 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                    log.status === 'missed' ? 'bg-red-500/10 text-red-500' : 
                    log.status === 'rejected' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-indigo-500/10 text-indigo-500'
                  }`}>
                    {partner[0]?.toUpperCase()}
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-white uppercase tracking-tight">{partner}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={log.status === 'missed' ? 'text-red-500' : 'text-zinc-500'}>
                        {isOutgoing ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m22 22-5-5"/><path d="M9 22H3a2 2 0 0 1-2-2v-6"/><path d="M21 15V9a2 2 0 0 0-2-2H5"/><path d="M21 9V3a2 2 0 0 0-2-2h-6"/></svg>
                        )}
                      </span>
                      <p className={`text-xs font-medium ${
                        log.status === 'missed' ? 'text-red-500/70' : 
                        log.status === 'rejected' ? 'text-orange-500/70' :
                        'text-zinc-500'
                      }`}>
                        {log.status} {log.duration > 0 && `• ${formatDuration(log.duration)}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-medium text-white/50">{formatDate(log.createdAt)}</p>
                  <p className="text-xs font-normal text-white/30">{formatTime(log.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
