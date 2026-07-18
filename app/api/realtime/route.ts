import dbConnect from "../../../lib/mongodb";
import { Message, AppSettings, User } from "../../../models/schemas";
import { subscribeRealtime, subscribeTyping } from "../../../lib/realtime-hub";
import { APP_SETTINGS_KEY } from "../../../lib/maintenance";
import { getCallFingerprint } from "../../../lib/calls/service";
import { getSharedDataFingerprint } from "../../../lib/shared-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getSyncFingerprint(
  user?: string | null
): Promise<{ messages: string; call: string; shared: string }> {
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
  const recentMessageState = await Message.find({
    $or: [
      { disappearing: { $ne: true } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(40)
    .select("_id reactions pinnedBy savedBy pollMeta disappearing viewedAt expiresAt")
    .lean();
  const settings = await AppSettings.findOne({ key: APP_SETTINGS_KEY }).lean();
  const messages = JSON.stringify({
    messages: stats || { count: 0, maxCreatedAt: null, reactionCount: 0 },
    recentState: recentMessageState.map((m) => ({
      id: String(m._id),
      reactions: (m.reactions || []).map((r: { user: string; type: string }) => `${r.user}:${r.type}`),
      pinnedBy: m.pinnedBy || [],
      savedBy: m.savedBy || [],
      disappearing: Boolean(m.disappearing),
      viewedAt: m.viewedAt ?? null,
      expiresAt: m.expiresAt ?? null,
      poll: m.pollMeta
        ? {
            closed: Boolean(m.pollMeta.closed),
            votes: (m.pollMeta.votes || []).map(
              (v: { user: string; optionId: string }) => `${v.user}:${v.optionId}`
            ),
          }
        : null,
    })),
    maintenanceMode: Boolean(settings?.maintenanceMode),
    maintenanceEnabledAt: settings?.maintenanceEnabledAt ?? null,
    disappearingMode: Boolean(settings?.disappearingMode),
    disappearingEnabledAt: settings?.disappearingEnabledAt ?? null,
    disappearingEnabledBy: settings?.disappearingEnabledBy ?? null,
  });

  const call = user ? await getCallFingerprint(user) : "none";
  const shared = await getSharedDataFingerprint();
  return { messages, call, shared };
}

/** Durable cross-instance typing check: partner is typing while typingUntil is in the future. */
async function isPartnerTypingInDb(user: string): Promise<boolean> {
  const partner = user.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1";
  const doc = await User.findOne({ username: partner }).select("typingUntil").lean();
  const until = doc?.typingUntil ? new Date(doc.typingUntil as unknown as string).getTime() : 0;
  return until > Date.now();
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let closed = false;
  let lastMessageFingerprint = "";
  let lastCallFingerprint = "";
  let lastSharedFingerprint = "";
  let lastTypingSent: boolean | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let typingTimer: ReturnType<typeof setInterval> | null = null;
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
          if (fingerprint.shared !== lastSharedFingerprint) {
            lastSharedFingerprint = fingerprint.shared;
            send("shared");
          }
        } catch {
          send("heartbeat");
        }
      };

      const partnerUsername =
        user && user.trim().toLowerCase() === "alpha 1" ? "delta 1" : "alpha 1";

      const sendTypingIfChanged = (typing: boolean) => {
        // Re-send `true` as a keep-alive so the client's stuck-state guard
        // can auto-clear if these refreshes ever stop arriving.
        if (!typing && lastTypingSent === false) return;
        lastTypingSent = typing;
        send("typing", { user: partnerUsername, typing });
      };

      // Cheap dedicated poll so typing works across serverless instances
      // where the in-memory hub can't reach this connection.
      const checkTyping = async () => {
        if (closed || !user) return;
        try {
          sendTypingIfChanged(await isPartnerTypingInDb(user));
        } catch {
          // keep last known state; next poll retries
        }
      };

      unsubscribe = subscribeRealtime(() => send("messages"));
      // In-memory fast path (single instance / dev): near-instant delivery.
      unsubscribeTyping = subscribeTyping((payload) => {
        if (payload.user.trim().toLowerCase() !== partnerUsername) return;
        sendTypingIfChanged(Boolean(payload.typing));
      });

      checkAndPush();
      checkTyping();
      pollTimer = setInterval(checkAndPush, 2000);
      typingTimer = setInterval(checkTyping, 1200);

      request.signal.addEventListener("abort", () => {
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (typingTimer) clearInterval(typingTimer);
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
      if (typingTimer) clearInterval(typingTimer);
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
