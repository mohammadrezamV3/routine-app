import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { clampText } from "@/lib/validate";

// GET /api/calorie/log?date=2026-07-25
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

  const entries = await prisma.foodLogEntry.findMany({
    where: { userId, date: new Date(date) },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ entries });
}

// POST /api/calorie/log  { date, customName, customCalories, grams, mealType }
// customCalories اینجا کالری کل همون مقدار ثبت‌شده است (نه به‌ازای هر ۱۰۰ گرم) —
// محاسبه‌اش سمت کلاینت انجام می‌شه تا از دوباره‌کاری منطق جلوگیری بشه.
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json();
  const { date, customName, customCalories, grams, mealType } = body as {
    date: string; customName: string; customCalories: number; grams: number; mealType?: string;
  };
  if (!date || !customName || !customCalories || !grams) {
    return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
  }
  if (typeof customCalories !== "number" || typeof grams !== "number" || customCalories < 0 || grams <= 0 || grams > 10000) {
    return NextResponse.json({ error: "عدد وارد شده معتبر نیست" }, { status: 400 });
  }
  const ALLOWED_MEALS = ["breakfast", "lunch", "dinner", "snack"];
  if (mealType && !ALLOWED_MEALS.includes(mealType)) {
    return NextResponse.json({ error: "نوع وعده نامعتبر است" }, { status: 400 });
  }

  const entry = await prisma.foodLogEntry.create({
    data: { userId, date: new Date(date), customName: clampText(customName, 80), customCalories, grams, mealType: mealType || null },
  });
  return NextResponse.json({ ok: true, entry });
}

// DELETE /api/calorie/log?id=...
export async function DELETE(req: NextRequest) {
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await prisma.foodLogEntry.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
