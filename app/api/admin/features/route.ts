import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { getFeatureFlags, setFeatureFlags } from "@/lib/featureFlagsServer";
import { normalizeFlags } from "@/lib/featureFlags";

export async function GET() {
  const guard = await requireAdmin("settings");
  if (!guard.ok) return guard.response;
  return NextResponse.json({ flags: await getFeatureFlags() });
}

// PUT { flags: { [key]: "on"|"admins"|"off" } }
export async function PUT(req: NextRequest) {
  const guard = await requireAdmin("settings");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => null);
  if (!body?.flags || typeof body.flags !== "object") return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });
  const before = await getFeatureFlags();
  const after = normalizeFlags({ ...before, ...body.flags });
  await setFeatureFlags(after);
  const changed = Object.fromEntries(Object.entries(after).filter(([k, v]) => (before as any)[k] !== v));
  await writeAuditLog(guard.userId, "setting.feature_flags", "AppSetting", "feature_flags", { changed });
  return NextResponse.json({ ok: true, flags: after });
}
