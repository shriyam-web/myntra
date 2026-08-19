import React, { useState } from "react";

interface LoginViewProps {
  password: string;
  setPassword: (val: string) => void;
  handleLogin: (e?: React.FormEvent, passwordOverride?: string) => void | Promise<void>;
  loginError?: string | null;
  isLoggingIn?: boolean;
  failedAttempts?: number;
}

export function LoginView({
  password,
  setPassword,
  handleLogin,
  loginError = null,
  isLoggingIn = false,
  failedAttempts = 0,
}: LoginViewProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col min-h-[100svh] items-center justify-center bg-zinc-950 font-sans p-6">
      <form
        className="w-full max-w-xs flex flex-col items-center gap-3"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          if (isLoggingIn || !password.trim()) return;
          void handleLogin(e, password);
        }}
      >
        {/* Dummy fields discourage browser password managers */}
        <input type="text" name="username" autoComplete="username" className="hidden" tabIndex={-1} aria-hidden="true" />
        <div className="relative w-full">
          <input
            type={showPassword ? "text" : "password"}
            id="access-code"
            name="access-code"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoggingIn}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            placeholder="enter the mp referrel link"
            className="w-full px-6 py-4 pr-14 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:border-white focus:ring-1 focus:ring-white/20 outline-none transition-all font-mono text-center text-sm disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide" : "Show"}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {loginError && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">{loginError}</p>
        )}
        <button
          type="submit"
          disabled={isLoggingIn || !password.trim()}
          className="w-full py-3.5 rounded-2xl bg-white text-zinc-950 text-sm font-semibold tracking-wide hover:bg-zinc-200 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isLoggingIn ? "Entering…" : "Enter"}
        </button>
        {failedAttempts > 0 && (
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            Attempts: {failedAttempts}
          </p>
        )}
      </form>
    </div>
  );
}
