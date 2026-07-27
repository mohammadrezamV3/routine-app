import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/exercise/log?planId=...&date=2026-07-25
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const planId = req.nextUrl.searchParams.get("planId");
  const date = req.nextUrl.searchParams.get("date");
  if (!planId || !date) return NextResponse.json({ error: "planId and date required" }, { status: 400 });

  const log = await prisma.exerciseLog.findUnique({
    where: { userId_planId_date: { userId, planId, date: new Date(date) } },
  });
  return NextResponse.json({ completed: !!log?.completed });
}

// POST /api/exercise/log { planId, date, completed }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { planId, date, completed } = body as { planId: string; date: string; completed: boolean };
  if (!planId || !date) return NextResponse.json({ error: "planId and date required" }, { status: 400 });

  await prisma.exerciseLog.upsert({
    where: { userId_planId_date: { userId, planId, date: new Date(date) } },
    create: { userId, planId, date: new Date(date), completed },
    update: { completed },
  });

  return NextResponse.json({ ok: true });
}
