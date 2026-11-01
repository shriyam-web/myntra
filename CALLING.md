# Calling & Auth Environment

Deploy trigger note: env checklist only — no runtime effect. (redeploy 2026-11-01 APK banner)

## Required
- `SESSION_SECRET` — long random string for signing HttpOnly session cookies
- `ALPHA_PASSWORD` / `DELTA_PASSWORD` — server-side login passwords (defaults: `icai` / `gamma2`)
- `MONGODB_URI` — Atlas replica set (transactions used for call start)
- Metered TURN vars (`METERED_DOMAIN`, `METERED_API_KEY`, or static `TURN_*`)

## Optional (recommended on Vercel)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — publish call wake events across instances
- `CRON_SECRET` — protect `/api/calls/expire` in production

## Ops
- Vercel Cron hits `/api/calls/expire` once daily (Hobby plan limit); expiry also runs on-demand during call activity (see `vercel.json`)
- Without Upstash, call signaling still works via durable MongoDB + SSE fingerprint polling
