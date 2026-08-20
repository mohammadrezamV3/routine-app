import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { parseIsoDate, readJsonBody } from "@/lib/validate";

// GET /api/exercise/log?planId=...&date=2026-07-25
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const planId = req.nextUrl.searchParams.get("planId");
  const date = parseIsoDate(req.nextUrl.searchParams.get("date"));
  if (!planId || !date) return NextResponse.json({ error: "planId و تاریخِ معتبر (YYYY-MM-DD) الزامی است" }, { status: 400 });

  const log = await prisma.exerciseLog.findUnique({
    where: { userId_planId_date: { userId, planId, date } },
  });
  return NextResponse.json({ completed: !!log?.completed, completedItems: (log?.completedItems as string[] | null) ?? [] });
}

// POST /api/exercise/log { planId, date, completed, completedItems? }
export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: "planId و تاریخِ معتبر (YYYY-MM-DD) الزامی است" }, { status: 400 });
  }

  // سقفِ تعداد/طول — این ستون Jsonه و بدونِ سقف هر آرایه‌ای عیناً ذخیره می‌شد
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
