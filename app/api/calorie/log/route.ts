import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { clampText } from "@/lib/validate";
import { parseIsoDate, readJsonBody } from "@/lib/validate";
import { withLiveSync } from "@/lib/realtime";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";

// GET /api/calorie/log?date=2026-07-25
export async function GET(req: NextRequest) {
  { const off = await sessionFeatureBlocked("calorie"); if (off) return off; }
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const date = parseIsoDate(req.nextUrl.searchParams.get("date"));
  if (!date) return NextResponse.json({ error: tr("تاریخ نامعتبر است (قالب درست: YYYY-MM-DD)", "Invalid date (format: YYYY-MM-DD)") }, { status: 400 });

  const entries = await prisma.foodLogEntry.findMany({
    where: { userId, date },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ entries });
}

// POST /api/calorie/log  { date, customName, customCalories, grams, mealType }
// customCalories اینجا کالری کل همون مقدار ثبت‌شده است (نه به‌ازای هر ۱۰۰ گرم) —
// محاسبه‌اش سمت کلاینت انجام می‌شه تا از دوباره‌کاری منطق جلوگیری بشه.
async function handlePOST(req: NextRequest) {
  { const off = await sessionFeatureBlocked("calorie"); if (off) return off; }
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { customName, customCalories, grams, mealType, proteinG, carbsG, fatG } = parsed.body as {
    customName: string; customCalories: number; grams: number; mealType?: string;
    proteinG?: number; carbsG?: number; fatG?: number;
  };

  const date = parseIsoDate(parsed.body?.date);
  if (!date) return NextResponse.json({ error: tr("تاریخ نامعتبر است (قالب درست: YYYY-MM-DD)", "Invalid date (format: YYYY-MM-DD)") }, { status: 400 });
  if (!customName || typeof customName !== "string" || !customCalories || !grams) {
    return NextResponse.json({ error: tr("اطلاعات ناقص است", "Incomplete information") }, { status: 400 });
  }
  if (typeof customCalories !== "number" || typeof grams !== "number" || customCalories < 0 || grams <= 0 || grams > 10000) {
    return NextResponse.json({ error: tr("عدد وارد شده معتبر نیست", "The number entered is not valid") }, { status: 400 });
  }
  // نوع وعده دیگه enum ثابت نیست — چون تعداد/چیدمان وعده‌ها رو خود کاربر توی
  // هدف کالری‌اش تعیین می‌کنه (۲ تا ۶ وعده، کلیدهایی مثل snack1/snack2)؛
  // فقط طول رشته رو محدود می‌کنیم.
  if (mealType && (typeof mealType !== "string" || mealType.length > 20)) {
    return NextResponse.json({ error: tr("نوع وعده نامعتبر است", "Invalid meal type") }, { status: 400 });
  }
  // درشت‌مغذی‌ها فقط وقتی معتبرن که هر سه با هم بیان و عدد نامنفی باشن —
  // یا هر سه ثبت می‌شن یا هیچ‌کدوم.
  const hasMacros = proteinG !== undefined || carbsG !== undefined || fatG !== undefined;
  const macrosValid = [proteinG, carbsG, fatG].every((v) => typeof v === "number" && v >= 0 && v <= 2000);
  if (hasMacros && !macrosValid) {
    return NextResponse.json({ error: tr("مقادیر درشت‌مغذی نامعتبره", "Macronutrient values are invalid") }, { status: 400 });
  }

  const entry = await prisma.foodLogEntry.create({
    data: {
      userId, date, customName: clampText(customName, 80), customCalories, grams, mealType: mealType || null,
      ...(hasMacros && macrosValid ? { proteinG, carbsG, fatG } : {}),
    },
  });
  return NextResponse.json({ ok: true, entry });
}

// DELETE /api/calorie/log?id=...
async function handleDELETE(req: NextRequest) {
  { const off = await sessionFeatureBlocked("calorie"); if (off) return off; }
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await prisma.foodLogEntry.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}

// بعد از هر نوشتن موفق، بقیه‌ی دستگاه‌ها/تب‌های همین کاربر با WebSocket خبردار می‌شن (lib/realtime.ts)
export const POST = withLiveSync(["calorie"], handlePOST);
export const DELETE = withLiveSync(["calorie"], handleDELETE);
