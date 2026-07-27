import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/tasks/daily?date=2026-07-24
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

  const entry = await prisma.dailyEntry.findUnique({
    where: { userId_date: { userId, date: new Date(date) } },
  });

  return NextResponse.json({
    tasks: entry?.completedItems ?? {},
    wake: entry?.wakeUpAt ?? null,
  });
}

// POST /api/tasks/daily  { date, tasks, wake }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, tasks, wake } = body as { date: string; tasks: Record<string, boolean>; wake: string | null };
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

  const entry = await prisma.dailyEntry.upsert({
    where: { userId_date: { userId, date: new Date(date) } },
    create: {
      userId,
      date: new Date(date),
      completedItems: tasks ?? {},
      wakeUpAt: wake ? new Date(wake) : null,
    },
    update: {
      completedItems: tasks ?? {},
      wakeUpAt: wake ? new Date(wake) : null,
    },
  });

  return NextResponse.json({ ok: true, id: entry.id });
}
