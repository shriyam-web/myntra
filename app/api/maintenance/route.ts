import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import { AppSettings } from "../../../models/schemas";
import { APP_SETTINGS_KEY } from "../../../lib/maintenance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await dbConnect();
    const settings = await AppSettings.findOne({ key: APP_SETTINGS_KEY }).lean();
    return NextResponse.json({
      enabled: Boolean(settings?.maintenanceMode),
      enabledAt: settings?.maintenanceEnabledAt ?? null,
      enabledBy: settings?.maintenanceEnabledBy ?? null,
    });
  } catch {
    return NextResponse.json({ enabled: false, enabledAt: null, enabledBy: null });
  }
}
