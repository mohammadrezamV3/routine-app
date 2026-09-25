import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { readJsonBody } from "@/lib/validate";
import { getMobileUserId } from "@/lib/mobileAuth";
import { checkModuleForUser } from "@/lib/moduleAccess";
import { MAX_FOOD_SCAN_BASE64_LEN, runFoodScan } from "@/lib/foodScan";
import { SYNC_ERROR_MODULE_LOCKED } from "@/lib/mobileApiContract";

export const maxDuration = 60;

// POST /api/mobile/ai/food-scan { imageBase64, mediaType } — نسخه‌ی Bearerِ
// /api/calorie/scan. همون هسته (lib/foodScan.ts): همون اعتبارسنجی، همون سطلِ
// rate limit (وب + گوشی با هم ۱۵ در ساعت)، همون ثبتِ مصرفِ AI. گیتِ CALORIE
// و سوپریوزر از دیتابیس خونده می‌شن.
export async function POST(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const access = await checkModuleForUser(userId, ModuleKey.CALORIE);
  if (!access.ok) return NextResponse.json({ error: SYNC_ERROR_MODULE_LOCKED }, { status: 403 });

  // بدنه با سقف خونده می‌شه (وب req.json() بی‌سقف داشت): عکس + کمی حاشیه
  const parsed = await readJsonBody(req, MAX_FOOD_SCAN_BASE64_LEN + 4096);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const { status, json } = await runFoodScan(userId, access.isSuperAdmin, parsed.body);
  return NextResponse.json(json, { status });
}
