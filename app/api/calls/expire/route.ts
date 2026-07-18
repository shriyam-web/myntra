import { expireDueCalls } from "../../../../lib/calls/service";
import {
  processMediaCleanupJobs,
  purgeExpiredDisappearingMessages,
} from "../../../../lib/disappearing-messages";

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
    const [count, purged, mediaJobs] = await Promise.all([
      expireDueCalls(),
      purgeExpiredDisappearingMessages(),
      processMediaCleanupJobs(80),
    ]);
    return Response.json({ ok: true, expired: count, disappearingPurged: purged, mediaJobs });
  } catch (error) {
    console.error("expire calls failed:", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
