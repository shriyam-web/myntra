import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MAINTENANCE_REDIRECT_URL } from "./lib/maintenance";
import { isMaintenanceEnabled } from "./lib/maintenance-server";

function isMaintenanceExempt(pathname: string) {
  if (pathname === "/panic" || pathname.startsWith("/panic/")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/maintenance")) return true;
  if (/\.(png|jpe?g|svg|ico|webp|gif|woff2?)$/i.test(pathname)) return true;
  return false;
}

function maintenanceRedirect() {
  return NextResponse.redirect(MAINTENANCE_REDIRECT_URL, 307);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isMaintenanceExempt(pathname)) {
    const enabled = await isMaintenanceEnabled();
    if (enabled) {
      return maintenanceRedirect();
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
  matcher: [
    "/",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
