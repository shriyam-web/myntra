import { redirect } from "next/navigation";
import HomeClient from "./HomeClient";
import { MAINTENANCE_REDIRECT_URL } from "../lib/maintenance";
import { isMaintenanceEnabled } from "../lib/maintenance-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  if (await isMaintenanceEnabled()) {
    redirect(MAINTENANCE_REDIRECT_URL);
  }

  // Always require password on load/refresh — never restore a remembered login.
  // (Cookies can't be cleared during render; the login action overwrites the
  // session cookie on the next successful login anyway.)
  return <HomeClient initialUser={null} />;
}
