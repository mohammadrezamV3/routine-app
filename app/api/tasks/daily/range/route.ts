import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function pad(n: number) { return n < 10 ? "0" + n : "" + n; }
function toIso(d: Date) { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }

// GET /api/tasks/daily/range?from=2026-07-01&to=2026-07-31
// یک کوئری واحد که کل بازه رو برمی‌گردونه — به‌جای این‌که صفحه اصلی مجبور
// باشه برای هر روز جدا fetch بزنه (که با ۳۰-۹۰ روز، لود اولیه رو خیلی کند می‌کرد).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from/to الزامی است" }, { status: 400 });

  const rows = await prisma.dailyEntry.findMany({
    where: { userId, date: { gte: new Date(from), lte: new Date(to) } },
  });

  const byDate: Record<string, { tasks: any; wake: string | null }> = {};
  rows.forEach((r) => {
    byDate[toIso(r.date)] = {
      tasks: r.completedItems,
      wake: r.wakeUpAt ? r.wakeUpAt.toISOString() : null,
    };
  });

  return NextResponse.json({ entries: byDate });
}
