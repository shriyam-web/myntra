"use client";

import React from "react";
import { CallLog, ViewType } from "../types";

interface CallLogsTabProps {
  callLogs: CallLog[];
  currentUser: ViewType;
  total?: number;
  hasMore?: boolean;
  isLoading?: boolean;
  onLoadMore?: () => void;
}

export function CallLogsTab({
  callLogs,
  currentUser,
  total = 0,
  hasMore = false,
  isLoading = false,
  onLoadMore,
}: CallLogsTabProps) {
  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const getStatusIcon = (status: string, from: string) => {
    const isOutgoing = from === currentUser;
    
    switch (status) {
      case 'completed':
        return (
          <div className={`p-2 rounded-full ${isOutgoing ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {isOutgoing ? <path d="m5 12 5 5L20 7"/> : <path d="m22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>}
            </svg>
          </div>
        );
      case 'missed':
        return (
          <div className="p-2 rounded-full bg-red-500/10 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 .94-.94"/>
              <line x1="22" y1="2" x2="2" y2="22"/>
            </svg>
          </div>
        );
      case 'rejected':
        return (
          <div className="p-2 rounded-full bg-zinc-500/10 text-zinc-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-sm font-semibold tracking-tight text-white">Call history</h2>
        <span className="text-xs font-medium text-zinc-500">
          {callLogs.length}
          {total > callLogs.length ? ` of ${total}` : ""}
        </span>
      </div>

      {isLoading && callLogs.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-zinc-800 border-t-white rounded-full animate-spin" />
        </div>
      ) : callLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed border-zinc-800 rounded-2xl">
          <p className="text-zinc-500 font-medium text-sm">No call history yet</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {callLogs.map((log) => {
              const isOutgoing = log.from === currentUser;
              const partner = isOutgoing ? log.to : log.from;
              const date = new Date(log.createdAt);
              
              return (
                <div 
                  key={log._id} 
                  className="flex items-center justify-between gap-3 px-3 py-2.5 bg-zinc-900/70 border border-zinc-800 rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getStatusIcon(log.status, log.from)}
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm text-white capitalize truncate">
                        {partner}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-medium ${
                          log.status === 'missed' ? 'text-red-500' : 'text-zinc-500'
                        }`}>
                          {log.status === 'completed' ? (isOutgoing ? 'Outgoing' : 'Incoming') : log.status}
                        </span>
                        {log.duration > 0 && (
                          <>
                            <span className="text-[10px] text-zinc-700">•</span>
                            <span className="text-xs font-medium text-zinc-400">
                              {formatDuration(log.duration)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xs font-medium text-zinc-500">
                      {date.toLocaleDateString([], { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-[11px] text-zinc-600">
                      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoading}
              className="w-full mt-1 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:text-white active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? "Loading…" : `View more (${Math.max(total - callLogs.length, 0)} left)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
