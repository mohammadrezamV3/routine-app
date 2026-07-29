import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/calorie/log/range?from=2026-07-01&to=2026-07-29 — تاریخچه‌ی غذایی
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from/to الزامی است" }, { status: 400 });

  const entries = await prisma.foodLogEntry.findMany({
    where: { userId, date: { gte: new Date(from), lte: new Date(to) } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ entries });
}
