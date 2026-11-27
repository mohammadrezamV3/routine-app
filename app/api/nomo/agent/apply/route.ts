import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { featureBlocked } from "@/lib/featureFlagsServer";
import { checkRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { tr } from "@/lib/i18n";
import { withIdempotency, readRequestId } from "@/lib/idempotency";
import { publishDataChanged, clientTabId } from "@/lib/realtime";
import { resolveToday } from "@/lib/nomoShared";
import { accessibleModules, applyNomoOps } from "@/lib/nomoServer";
import { NOMO_APPLY_BODY_MAX, NOMO_MODULES, normalizeTzOffset, parseOps } from "@/lib/nomoAgent";

// تایید کاربر → اعمال. بدنه از کلاینت می‌آید و *هیچ اعتمادی* به آن نیست: عملیات
// دوباره با همان فهرست سفید/سقف عددها (parseOps) پاک‌سازی می‌شوند و برای هر
// عملیات، ماژول و فلگ بخش دوباره سنجیده می‌شود. ساخت‌ها با هدر
// x-arion-request-id ضدتکرارند (دوبار زدن «تایید»).

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.ROUTINE);
  if (!guard.ok) return guard.response;
  { const off = await featureBlocked("routineAssistant", guard.userId); if (off) return off; }
  const { userId, isSuperAdmin } = guard;

  if (!(await checkRateLimit(`nomo-apply:${userId}`, 30, 10 * 60 * 1000))) {
    return NextResponse.json({ error: tr("خیلی سریع پشت هم تایید کردی. کمی صبر کن.", "You are confirming too quickly. Wait a moment.") }, { status: 429 });
  }
  if (!readRequestId(req)) {
    return NextResponse.json({ error: tr("درخواست نامعتبر است", "Invalid request") }, { status: 400 });
  }

  const parsed = await readJsonBody<{ ops?: unknown; today?: unknown; tz?: unknown }>(req, NOMO_APPLY_BODY_MAX);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const todayIso = resolveToday(parsed.body?.today);
  const tzOffsetMin = normalizeTzOffset(parsed.body?.tz);

  return withIdempotency(req, userId, "nomo.apply", async () => {
    // ماژول مجاز فقط برای حذف زودهنگام؛ تصمیم نهایی هر عملیات در applyNomoOps است
    const allowed = await accessibleModules(userId, isSuperAdmin);
    const { ops, dropped } = parseOps(parsed.body?.ops, { todayIso }, new Set(NOMO_MODULES.filter((m) => allowed.has(m))));
    if (!ops.length) {
      return NextResponse.json({ error: tr("چیزی برای ثبت نبود.", "Nothing to apply."), dropped }, { status: 400 });
    }
    const { results, changedKeys } = await applyNomoOps(userId, ops, { todayIso, tzOffsetMin });
    if (changedKeys.length) void publishDataChanged(userId, changedKeys, clientTabId(req));
    return NextResponse.json({ ok: true, results, dropped, changedKeys });
  });
}
