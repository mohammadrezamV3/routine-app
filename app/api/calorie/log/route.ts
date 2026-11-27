import { tr } from "@/lib/i18n";
import { withIdempotency } from "@/lib/idempotency";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { createFoodLog, parseFoodLogInput } from "@/lib/foodLogWrite";
import { parseIsoDate, readJsonBody } from "@/lib/validate";
import { withLiveSync } from "@/lib/realtime";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";
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
  const data = parseFoodLogInput(parsed.body);
  if (typeof data === "string") return NextResponse.json({ error: data }, { status: 400 });

  return withIdempotency(req, userId, "calorie.log", async () => {
    const entry = await createFoodLog(userId, data);
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
