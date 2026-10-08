import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { clearDemoData, getDemoStatus, seedDemoData, DEMO_DATA_SETTING_KEY } from "@/lib/demoData";

// داده‌ی آزمایشی — فقط Owner. ادمین محدود حتی با دسترسی settings هم نه،
// چون ساخت/حذف کاربر انجام می‌ده و Owner رو وارد داده می‌کنه.
async function requireOwner() {
  const g = await requireAdmin();
  if (!g.ok) return g;
  if (!g.isSuperAdmin) return { ok: false as const, response: NextResponse.json({ error: "این بخش فقط برای Owner است" }, { status: 403 }) };
  return g;
}

// هم‌زمان فقط یک ساخت/حذف (تک-instance؛ هم‌راستا با lib/rateLimit.ts)
let busy = false;

async function exclusive(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  if (busy) return NextResponse.json({ error: "عملیات قبلی هنوز تمام نشده" }, { status: 409 });
  busy = true;
  try {
    return await fn();
  } finally {
    busy = false;
  }
}

export const dynamic = "force-dynamic";

// GET → وضعیت (ساخته شده؟ کی؟ شمارش‌ها)
export async function GET() {
  const g = await requireOwner();
  if (!g.ok) return g.response;
  return NextResponse.json({ status: await getDemoStatus() });
}

// POST → ساخت دوباره‌ی کل داده (اول پاک‌سازی قبلی)
export async function POST() {
  const g = await requireOwner();
  if (!g.ok) return g.response;
  return exclusive(async () => {
    const result = await seedDemoData(g.userId);
    await writeAuditLog(g.userId, "demo.seed", "AppSetting", DEMO_DATA_SETTING_KEY, { counts: result.counts, warnings: result.warnings });
    return NextResponse.json({ ok: true, warnings: result.warnings, status: await getDemoStatus() });
  });
}

// DELETE → حذف همه‌ی داده‌ی آزمایشی
export async function DELETE() {
  const g = await requireOwner();
  if (!g.ok) return g.response;
  return exclusive(async () => {
    const r = await clearDemoData();
    await writeAuditLog(g.userId, "demo.clear", "AppSetting", DEMO_DATA_SETTING_KEY, { deletedUsers: r.deletedUsers });
    return NextResponse.json({ ok: true, status: await getDemoStatus() });
  });
}
