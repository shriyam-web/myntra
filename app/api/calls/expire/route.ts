import { expireDueCalls } from "../../../../lib/calls/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    // Allow unauthenticated in local/dev when CRON_SECRET unset
    if (process.env.NODE_ENV === "production" && cronSecret) {
      return Response.json({ ok: false }, { status: 401 });
    }
  }

  try {
    const count = await expireDueCalls();
    return Response.json({ ok: true, expired: count });
  } catch (error) {
    console.error("expire calls failed:", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
