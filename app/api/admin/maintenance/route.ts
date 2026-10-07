import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { getAppSetting, setAppSetting } from "@/lib/appSettings";
import { DEFAULT_MAINTENANCE, MAINTENANCE_SETTING_KEY, normalizeMaintenance, parseMaintenanceInput } from "@/lib/maintenance";

export async function GET() {
  const guard = await requireAdmin("settings");
  if (!guard.ok) return guard.response;
  return NextResponse.json({ maintenance: normalizeMaintenance(await getAppSetting<unknown>(MAINTENANCE_SETTING_KEY, DEFAULT_MAINTENANCE)) });
}

// PUT { enabled, message, until? }
export async function PUT(req: NextRequest) {
  const guard = await requireAdmin("settings");
  if (!guard.ok) return guard.response;
  const parsed = parseMaintenanceInput(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await setAppSetting(MAINTENANCE_SETTING_KEY, parsed.value);
  await writeAuditLog(guard.userId, "setting.maintenance", "AppSetting", MAINTENANCE_SETTING_KEY, {
    enabled: parsed.value.enabled, until: parsed.value.until,
  });
  return NextResponse.json({ ok: true, maintenance: parsed.value });
}
