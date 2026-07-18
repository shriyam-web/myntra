import dbConnect from "../../../lib/mongodb";
import { User } from "../../../models/schemas";
import { getSession } from "../../../lib/auth/session";
import { setTypingState } from "../../../lib/typing-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// How long a typing signal stays valid without a refresh. The client refreshes
// every 2.5s while typing, so this only expires when they actually stop.
const TYPING_TTL_MS = 5000;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const typing = Boolean(body.typing);
    const user = session.user;

    // Durable shared state — works across Vercel serverless instances.
    await dbConnect();
    await User.updateOne(
      { username: user },
      { $set: { typingUntil: typing ? new Date(Date.now() + TYPING_TTL_MS) : null } }
    );

    // In-memory fast path for single-instance/dev: instant SSE delivery.
    setTypingState(user, typing);

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "bad request" }, { status: 400 });
  }
}
