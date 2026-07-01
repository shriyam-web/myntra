import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import { AppSettings } from "../../../models/schemas";
import { APP_SETTINGS_KEY } from "../../../lib/maintenance";
import { isMaintenanceEnabled } from "../../../lib/maintenance-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const enabled = await isMaintenanceEnabled();
    if (!enabled) {
      return NextResponse.json({
        enabled: false,
        enabledAt: null,
        enabledBy: null,
      });
    }

    await dbConnect();
    const settings = await AppSettings.findOne({ key: APP_SETTINGS_KEY }).lean();
    return NextResponse.json({
      enabled: true,
      enabledAt: settings?.maintenanceEnabledAt ?? null,
      enabledBy: settings?.maintenanceEnabledBy ?? null,
    });
  } catch {
    return NextResponse.json({ enabled: false, enabledAt: null, enabledBy: null });
  }
}
