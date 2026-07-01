import dbConnect from "./mongodb";
import { AppSettings } from "../models/schemas";
import { APP_SETTINGS_KEY } from "./maintenance";

export async function isMaintenanceEnabled(): Promise<boolean> {
  try {
    await dbConnect();
    const settings = await AppSettings.findOne({ key: APP_SETTINGS_KEY }).lean();
    return Boolean(settings?.maintenanceMode);
  } catch {
    return false;
  }
}
