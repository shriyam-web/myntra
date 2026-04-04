import React from "react";

interface LoginViewProps {
  password: string;
  setPassword: (val: string) => void;
  handleLogin: (e?: React.FormEvent) => void;
}

export function LoginView({ password, setPassword, handleLogin }: LoginViewProps) {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-950 font-sans p-6">
      <form onSubmit={handleLogin} className="w-full max-w-xs flex flex-col items-center gap-4">
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="w-full px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:border-white focus:ring-1 focus:ring-white/20 outline-none transition-all font-mono text-center text-sm placeholder:text-zinc-600"
          placeholder="enter your web token here"
          required
          autoFocus
        />
        <button 
          type="submit"
          className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5"
        >
          Access System
        </button>
      </form>
    </div>
  );
}
