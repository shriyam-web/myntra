import React from "react";
import { WishlistItem } from "../types";

interface WishlistTabProps {
  wishlist: WishlistItem[];
  newWish: string;
  setNewWish: (value: string) => void;
  handleCreateWish: () => void;
  editingWish: string | null;
  setEditingWish: (id: string | null) => void;
  editingWishText: string;
  setEditingWishText: (text: string) => void;
  handleUpdateWish: (id: string, text: string) => void;
  handleDeleteWish: (id: string) => void;
}

export const WishlistTab: React.FC<WishlistTabProps> = ({
  wishlist,
  newWish,
  setNewWish,
  handleCreateWish,
  editingWish,
  setEditingWish,
  editingWishText,
  setEditingWishText,
  handleUpdateWish,
  handleDeleteWish,
}) => {
  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h2 className="text-[15px] font-semibold text-white px-1 tracking-tight flex items-center gap-3">
        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
        Wishlist
      </h2>
      <div className="bg-zinc-900 p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border border-zinc-800/50 shadow-2xl space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 blur-[80px] -mr-16 -mt-16 rounded-full"></div>
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <input
            autoComplete="off"
            spellCheck={false}
            value={newWish}
            onChange={(e) => setNewWish(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-sm font-normal text-white outline-none focus:border-zinc-600 placeholder:text-zinc-600 transition-all shadow-inner"
            placeholder="Add something…"
          />
          <button
            onClick={handleCreateWish}
            className="bg-white text-black w-full sm:w-16 h-16 flex items-center justify-center rounded-2xl shadow-xl active:scale-90 transition-all hover:bg-zinc-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3 relative z-10">
          {wishlist.length === 0 ? (
            <p className="text-zinc-500 text-sm font-medium text-center py-8">
              Nothing saved yet
            </p>
          ) : (
            wishlist.map((w) => (
              <div
                key={w._id}
                className="flex items-center gap-5 text-sm text-zinc-200 font-medium bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-colors group"
              >
                <span className="text-zinc-700 group-hover:text-pink-500 transition-colors">♥</span>
                {editingWish === w._id ? (
                  <input
                    value={editingWishText}
                    onChange={(e) => setEditingWishText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateWish(w._id, editingWishText);
                      if (e.key === "Escape") {
                        setEditingWish(null);
                        setEditingWishText("");
                      }
                    }}
                    className="flex-1 bg-zinc-950 border border-zinc-600 rounded-lg px-3 py-1 text-sm font-normal text-white outline-none"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1">{w.content}</span>
                )}
                <div className="flex gap-2">
                  {editingWish === w._id ? (
                    <>
                      <button
                        onClick={() => handleUpdateWish(w._id, editingWishText)}
                        className="text-green-500 hover:text-green-400 text-xs px-2 py-1 rounded"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setEditingWish(null);
                          setEditingWishText("");
                        }}
                        className="text-zinc-500 hover:text-zinc-400 text-xs px-2 py-1 rounded"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingWish(w._id);
                          setEditingWishText(w.content);
                        }}
                        className="text-zinc-500 hover:text-white text-xs px-2 py-1 rounded transition-colors"
                      >
                        ✏
                      </button>
                      <button
                        onClick={() => handleDeleteWish(w._id)}
                        className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded transition-colors"
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
