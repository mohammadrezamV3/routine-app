import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { readJsonBody } from "@/lib/validate";
import { getMobileUserId } from "@/lib/mobileAuth";
import { checkModuleForUser } from "@/lib/moduleAccess";
import { createAiExercisePlan } from "@/lib/exercisePlanGeneration";
import { serializeExercisePlan } from "@/lib/mobileSync";
import { SYNC_ERROR_MODULE_LOCKED } from "@/lib/mobileApiContract";

export const maxDuration = 60;

// POST /api/mobile/ai/exercise-plan — نسخه‌ی Bearerِ POST /api/exercise/plan.
// همون هسته (lib/exercisePlanGeneration.ts): اعتبارسنجی، سهمیه‌ی ماهانه‌ی AI،
// ثبتِ مصرف، fallback به قالبِ ایستا، «فقط یک برنامه‌ی فعال». گیتِ EXERCISE و
// سوپریوزر از دیتابیس. پلن به شکلِ ExercisePlanRecordِ sync برمی‌گرده.
export async function POST(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const access = await checkModuleForUser(userId, ModuleKey.EXERCISE);
  if (!access.ok) return NextResponse.json({ error: SYNC_ERROR_MODULE_LOCKED }, { status: 403 });

  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const { status, json } = await createAiExercisePlan(userId, access.isSuperAdmin, parsed.body);
  if (status === 200 && json.ok === true && json.plan) {
    return NextResponse.json({ ...json, plan: serializeExercisePlan(json.plan as any) });
  }
  return NextResponse.json(json, { status });
}
