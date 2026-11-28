import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { parseIsoDate, readJsonBody } from "@/lib/validate";
import { withLiveSync } from "@/lib/realtime";
import { loadDaySessions, writeExerciseSession } from "@/lib/exerciseLogWrite";
import { cleanItems, foldSessions } from "@/lib/exerciseSessions";
import { checkNumber, checkOptionalNumber } from "@/lib/numberLimits";
import { withIdempotency } from "@/lib/idempotency";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";

// GET /api/exercise/log?planId=...&date=2026-07-25
export async function GET(req: NextRequest) {
  { const off = await sessionFeatureBlocked("exercise"); if (off) return off; }
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const planId = req.nextUrl.searchParams.get("planId");
  const date = parseIsoDate(req.nextUrl.searchParams.get("date"));
  if (!planId || !date) return NextResponse.json({ error: tr("planId و تاریخ معتبر (YYYY-MM-DD) الزامی است", "A valid planId and date (YYYY-MM-DD) are required") }, { status: 400 });

  // چند جلسه در روز: فیلدهای روز (completed/completedItems/started) اجتماع جلسه‌هاست
  // و فهرست کامل در sessions میاد (lib/exerciseSessions.ts)
  const sessions = await loadDaySessions(userId, planId, date);
  return NextResponse.json(foldSessions(sessions));
}

// POST /api/exercise/log { planId, date, session?, completed, completedItems?, plannedCount? }
//   یا فقط { planId, date, session?, started: true } — «شروع» یا «ادامه‌ی» همان جلسه.
//   session پیش‌فرض 1؛ جلسه‌ی تازه = شماره‌ی بعد از آخرین جلسه‌ی روز (بازپخش‌پذیر).
//   جلسه‌ی کاملا انجام‌شده دوباره شروع نمی‌شود: 409 با code SESSION_DONE.
async function handlePOST(req: NextRequest) {
  { const off = await sessionFeatureBlocked("exercise"); if (off) return off; }
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { planId, completed, completedItems } = parsed.body as {
    planId: string; completed?: boolean; completedItems?: string[];
  };

  const date = parseIsoDate(parsed.body?.date);
  if (!planId || typeof planId !== "string" || !date) {
    return NextResponse.json({ error: tr("planId و تاریخ معتبر (YYYY-MM-DD) الزامی است", "A valid planId and date (YYYY-MM-DD) are required") }, { status: 400 });
  }

  const sessionNo = checkNumber(parsed.body?.session ?? 1, "exerciseSessionNo");
  if (!sessionNo.ok) return NextResponse.json({ error: sessionNo.error }, { status: 400 });
  const planned = checkOptionalNumber(parsed.body?.plannedCount, "exercisePlannedCount");
  if (!planned.ok) return NextResponse.json({ error: planned.error }, { status: 400 });

  // برنامه باید مال خود کاربر باشه (IDOR)
  const plan = await prisma.exercisePlan.findFirst({ where: { id: planId, userId }, select: { id: true } });
  if (!plan) return NextResponse.json({ error: tr("برنامه پیدا نشد", "Plan not found") }, { status: 404 });

  const startOnly = parsed.body?.started === true && completed === undefined;
  return withIdempotency(req, userId, "exercise/log", async () => {
    const r = await writeExerciseSession(userId, planId, date, {
      session: sessionNo.value,
      started: startOnly ? true : undefined,
      completed: startOnly ? undefined : !!completed,
      completedItems: cleanItems(completedItems),
      plannedCount: planned.value,
    });
    if (!r.ok) {
      const msg = r.check.code === "SESSION_DONE"
        ? tr("این جلسه کامل انجام شده و دوباره شروع نمی‌شود. اگر می‌خواهی بیشتر تمرین کنی جلسه‌ی جدید بساز", "This session is fully completed and cannot be restarted. Start a new session to train more")
        : r.check.code === "SESSION_LIMIT"
        ? tr("به سقف تعداد جلسه‌ی یک روز رسیدی", "You reached the daily session limit")
        : tr("شماره‌ی جلسه معتبر نیست", "Invalid session number");
      return NextResponse.json({ error: msg, code: r.check.code }, { status: r.check.code === "SESSION_DONE" ? 409 : 400 });
    }
    return NextResponse.json({ ok: true, session: r.session });
  });
}

// بعد از هر نوشتن موفق، بقیه‌ی دستگاه‌ها/تب‌های همین کاربر با WebSocket خبردار می‌شن (lib/realtime.ts)
export const POST = withLiveSync(["exercise"], handlePOST);
