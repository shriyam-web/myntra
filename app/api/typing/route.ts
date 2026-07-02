import { setTypingState } from "../../../lib/typing-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = typeof body.user === "string" ? body.user : "";
    const typing = Boolean(body.typing);

    if (!setTypingState(user, typing)) {
      return Response.json({ ok: false, error: "invalid user" }, { status: 400 });
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "bad request" }, { status: 400 });
  }
}
