import { tr } from "@/lib/i18n";
import { withIdempotency } from "@/lib/idempotency";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { clampText } from "@/lib/validate";
import { parseIsoDate, readJsonBody } from "@/lib/validate";
import { withLiveSync } from "@/lib/realtime";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";
import { checkNumber, hasNumberValue } from "@/lib/numberLimits";
import { sanitizeFoodRow } from "@/lib/foodLogSanitize";

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
  return NextResponse.json({ entries: entries.map(sanitizeFoodRow) });
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
  const { customName, mealType } = parsed.body as { customName: string; mealType?: string };

  const date = parseIsoDate(parsed.body?.date);
  if (!date) return NextResponse.json({ error: tr("تاریخ نامعتبر است (قالب درست: YYYY-MM-DD)", "Invalid date (format: YYYY-MM-DD)") }, { status: 400 });
  if (!customName || typeof customName !== "string" || !hasNumberValue(parsed.body?.customCalories) || !hasNumberValue(parsed.body?.grams)) {
    return NextResponse.json({ error: tr("اطلاعات ناقص است", "Incomplete information") }, { status: 400 });
  }
  // سقف و کف همه‌ی عددها از جدول مشترک (lib/numberLimits.ts)
  const kcal = checkNumber(parsed.body.customCalories, "entryKcal");
  if (!kcal.ok) return NextResponse.json({ error: kcal.error }, { status: 400 });
  const gramsCheck = checkNumber(parsed.body.grams, "foodGrams");
  if (!gramsCheck.ok) return NextResponse.json({ error: gramsCheck.error }, { status: 400 });
  const customCalories = kcal.value;
  const grams = gramsCheck.value;
  // نوع وعده دیگه enum ثابت نیست — چون تعداد/چیدمان وعده‌ها رو خود کاربر توی
  // هدف کالری‌اش تعیین می‌کنه (۲ تا ۶ وعده، کلیدهایی مثل snack1/snack2)؛
  // فقط طول رشته رو محدود می‌کنیم.
  if (mealType && (typeof mealType !== "string" || mealType.length > 20)) {
    return NextResponse.json({ error: tr("نوع وعده نامعتبر است", "Invalid meal type") }, { status: 400 });
  }
  // درشت‌مغذی‌ها: یا هر سه با هم میان یا هیچ‌کدوم؛ هر کدوم عدد نامنفی توی بازه.
  const rawMacros = [parsed.body?.proteinG, parsed.body?.carbsG, parsed.body?.fatG];
  const hasMacros = rawMacros.some((v) => v !== undefined);
  let proteinG: number | undefined, carbsG: number | undefined, fatG: number | undefined;
  if (hasMacros) {
    const checks = rawMacros.map((v) => checkNumber(v, "macroEntryG"));
    const bad = checks.find((c) => !c.ok);
    if (bad && !bad.ok) return NextResponse.json({ error: bad.error }, { status: 400 });
    [proteinG, carbsG, fatG] = checks.map((c) => (c.ok ? c.value : 0));
  }

  return withIdempotency(req, userId, "calorie.log", async () => {
    const entry = await prisma.foodLogEntry.create({
      data: {
        userId, date, customName: clampText(customName, 80), customCalories, grams, mealType: mealType || null,
        ...(hasMacros ? { proteinG, carbsG, fatG } : {}),
      },
    });
    return NextResponse.json({ ok: true, entry });
  });
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
