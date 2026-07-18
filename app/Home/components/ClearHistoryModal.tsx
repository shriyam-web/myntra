import React from "react";

interface ClearHistoryModalProps {
  showClearHistoryModal: boolean;
  setShowClearHistoryModal: (show: boolean) => void;
  includeSavedInDelete: boolean;
  setIncludeSavedInDelete: (include: boolean) => void;
  handleDeleteAllMessages: () => void;
}

export const ClearHistoryModal: React.FC<ClearHistoryModalProps> = ({
  showClearHistoryModal,
  setShowClearHistoryModal,
  includeSavedInDelete,
  setIncludeSavedInDelete,
  handleDeleteAllMessages,
}) => {
  if (!showClearHistoryModal) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500">
      <div className="w-full max-w-sm bg-zinc-950 border-2 border-red-900/50 rounded-[3rem] shadow-2xl p-10 space-y-10 animate-in zoom-in-95 duration-500 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-900 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-900/10 blur-[60px] -mr-16 -mt-16 rounded-full group-hover:bg-red-900/20 transition-all duration-700"></div>

        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-red-950/50 rounded-full flex items-center justify-center mx-auto border-2 border-red-900/50 shadow-2xl shadow-red-900/20 group-hover:scale-110 transition-transform duration-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-pulse"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-[0.2em]">
            Delete All Messages
          </h2>
          <p className="text-xs text-zinc-400 font-medium leading-relaxed">
            This will permanently delete your chat history. Deleted messages cannot be recovered.
          </p>
        </div>

        <div className="space-y-6">
          <label className="flex items-center gap-4 p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-900 hover:border-zinc-700 transition-all active:scale-95 group/check">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                className="peer appearance-none w-6 h-6 bg-zinc-950 border-2 border-zinc-800 rounded-lg checked:bg-red-600 checked:border-red-600 transition-all"
                checked={includeSavedInDelete}
                onChange={(e) => setIncludeSavedInDelete(e.target.checked)}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-white uppercase tracking-widest group-hover/check:text-red-500 transition-colors">
                Also delete saved messages
              </span>
              <span className="text-[10px] font-medium text-zinc-500 leading-relaxed normal-case tracking-normal">
                {includeSavedInDelete
                  ? "Saved and pinned messages will be deleted too"
                  : "Saved and pinned messages will be kept"}
              </span>
            </div>
          </label>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleDeleteAllMessages}
              className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-red-500 hover:scale-[1.02] transition-all active:scale-95 shadow-xl shadow-red-900/20"
            >
              {includeSavedInDelete ? "Delete Everything" : "Delete Messages"}
            </button>
            <p className="text-[9px] text-zinc-600 text-center font-medium -mt-1">
              {includeSavedInDelete
                ? "Deletes all messages, including saved and pinned ones"
                : "Deletes all messages except saved and pinned ones"}
            </p>
            <button
              onClick={() => setShowClearHistoryModal(false)}
              className="w-full py-5 bg-zinc-900 text-zinc-400 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] border border-zinc-800 hover:text-white hover:bg-zinc-800 transition-all active:scale-95"
            >
              Cancel — Keep Messages
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
