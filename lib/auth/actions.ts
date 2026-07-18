"use server";

import { verifyPassword } from "./passwords";
import { clearSession, createSession, getSession } from "./session";

export async function loginAction(password: string): Promise<{ ok: true; user: string } | { ok: false; error: string }> {
  const user = verifyPassword(password);
  if (!user) {
    return { ok: false, error: "Invalid password" };
  }
  await createSession(user);
  return { ok: true, user };
}

export async function logoutAction(): Promise<void> {
  await clearSession();
}

export async function getCurrentUserAction(): Promise<string | null> {
  const session = await getSession();
  return session?.user ?? null;
}
