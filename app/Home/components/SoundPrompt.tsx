import React from "react";

interface SoundPromptProps {
  showSoundPrompt: boolean;
  setShowSoundPrompt: (show: boolean) => void;
  handleToggleSound: () => void;
}

export const SoundPrompt: React.FC<SoundPromptProps> = ({
  showSoundPrompt,
  setShowSoundPrompt,
  handleToggleSound,
}) => {
  if (!showSoundPrompt) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-700">
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-[3rem] shadow-2xl p-10 space-y-12 animate-in zoom-in-95 duration-500 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[60px] -mr-16 -mt-16 rounded-full group-hover:bg-white/10 transition-all duration-700"></div>

        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-800 shadow-2xl group-hover:scale-110 transition-transform duration-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-pulse"
            >
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-[0.3em] mb-2">
              Audio Sync
            </h2>
            <p className="text-xs text-zinc-500 font-bold leading-relaxed uppercase tracking-[0.2em] max-w-[200px] mx-auto">
              Enable auditory feedback for real-time incoming intel.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              handleToggleSound();
              setShowSoundPrompt(false);
            }}
            className="w-full py-6 bg-white text-black rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-zinc-200 hover:scale-[1.02] transition-all active:scale-95 shadow-xl shadow-white/5"
          >
            Enable Audio
          </button>
          <button
            onClick={() => setShowSoundPrompt(false)}
            className="w-full py-6 bg-zinc-900 text-zinc-500 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] border border-zinc-800 hover:text-white hover:bg-zinc-800 transition-all active:scale-95"
          >
            Silent Mode
          </button>
        </div>
      </div>
    </div>
  );
};
