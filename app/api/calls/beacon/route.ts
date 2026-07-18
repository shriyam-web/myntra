import { getSession } from "../../../../lib/auth/session";
import { endCall, heartbeatCall } from "../../../../lib/calls/service";
import type { CallEndReason } from "../../../../lib/calls/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  try {
    const body = await request.json();
    const callId = typeof body.callId === "string" ? body.callId : "";
    if (!callId) return Response.json({ ok: false }, { status: 400 });

    if (body.type === "end") {
      const reason = (body.reason as CallEndReason) || "disconnected";
      await endCall(session.user, callId, reason);
      return Response.json({ ok: true });
    }

    await heartbeatCall(session.user, callId);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("call beacon failed:", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
