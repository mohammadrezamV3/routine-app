import { NextRequest, NextResponse } from "next/server";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { runFoodScan } from "@/lib/foodScan";

// AI ممکنه تا AI_TOTAL_BUDGET_MS طول بکشه — بدون این export، هاستِ
// سرورلس ممکنه زودتر از اون قطعش کنه.
export const maxDuration = 60;

// POST /api/calorie/scan  { imageBase64, mediaType }
// فقط تحلیل می‌کنه و تخمین رو برمی‌گردونه — ثبت واقعی توی لاگ روزانه بعد
// از تأیید/ویرایش کاربر، جداگانه با /api/calorie/log انجام می‌شه (همون
// الگوی «قبل از ذخیره‌ی نهایی، امکان بازبینی» که بقیه‌ی فیچرهای AI اپ دارن).
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  // اعتبارسنجی + سقفِ نرخ + AI در lib/foodScan.ts (مشترک با /api/mobile/ai/food-scan)
  const { status, json } = await runFoodScan(userId, guard.isSuperAdmin, body);
  return NextResponse.json(json, { status });
}
