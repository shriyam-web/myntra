import React from "react";
import { TabType, Ticket, WishlistItem, PlanItem, Message, ViewType } from "../types";

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface TabNavigationProps {
  activeTab: TabType;
  setActiveTab: (id: TabType) => void;
  tickets: Ticket[];
  wishlist: WishlistItem[];
  plans: PlanItem[];
  messages: Message[];
  currentUser: ViewType;
}

const TABS: readonly Tab[] = [
  { 
    id: "complaints", 
    label: "Complaints", 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h.01"/><path d="M12 16h.01"/><path d="M12 12h.01"/><path d="M12 8h.01"/><path d="M12 4h.01"/><rect width="20" height="20" x="2" y="2" rx="2"/></svg>
    ) 
  },
  { 
    id: "wishlist", 
    label: "Wishlist", 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
    )
  },
  { 
    id: "plans", 
    label: "Tasks", 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>
    ) 
  },
  { 
    id: "dates", 
    label: "Dates", 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    ) 
  },
  {
    id: "checkin",
    label: "Check-in",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
    )
  },
  { 
    id: "messages", 
    label: "Messages",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    )
  },
  { 
    id: "emergency", 
    label: "S.O.S", 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    )
  },
  { 
    id: "news", 
    label: "Updates", 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8Z"/></svg>
    )
  },
  { 
    id: "media", 
    label: "Media", 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
    )
  },
  { 
    id: "calls", 
    label: "Calls", 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
    )
  },
];

export function TabNavigation({
  activeTab,
  setActiveTab,
  tickets,
  wishlist,
  plans,
  messages,
  currentUser
}: TabNavigationProps) {
  const hasNewContent = (id: string): boolean => {
    switch (id) {
      case "complaints":
        return tickets.some(t => t.createdBy !== currentUser && t.status === "open");
      case "wishlist":
        return wishlist.some(w => w.createdBy !== currentUser);
      case "plans":
        return plans.some(p => p.createdBy !== currentUser);
      case "messages":
        return messages.some(m => m.createdBy !== currentUser);
      default:
        return false;
    }
  };

  return (
    <nav className="max-w-md mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 px-4 pb-3 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900/50">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as TabType)}
          className={`flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
            activeTab === tab.id 
              ? "bg-white text-black shadow-xl shadow-white/10 border-white scale-105" 
              : "bg-zinc-900/50 text-zinc-500 border-zinc-800/50 hover:bg-zinc-800 hover:text-zinc-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span>{tab.icon}</span>
            {tab.label}
            {hasNewContent(tab.id) && (
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </div>
        </button>
      ))}
    </nav>
  );
}
