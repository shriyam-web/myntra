import { randomUUID } from "crypto";

type CallWakePayload = {
  type: "call.wake" | "call.ended" | "call.updated";
  callId: string;
  latestSeq?: number;
  state?: string;
};

/**
 * Best-effort realtime wake-up for Vercel multi-instance.
 * Uses Upstash Redis REST pub/sub when configured; otherwise no-ops
 * (clients still recover via durable MongoDB polling).
 */
export async function publishCallWake(
  usernames: string[],
  payload: CallWakePayload
): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;

  const unique = Array.from(new Set(usernames.map((u) => u.trim().toLowerCase()).filter(Boolean)));
  await Promise.all(
    unique.map(async (user) => {
      const channel = `call:${user}`;
      try {
        await fetch(`${url}/publish/${encodeURIComponent(channel)}/${encodeURIComponent(JSON.stringify(payload))}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error("Failed to publish call wake:", error);
      }
    })
  );
}

export async function createRealtimeToken(user: string): Promise<{
  enabled: boolean;
  channel: string;
  url: string | null;
} | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return { enabled: false, channel: `call:${user.trim().toLowerCase()}`, url: null };
  }
  // Clients use server-polled wake via SSE/actions; REST subscribe from browser
  // isn't available without WebSocket. Return channel metadata for future use.
  void token;
  void randomUUID;
  return {
    enabled: true,
    channel: `call:${user.trim().toLowerCase()}`,
    url: null,
  };
}
