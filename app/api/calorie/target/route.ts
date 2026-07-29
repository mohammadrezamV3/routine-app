import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";

export async function GET() {
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const target = await prisma.calorieTarget.findFirst({
    where: { userId, effectiveTo: null },
    orderBy: { effectiveFrom: "desc" },
  });
  return NextResponse.json({ target });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json();
  const { dailyTargetKcal } = body as { dailyTargetKcal: number };
  if (!dailyTargetKcal || dailyTargetKcal < 800) {
    return NextResponse.json({ error: "عدد هدف روزانه معتبر نیست" }, { status: 400 });
  }

  // هدف قبلی (اگه بود) بسته می‌شه، هدف جدید از امروز شروع می‌شه
  await prisma.calorieTarget.updateMany({
    where: { userId, effectiveTo: null },
    data: { effectiveTo: new Date() },
  });
  const target = await prisma.calorieTarget.create({ data: { userId, dailyTargetKcal } });

  return NextResponse.json({ ok: true, target });
}
