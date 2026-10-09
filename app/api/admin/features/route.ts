import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { getFeatureFlags, setFeatureFlags } from "@/lib/featureFlagsServer";
import { normalizeFlags } from "@/lib/featureFlags";
import { invalidateAppSettingsCache } from "@/lib/appSettings";
import { tr } from "@/lib/i18n";

let flagsLock: Promise<unknown> = Promise.resolve();

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
  if (!body?.flags || typeof body.flags !== "object") return NextResponse.json({ error: tr("ورودی نامعتبر است", "Invalid input") }, { status: 400 });
  // read-modify-write سریالی: دو PUT هم‌زمان (دو کلید مختلف) هر دو همون
  // «before» رو می‌خوندن و دومی تغییر اولی رو پاک می‌کرد. قفل درون‌پردازه‌ای
  // هم‌راستا با فرض تک-instance بقیه‌ی پروژه (lib/rateLimit.ts)؛ کش هم قبل از
  // خواندن خالی می‌شه تا مقدار تازه‌ی دیتابیس مبنا باشه.
  const run = flagsLock.then(async () => {
    invalidateAppSettingsCache();
    const before = await getFeatureFlags();
    const after = normalizeFlags({ ...before, ...body.flags });
    await setFeatureFlags(after);
    return { before, after };
  });
  flagsLock = run.catch(() => undefined);
  const { before, after } = await run;
  const changed = Object.fromEntries(Object.entries(after).filter(([k, v]) => (before as any)[k] !== v));
  if (Object.keys(changed).length) {
    await writeAuditLog(guard.userId, "setting.feature_flags", "AppSetting", "feature_flags", { changed });
  }
  return NextResponse.json({ ok: true, flags: after });
}
