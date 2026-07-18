import { redirect } from "next/navigation";
import HomeClient from "./HomeClient";
import { MAINTENANCE_REDIRECT_URL } from "../lib/maintenance";
import { isMaintenanceEnabled } from "../lib/maintenance-server";
import { clearSession } from "../lib/auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  if (await isMaintenanceEnabled()) {
    redirect(MAINTENANCE_REDIRECT_URL);
  }

  // Always require password on load/refresh — never restore a remembered login.
  await clearSession();
  return <HomeClient initialUser={null} />;
}
