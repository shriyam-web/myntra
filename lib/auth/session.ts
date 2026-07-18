import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { AuthUser } from "./passwords";

const COOKIE_NAME = "gp_session";
// Session lives only for this browser tab/session — never “remember me”.
// Page load also clears the cookie so refresh always requires password again.
const MAX_AGE_SECONDS = 60 * 60 * 12; // hard expiry while the tab stays open

type SessionPayload = {
  user: AuthUser;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  // Dev fallback — set SESSION_SECRET in production.
  return "dev-only-session-secret-change-me";
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
}

function encodeSession(payload: SessionPayload): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as SessionPayload;
    if (payload.user !== "alpha 1" && payload.user !== "delta 1") return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ user: AuthUser } | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const payload = decodeSession(raw);
  if (!payload) return null;
  return { user: payload.user };
}

export async function requireUser(): Promise<AuthUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function createSession(user: AuthUser): Promise<void> {
  const jar = await cookies();
  const token = encodeSession({
    user,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  });
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // No maxAge → browser session cookie (dropped when the browser closes).
    // Refresh still clears via clearSession() on page load.
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
