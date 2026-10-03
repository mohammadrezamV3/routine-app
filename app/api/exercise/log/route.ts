import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { parseIsoDate, readJsonBody } from "@/lib/validate";
import { withLiveSync } from "@/lib/realtime";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";

// GET /api/exercise/log?planId=...&date=2026-07-25
export async function GET(req: NextRequest) {
  { const off = await sessionFeatureBlocked("exercise"); if (off) return off; }
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const planId = req.nextUrl.searchParams.get("planId");
  const date = parseIsoDate(req.nextUrl.searchParams.get("date"));
  if (!planId || !date) return NextResponse.json({ error: "planId و تاریخ معتبر (YYYY-MM-DD) الزامی است" }, { status: 400 });

  const log = await prisma.exerciseLog.findUnique({
    where: { userId_planId_date: { userId, planId, date } },
  });
  return NextResponse.json({
    completed: !!log?.completed,
    completedItems: (log?.completedItems as string[] | null) ?? [],
    started: !!log?.startedAt,
  });
}

// POST /api/exercise/log { planId, date, completed, completedItems? }
//   یا فقط { planId, date, started: true } — ثبت «شروع تمرین» بدون دست‌زدن به completed
async function handlePOST(req: NextRequest) {
  { const off = await sessionFeatureBlocked("exercise"); if (off) return off; }
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { planId, completed, completedItems } = parsed.body as {
    planId: string; completed: boolean; completedItems?: string[];
  };

  const date = parseIsoDate(parsed.body?.date);
  if (!planId || typeof planId !== "string" || !date) {
    return NextResponse.json({ error: "planId و تاریخ معتبر (YYYY-MM-DD) الزامی است" }, { status: 400 });
  }

  // فقط «شروع تمرین»: اولین لحظه‌ی شروع نگه داشته می‌شه و completed/آیتم‌ها
  // دست نمی‌خورن (دوباره‌شروع‌کردن روزی که تمام شده نباید تمامش رو پاک کنه).
  if (parsed.body?.started === true && completed === undefined) {
    const now = new Date();
    await prisma.exerciseLog.upsert({
      where: { userId_planId_date: { userId, planId, date } },
      create: { userId, planId, date, completed: false, startedAt: now },
      update: {},
    });
    await prisma.exerciseLog.updateMany({ where: { userId, planId, date, startedAt: null }, data: { startedAt: now } });
    return NextResponse.json({ ok: true });
  }

  // سقف تعداد/طول — این ستون Jsonه و بدون سقف هر آرایه‌ای عینا ذخیره می‌شد
  const items = Array.isArray(completedItems)
    ? completedItems.filter((x) => typeof x === "string").slice(0, 500).map((x: string) => x.slice(0, 200))
    : undefined;

  await prisma.exerciseLog.upsert({
    where: { userId_planId_date: { userId, planId, date } },
    create: { userId, planId, date, completed: !!completed, completedItems: items ?? undefined },
    update: { completed: !!completed, ...(items !== undefined ? { completedItems: items } : {}) },
  });

  return NextResponse.json({ ok: true });
}

// بعد از هر نوشتن موفق، بقیه‌ی دستگاه‌ها/تب‌های همین کاربر با WebSocket خبردار می‌شن (lib/realtime.ts)
export const POST = withLiveSync(["exercise"], handlePOST);
