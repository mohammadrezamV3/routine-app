import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";

// GET /api/calorie/log/range?from=2026-07-01&to=2026-07-29 — تاریخچه‌ی غذایی
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from/to الزامی است" }, { status: 400 });

  const entries = await prisma.foodLogEntry.findMany({
    where: { userId, date: { gte: new Date(from), lte: new Date(to) } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ entries });
}
