import React, { useMemo } from "react";
import { Message, Theme } from "../types";

interface MediaTabProps {
  messages: Message[];
  activeTheme: Theme;
  handleDownloadMedia: (url: string) => void;
  setPreviewMessage: (m: Message | null) => void;
  setPreviewImageIndex: (index: number) => void;
}

export const MediaTab: React.FC<MediaTabProps> = ({
  messages,
  activeTheme,
  handleDownloadMedia,
  setPreviewMessage,
  setPreviewImageIndex,
}) => {
  const mediaItems = useMemo(() => {
    const items: { url: string; type: "image" | "video"; message: Message; originalIndex: number }[] = [];
    
    // Sort messages by date descending (newest first)
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    sortedMessages.forEach((m) => {
      const images = m.imageUrls || (m.imageUrl ? [m.imageUrl] : []);
      const videos = m.videoUrls || (m.videoUrl ? [m.videoUrl] : []);

      images.forEach((url, idx) => {
        items.push({ url, type: "image", message: m, originalIndex: idx });
      });

      videos.forEach((url, idx) => {
        items.push({ 
          url, 
          type: "video", 
          message: m, 
          originalIndex: idx + images.length 
        });
      });
    });

    return items;
  }, [messages]);

  if (mediaItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20 px-6">
        <div className="w-20 h-20 bg-zinc-950 rounded-[2.5rem] flex items-center justify-center border border-zinc-800 mb-8 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={activeTheme.accent}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </div>
        <h3 className="text-white font-black text-xl mb-2 tracking-tight">No Media Found</h3>
        <p className="text-zinc-500 text-sm max-w-[240px] leading-relaxed">
          Photos and videos shared in this chat will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-white tracking-tighter mb-1">Media Gallery</h2>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
          {mediaItems.length} {mediaItems.length === 1 ? 'Item' : 'Items'} shared
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {mediaItems.map((item, i) => (
          <div 
            key={`${item.message._id}-${i}`}
            className="relative aspect-square group cursor-pointer overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-950 shadow-lg hover:border-white/20 transition-all"
            onClick={() => {
              setPreviewMessage(item.message);
              setPreviewImageIndex(item.originalIndex);
            }}
          >
            {item.type === "image" ? (
              <img 
                src={item.url} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                alt="Shared media"
              />
            ) : (
              <div className="w-full h-full relative">
                <video 
                  src={item.url} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                </div>
              </div>
            )}
            
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadMedia(item.url);
                }}
                className="p-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
