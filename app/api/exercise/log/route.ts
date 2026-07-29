import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";

// GET /api/exercise/log?planId=...&date=2026-07-25
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

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
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

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
