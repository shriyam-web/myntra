import React from "react";
import * as actions from "../../../lib/actions";
import { Message } from "../types";

interface MessageSearchOverlayProps {
  onClose: () => void;
  onJump: (messageId: string) => void;
}

/** Highlight query matches inside a snippet. */
function HighlightedText({ text, query }: { text: string; query: string }) {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="bg-amber-400/30 text-amber-200 rounded px-0.5">
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

export const MessageSearchOverlay: React.FC<MessageSearchOverlayProps> = ({ onClose, onJump }) => {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Message[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasSearched, setHasSearched] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = React.useRef("");

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    const trimmed = query.trim();
    latestQueryRef.current = trimmed;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      setError(null);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await actions.searchMessages(trimmed);
        // Ignore stale responses from earlier keystrokes.
        if (latestQueryRef.current !== trimmed) return;
        setResults(found as Message[]);
        setError(null);
      } catch {
        if (latestQueryRef.current !== trimmed) return;
        setError("Search failed. Check your connection and try again.");
      } finally {
        if (latestQueryRef.current === trimmed) {
          setIsSearching(false);
          setHasSearched(true);
        }
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const trimmedQuery = query.trim();

  return (
    <div className="fixed inset-0 z-[230] bg-zinc-950/97 backdrop-blur-xl flex flex-col animate-in fade-in duration-150">
      <div className="px-4 py-3 border-b border-zinc-800/70 bg-zinc-900/80">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2.5 -ml-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
            aria-label="Close search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          </button>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages…"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-zinc-800/70 border border-zinc-700/60 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-zinc-500 hover:text-white transition-colors"
                aria-label="Clear"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-md mx-auto px-4 py-3">
          {trimmedQuery.length < 2 ? (
            <p className="text-center text-zinc-500 text-xs py-14">
              Type at least 2 letters to search your messages.
            </p>
          ) : isSearching && results.length === 0 ? (
            <div className="flex justify-center py-14">
              <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-center text-red-400 text-xs py-14">{error}</p>
          ) : hasSearched && results.length === 0 ? (
            <p className="text-center text-zinc-500 text-xs py-14">
              No messages found for &ldquo;{trimmedQuery}&rdquo;.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {results.length > 0 && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-1 pb-1">
                  {results.length === 50 ? "First 50 matches" : `${results.length} ${results.length === 1 ? "match" : "matches"}`}
                </p>
              )}
              {results.map((m) => {
                const avatarSrc = m.createdBy.trim().toLowerCase() === "alpha 1" ? "/female.png" : "/male.png";
                return (
                  <button
                    key={m._id}
                    onClick={() => onJump(m._id)}
                    className="w-full text-left flex items-start gap-3 p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800/60 hover:bg-zinc-800/70 hover:border-zinc-700 active:scale-[0.99] transition-all"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-700/60 shrink-0 mt-0.5">
                      <img src={avatarSrc} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[11px] font-semibold text-zinc-300 truncate">{m.createdBy}</p>
                        <p className="text-[10px] text-zinc-500 shrink-0">
                          {new Date(m.createdAt).toLocaleDateString([], { day: "numeric", month: "short" })}
                          {" · "}
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-0.5 line-clamp-3 break-words">
                        <HighlightedText text={m.text || ""} query={trimmedQuery} />
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
