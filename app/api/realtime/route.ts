import dbConnect from "../../../lib/mongodb";
import { Message, AppSettings } from "../../../models/schemas";
import { subscribeRealtime } from "../../../lib/realtime-hub";
import { APP_SETTINGS_KEY } from "../../../lib/maintenance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getSyncFingerprint(): Promise<string> {
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
  return JSON.stringify({
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
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let closed = false;
  let lastFingerprint = "";
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: {}\n\n`));
        } catch {
          closed = true;
        }
      };

      const checkAndPush = async () => {
        if (closed) return;
        try {
          const fingerprint = await getSyncFingerprint();
          if (fingerprint !== lastFingerprint) {
            lastFingerprint = fingerprint;
            send("messages");
          }
        } catch {
          send("heartbeat");
        }
      };

      unsubscribe = subscribeRealtime(() => send("messages"));

      checkAndPush();
      pollTimer = setInterval(checkAndPush, 1500);

      request.signal.addEventListener("abort", () => {
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        unsubscribe?.();
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
