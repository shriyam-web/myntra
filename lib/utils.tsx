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
