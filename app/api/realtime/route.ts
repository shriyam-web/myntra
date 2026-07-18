import dbConnect from "../../../lib/mongodb";
import { Message, AppSettings } from "../../../models/schemas";
import { subscribeRealtime, subscribeTyping } from "../../../lib/realtime-hub";
import { APP_SETTINGS_KEY } from "../../../lib/maintenance";
import { getCallFingerprint } from "../../../lib/calls/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getSyncFingerprint(user?: string | null): Promise<{ messages: string; call: string }> {
  await dbConnect();
  const [stats] = await Message.aggregate([
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        maxCreatedAt: { $max: "$createdAt" },
        reactionCount: {
          $sum: { $size: { $ifNull: ["$reactions", []] } },
        },
      },
    },
  ]);
  const recentMessageState = await Message.find({})
    .sort({ createdAt: -1 })
    .limit(40)
    .select("_id reactions pinnedBy savedBy")
    .lean();
  const settings = await AppSettings.findOne({ key: APP_SETTINGS_KEY }).lean();
  const messages = JSON.stringify({
    messages: stats || { count: 0, maxCreatedAt: null, reactionCount: 0 },
    recentState: recentMessageState.map((m) => ({
      id: String(m._id),
      reactions: (m.reactions || []).map((r: { user: string; type: string }) => `${r.user}:${r.type}`),
      pinnedBy: m.pinnedBy || [],
      savedBy: m.savedBy || [],
    })),
    maintenanceMode: Boolean(settings?.maintenanceMode),
    maintenanceEnabledAt: settings?.maintenanceEnabledAt ?? null,
  });

  const call = user ? await getCallFingerprint(user) : "none";
  return { messages, call };
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let closed = false;
  let lastMessageFingerprint = "";
  let lastCallFingerprint = "";
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;
  let unsubscribeTyping: (() => void) | null = null;

  const url = new URL(request.url);
  const user = url.searchParams.get("user");

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: Record<string, unknown> = {}) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          closed = true;
        }
      };

      const checkAndPush = async () => {
        if (closed) return;
        try {
          const fingerprint = await getSyncFingerprint(user);
          if (fingerprint.messages !== lastMessageFingerprint) {
            lastMessageFingerprint = fingerprint.messages;
            send("messages");
          }
          if (fingerprint.call !== lastCallFingerprint) {
            lastCallFingerprint = fingerprint.call;
            send("call", { fingerprint: fingerprint.call });
          }
        } catch {
          send("heartbeat");
        }
      };

      unsubscribe = subscribeRealtime(() => send("messages"));
      unsubscribeTyping = subscribeTyping((payload) => send("typing", payload));

      checkAndPush();
      pollTimer = setInterval(checkAndPush, 2000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        unsubscribe?.();
        unsubscribeTyping?.();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      closed = true;
      if (pollTimer) clearInterval(pollTimer);
      unsubscribe?.();
      unsubscribeTyping?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
