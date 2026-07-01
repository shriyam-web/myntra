"use client";

import React, { useState } from "react";
import * as actions from "../../../lib/actions";

interface EmeButtonProps {
  isMessageExpanded?: boolean;
}

export const EmeButton: React.FC<EmeButtonProps> = ({ isMessageExpanded = false }) => {
  const [isEnabling, setIsEnabling] = useState(false);

  const handleClick = async () => {
    const confirmed = window.confirm(
      "Enable maintenance mode?\n\nVisitors will be redirected to the decoy page until you turn this off at /panic."
    );
    if (!confirmed) return;

    setIsEnabling(true);
    try {
      await actions.enableMaintenanceMode("alpha 1");
      window.location.href = "/panic";
    } catch (error) {
      console.error("Failed to enable maintenance mode:", error);
      alert("Could not enable maintenance mode. Please try again.");
      setIsEnabling(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isEnabling}
      className={`fixed z-[90] left-4 px-3.5 py-2 rounded-full bg-zinc-950/90 border border-rose-500/35 text-rose-300 shadow-2xl backdrop-blur-xl hover:bg-rose-500/15 hover:border-rose-400/50 active:scale-95 transition-all disabled:opacity-60 ${
        isMessageExpanded
          ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"
          : "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-24"
      }`}
      title="Emergency maintenance"
      aria-label="Enable maintenance mode"
    >
      <span className="text-[11px] font-black tracking-[0.2em] uppercase">
        {isEnabling ? "…" : "Eme."}
      </span>
    </button>
  );
};
