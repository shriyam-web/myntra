import React, { useState } from "react";

interface LoginViewProps {
  password: string;
  setPassword: (val: string) => void;
  handleLogin: (e?: React.FormEvent, passwordOverride?: string) => void;
}

const VALID_PASSWORDS = new Set(["icai", "gamma2"]);

export function LoginView({ password, setPassword, handleLogin }: LoginViewProps) {
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const normalized = value.toLowerCase().trim();
    if (VALID_PASSWORDS.has(normalized)) {
      handleLogin(undefined, value);
    }
  };

  return (
    <div className="flex flex-col min-h-[100svh] items-center justify-center bg-zinc-950 font-sans p-6">
      <div className="w-full max-w-xs flex flex-col items-center">
        <input
          type={showPassword ? "text" : "password"}
          id="password"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          onPointerDown={(e) => {
            if (document.activeElement === e.currentTarget) {
              setShowPassword((prev) => !prev);
            }
          }}
          onBlur={() => setShowPassword(false)}
          autoComplete="new-password"
          spellCheck={false}
          className="w-full px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:border-white focus:ring-1 focus:ring-white/20 outline-none transition-all font-mono text-center text-sm"
        />
      </div>
    </div>
  );
}
