import React, { useState, useEffect } from 'react';
import * as actions from './actions';

interface Metadata {
  title: string;
  description: string;
  image: string;
  url: string;
}

const UrlPreview = ({ url }: { url: string }) => {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        const data = await actions.getUrlMetadata(url);
        if (isMounted && data) {
          setMetadata(data);
        }
      } catch (err) {
        console.error('Error fetching metadata:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMetadata();
    return () => { isMounted = false; };
  }, [url]);

  if (loading) return null;
  if (!metadata || (!metadata.title && !metadata.description)) return null;

  return (
    <div className="mt-2 bg-black/20 rounded-xl overflow-hidden border border-white/10 flex flex-col sm:flex-row max-w-full">
      {metadata.image && (
        <div className="sm:w-32 h-32 flex-shrink-0">
          <img 
            src={metadata.image} 
            alt={metadata.title} 
            className="w-full h-full object-cover" 
          />
        </div>
      )}
      <div className="p-3 flex flex-col justify-center min-w-0">
        {metadata.title && (
          <h4 className="text-sm font-bold text-white truncate mb-1">
            {metadata.title}
          </h4>
        )}
        {metadata.description && (
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {metadata.description}
          </p>
        )}
      </div>
    </div>
  );
};

export const renderMessage = (text: string) => {
  if (text.startsWith('[CALL_LOG]')) {
    const parts = text.split(':');
    const status = parts[1];
    const duration = parseInt(parts[2]) || 0;
    
    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      if (mins === 0) return `${secs}s`;
      return `${mins}m ${secs}s`;
    };

    return (
      <div className="flex items-center gap-3 py-1">
        <div className={`p-2.5 rounded-2xl ${
          status === 'missed' ? 'bg-red-500/20 text-red-400' : 
          status === 'rejected' ? 'bg-zinc-500/20 text-zinc-400' : 
          'bg-green-500/20 text-green-400'
        }`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {status === 'missed' ? (
              <>
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 .94-.94"/>
                <line x1="22" y1="2" x2="2" y2="22"/>
              </>
            ) : (
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            )}
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-black uppercase tracking-widest opacity-90">
            {status === 'completed' ? 'Voice Call' : status === 'missed' ? 'Missed Call' : 'Call Rejected'}
          </span>
          <span className="text-[10px] font-bold opacity-50 tracking-tight">
            {status === 'completed' ? formatDuration(duration) : 'No Answer'}
          </span>
        </div>
      </div>
    );
  }

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  const urls: string[] = [];

  const renderedText = parts.map((part, index) => {
    if (part.match(urlRegex)) {
      urls.push(part);
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="whitespace-pre-wrap break-words">{renderedText}</div>
      {urls.map((url, index) => (
        <UrlPreview key={index} url={url} />
      ))}
    </div>
  );
};
