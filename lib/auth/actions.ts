"use server";

import { verifyPassword } from "./passwords";
import { clearSession, createSession, getSession } from "./session";
import dbConnect from "../mongodb";
import { AppSettings, Message } from "../../models/schemas";
import { APP_SETTINGS_KEY } from "../maintenance";

// More than this many consecutive wrong passwords silently turns on
// maintenance mode (the decoy redirect), as a duress/lockout safeguard.
const MAX_FAILED_ATTEMPTS = 5;

export type LoginResult =
  | { ok: true; user: string }
  | { ok: false; error: string; attempts: number };

export async function loginAction(password: string): Promise<LoginResult> {
  const user = verifyPassword(password);

  if (!user) {
    let attempts = 1;
    try {
      await dbConnect();
      const settings = await AppSettings.findOneAndUpdate(
        { key: APP_SETTINGS_KEY },
        { $inc: { failedLoginAttempts: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      attempts = settings?.failedLoginAttempts ?? 1;

      if (attempts > MAX_FAILED_ATTEMPTS && !settings?.maintenanceMode) {
        await AppSettings.updateOne(
          { key: APP_SETTINGS_KEY },
          {
            maintenanceMode: true,
            maintenanceEnabledAt: new Date(),
            maintenanceEnabledBy: "auto-lock",
          }
        );
        await Message.create({
          text: `[SYSTEM:MAINTENANCE_ON] Maintenance mode turned on automatically after ${attempts} wrong password attempts. The portal is showing the decoy page.`,
          createdBy: "alpha 1",
        });
      }
    } catch (error) {
      console.error("Failed to record login attempt:", error);
    }
    return { ok: false, error: "Invalid password", attempts };
  }

  // Successful login breaks the "continuous" failure streak.
  try {
    await dbConnect();
    await AppSettings.updateOne(
      { key: APP_SETTINGS_KEY },
      { failedLoginAttempts: 0 },
      { upsert: true }
    );
  } catch (error) {
    console.error("Failed to reset login attempts:", error);
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
