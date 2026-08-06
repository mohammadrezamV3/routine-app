import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { isoLocal } from "@/lib/jalali";

// GET /api/exercise/log/range?planId=...&start=2026-07-01&end=2026-07-31
// برای محاسبه‌ی سمتِ کلاینتِ «تعداد جلسات این هفته»، «میزان پیشرفت هفتگی»
// و استریک — یک درخواست به‌جای N تا (مثلِ getDailyRange در lib/storage.ts).
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const planId = req.nextUrl.searchParams.get("planId");
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!planId || !start || !end) {
    return NextResponse.json({ error: "planId, start and end required" }, { status: 400 });
  }

  const logs = await prisma.exerciseLog.findMany({
    where: { userId, planId, date: { gte: new Date(start), lte: new Date(end) } },
  });

  const byDate: Record<string, { completed: boolean; completedItems: string[] }> = {};
  for (const log of logs) {
    byDate[isoLocal(log.date)] = {
      completed: log.completed,
      completedItems: (log.completedItems as string[] | null) ?? [],
    };
  }

  return NextResponse.json({ logs: byDate });
}
