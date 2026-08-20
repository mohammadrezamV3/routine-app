import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { parseDateRange } from "@/lib/validate";

// سقفِ سطرِ برگشتی — بدونش یه بازه‌ی پرداده می‌تونست کلِ تاریخچه رو یکجا بکشه
const MAX_ROWS = 2000;

// GET /api/calorie/log/range?from=2026-07-01&to=2026-07-29 — تاریخچه‌ی غذایی
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const range = parseDateRange(req.nextUrl.searchParams.get("from"), req.nextUrl.searchParams.get("to"));
  if ("error" in range) return NextResponse.json({ error: range.error }, { status: 400 });

  const entries = await prisma.foodLogEntry.findMany({
    where: { userId, date: { gte: range.from, lte: range.to } },
    orderBy: { date: "desc" },
    take: MAX_ROWS,
  });
  return NextResponse.json({ entries });
}
