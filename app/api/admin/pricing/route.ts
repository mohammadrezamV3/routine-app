import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { DEFAULT_PRICING_CONFIG, validatePricingConfig } from "@/lib/planPricing";
import { getPricingConfig, hasSavedPricing, resetPricingConfig, setPricingConfig } from "@/lib/planPricingServer";

// قیمت پلن‌ها از پنل ادمین (/admin/pricing). همه‌ی خواندن‌ها از دیتابیس
// تازه‌ست (نه کش)، و هر ذخیره/بازگشت با قبل/بعد کامل در AuditLog ثبت می‌شه.
// read-modify-write سریالی (هم‌راستا با فرض تک-instance بقیه‌ی پروژه) تا
// «before» دو ذخیره‌ی هم‌زمان درست ثبت بشه.
let pricingLock: Promise<unknown> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = pricingLock.then(fn);
  pricingLock = run.catch(() => undefined);
  return run;
}

export async function GET() {
  const guard = await requireAdmin("pricing");
  if (!guard.ok) return guard.response;
  const [pricing, saved] = await Promise.all([getPricingConfig({ fresh: true }), hasSavedPricing()]);
  return NextResponse.json({ pricing, defaults: DEFAULT_PRICING_CONFIG, saved });
}

// PUT { pricing: PricingConfig } — کل جدول جایگزین می‌شه
export async function PUT(req: NextRequest) {
  const guard = await requireAdmin("pricing");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => null);
  const v = validatePricingConfig(body?.pricing);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const { before } = await serialize(async () => {
    const before = await getPricingConfig({ fresh: true });
    await setPricingConfig(v.config);
    return { before };
  });
  if (JSON.stringify(before) !== JSON.stringify(v.config)) {
    await writeAuditLog(guard.userId, "setting.plan_pricing", "AppSetting", "plan_pricing", { before, after: v.config });
  }
  return NextResponse.json({ ok: true, pricing: v.config, saved: true });
}

// DELETE → بازگشت به پیش‌فرض کد
export async function DELETE() {
  const guard = await requireAdmin("pricing");
  if (!guard.ok) return guard.response;
  const { before, wasSaved } = await serialize(async () => {
    const [before, wasSaved] = await Promise.all([getPricingConfig({ fresh: true }), hasSavedPricing()]);
    await resetPricingConfig();
    return { before, wasSaved };
  });
  if (wasSaved) {
    await writeAuditLog(guard.userId, "setting.plan_pricing_reset", "AppSetting", "plan_pricing", { before, after: DEFAULT_PRICING_CONFIG });
  }
  return NextResponse.json({ ok: true, pricing: DEFAULT_PRICING_CONFIG, saved: false });
}
