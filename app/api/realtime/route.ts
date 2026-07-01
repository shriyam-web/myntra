import dbConnect from "../../../lib/mongodb";
import { Message } from "../../../models/schemas";
import { subscribeRealtime } from "../../../lib/realtime-hub";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getMessagesFingerprint(): Promise<string> {
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
  return JSON.stringify(stats || { count: 0, maxCreatedAt: null, reactionCount: 0 });
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
          const fingerprint = await getMessagesFingerprint();
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
