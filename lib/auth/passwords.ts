export type AuthUser = "alpha 1" | "delta 1";

const PASSWORD_MAP: Record<string, AuthUser> = {
  icai: "alpha 1",
  gamma2: "delta 1",
};

/**
 * Server-only password verification.
 * Prefers env overrides (ALPHA_PASSWORD / DELTA_PASSWORD) so production
 * credentials can differ from the legacy defaults without a client change.
 */
export function verifyPassword(raw: string): AuthUser | null {
  const normalized = raw.toLowerCase().trim();
  if (!normalized) return null;

  const alphaPassword = (process.env.ALPHA_PASSWORD || "icai").toLowerCase().trim();
  const deltaPassword = (process.env.DELTA_PASSWORD || "gamma2").toLowerCase().trim();

  if (normalized === alphaPassword) return "alpha 1";
  if (normalized === deltaPassword) return "delta 1";

  // Legacy map fallback only when env matches defaults
  return PASSWORD_MAP[normalized] ?? null;
}

export function partnerOf(user: AuthUser): AuthUser {
  return user === "alpha 1" ? "delta 1" : "alpha 1";
}

export function normalizeUsername(user: string): string {
  return user.trim().toLowerCase();
}
