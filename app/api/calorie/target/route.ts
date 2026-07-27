import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const target = await prisma.calorieTarget.findFirst({
    where: { userId, effectiveTo: null },
    orderBy: { effectiveFrom: "desc" },
  });
  return NextResponse.json({ target });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
