import { NextResponse } from "next/server";
import { getAppSetting } from "@/lib/appSettings";
import { DEFAULT_MAINTENANCE, MAINTENANCE_SETTING_KEY, isMaintenanceActive, normalizeMaintenance } from "@/lib/maintenance";

// GET /api/maintenance — عمومی و بدون احراز هویت؛ فقط enabled/message/until.
export async function GET() {
  const state = normalizeMaintenance(await getAppSetting<unknown>(MAINTENANCE_SETTING_KEY, DEFAULT_MAINTENANCE));
  const enabled = isMaintenanceActive(state);
  return NextResponse.json(
    { enabled, message: enabled ? state.message : "", until: enabled ? state.until : null },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=30" } }
  );
}
