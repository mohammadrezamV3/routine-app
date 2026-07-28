import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clampText } from "@/lib/validate";

// GET /api/coding/log?from=2026-07-01&to=2026-07-31
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from/to الزامی است" }, { status: 400 });

  const logs = await prisma.codingLog.findMany({
    where: { userId, date: { gte: new Date(from), lte: new Date(to) } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ logs });
}

// POST /api/coding/log  { date, completed, minutesSpent, topic, notes }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, completed, minutesSpent, topic, notes } = body as {
    date: string; completed: boolean; minutesSpent?: number; topic?: string; notes?: string;
  };

  if (!date) return NextResponse.json({ error: "تاریخ الزامی است" }, { status: 400 });
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return NextResponse.json({ error: "تاریخ نامعتبر است" }, { status: 400 });
  }
  if (minutesSpent !== undefined && (typeof minutesSpent !== "number" || minutesSpent < 0 || minutesSpent > 1440)) {
    return NextResponse.json({ error: "زمان صرف‌شده نامعتبر است" }, { status: 400 });
  }

  const log = await prisma.codingLog.upsert({
    where: { userId_date: { userId, date: dateObj } },
    create: {
      userId,
      date: dateObj,
      completed: !!completed,
      minutesSpent: minutesSpent ?? null,
      topic: topic ? clampText(topic, 60) : null,
      notes: notes ? clampText(notes, 500) : null,
    },
    update: {
      completed: !!completed,
      minutesSpent: minutesSpent ?? null,
      topic: topic ? clampText(topic, 60) : null,
      notes: notes ? clampText(notes, 500) : null,
    },
  });

  return NextResponse.json({ ok: true, log });
}
