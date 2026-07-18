import React, { useEffect, useRef, useState } from "react";

interface LoginViewProps {
  password: string;
  setPassword: (val: string) => void;
  handleLogin: (e?: React.FormEvent, passwordOverride?: string) => void | Promise<void>;
  loginError?: string | null;
  isLoggingIn?: boolean;
}

export function LoginView({
  password,
  setPassword,
  handleLogin,
  loginError = null,
  isLoggingIn = false,
}: LoginViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showError, setShowError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTriedRef = useRef("");

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const tryLogin = (value: string, explicit = false) => {
    const normalized = value.toLowerCase().trim();
    if (normalized.length < 4 || isLoggingIn) return;
    if (!explicit && lastTriedRef.current === normalized) return;
    lastTriedRef.current = normalized;
    setShowError(explicit);
    void handleLogin(undefined, value);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => tryLogin(value), 350);
  };

  return (
    <div className="flex flex-col min-h-[100svh] items-center justify-center bg-zinc-950 font-sans p-6">
      <form
        className="w-full max-w-xs flex flex-col items-center gap-3"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          if (debounceRef.current) clearTimeout(debounceRef.current);
          tryLogin(password, true);
        }}
      >
        {/* Dummy fields discourage browser password managers */}
        <input type="text" name="username" autoComplete="username" className="hidden" tabIndex={-1} aria-hidden="true" />
        <input
          type={showPassword ? "text" : "password"}
          id="access-code"
          name="access-code"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          onPointerDown={(e) => {
            if (document.activeElement === e.currentTarget) {
              setShowPassword((prev) => !prev);
            }
          }}
          onBlur={() => setShowPassword(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (debounceRef.current) clearTimeout(debounceRef.current);
              tryLogin(password, true);
            }
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          className="w-full px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:border-white focus:ring-1 focus:ring-white/20 outline-none transition-all font-mono text-center text-sm"
        />
        {loginError && showError && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">{loginError}</p>
        )}
      </form>
    </div>
  );
}
