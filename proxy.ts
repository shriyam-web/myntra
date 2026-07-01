import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MAINTENANCE_REDIRECT_URL } from "./lib/maintenance";

function isMaintenanceExempt(pathname: string) {
  if (pathname.startsWith("/panic")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/maintenance")) return true;
  if (/\.(png|jpe?g|svg|ico|webp|gif|js|css|woff2?|txt)$/i.test(pathname)) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isMaintenanceExempt(pathname)) {
    try {
      const maintenanceUrl = new URL("/api/maintenance", request.url);
      const res = await fetch(maintenanceUrl.toString(), {
        cache: "no-store",
        headers: { "x-maintenance-probe": "1" },
      });
      if (res.ok) {
        const data = (await res.json()) as { enabled?: boolean };
        if (data.enabled) {
          return NextResponse.redirect(MAINTENANCE_REDIRECT_URL);
        }
      }
    } catch {
      // If the check fails, allow the request through
    }
  }

  const response = NextResponse.next();
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Surrogate-Control", "no-store");
  return response;
}

export const config = {
  matcher: "/:path*",
};
