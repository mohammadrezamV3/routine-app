import { prisma } from "@/lib/prisma";
import { AiFeatureKey } from "@prisma/client";
import { getExercisePlan, guessFallbackGoal, ExerciseLevel } from "@/lib/exercisePlans";
import { generateExercisePlan } from "@/lib/aiClient";
import { checkAndConsumeAiQuota } from "@/lib/aiQuota";
import { FA_WEEKDAY } from "@/lib/jalali";

// هسته‌ی ساختِ برنامه‌ی تمرینی با AI — مشترک بینِ POST /api/exercise/plan (وب)
// و POST /api/mobile/ai/exercise-plan (اپ، Bearer). گیتِ ماژولِ EXERCISE کارِ
// route است؛ این‌جا اعتبارسنجی، سهمیه‌ی ماهانه‌ی AI (checkAndConsumeAiQuota)،
// فراخوانیِ AI (ثبتِ مصرف داخلِ generateExercisePlan)، fallback به قالبِ
// ایستا، و «همیشه فقط یک برنامه‌ی فعال».

const VALID_LEVELS: ExerciseLevel[] = ["beginner", "intermediate", "advanced"];
const MAX_DESCRIPTION_LEN = 500;
const MAX_GOAL_LEN = 200;

export async function createAiExercisePlan(
  userId: string,
  isSuperAdmin: boolean,
  body: unknown
): Promise<{ status: number; json: Record<string, unknown> }> {
  const { level, heightCm, weightKg, goal, trainingMonth, equipment, hasPhysicalLimitation, limitationDetails, gymDays, description, rulesAccepted } = (body ?? {}) as {
    level: ExerciseLevel;
    heightCm?: number;
    weightKg?: number;
    goal: string;
    trainingMonth?: number;
    equipment: string;
    hasPhysicalLimitation: boolean;
    limitationDetails?: string;
    gymDays: string[];
    description?: string;
    rulesAccepted: boolean;
  };

  if (!level || !VALID_LEVELS.includes(level)) {
    return { status: 400, json: { error: "سطح نامعتبر است" } };
  }
  if (!goal || typeof goal !== "string" || !goal.trim() || goal.trim().length > MAX_GOAL_LEN) {
    return { status: 400, json: { error: "هدف تمرین نامعتبر است" } };
  }
  if (!equipment || typeof equipment !== "string" || !equipment.trim() || equipment.trim().length > MAX_DESCRIPTION_LEN) {
    return { status: 400, json: { error: "تجهیزات وارد شده نامعتبر است" } };
  }
  if (trainingMonth !== undefined && (typeof trainingMonth !== "number" || !Number.isInteger(trainingMonth) || trainingMonth < 1 || trainingMonth > 600)) {
    return { status: 400, json: { error: "ماه تمرین وارد شده معتبر نیست" } };
  }
  if (!Array.isArray(gymDays) || gymDays.length === 0 || !gymDays.every((d) => FA_WEEKDAY.includes(d))) {
    return { status: 400, json: { error: "روزهای باشگاه نامعتبر است" } };
  }
  if (heightCm !== undefined && (typeof heightCm !== "number" || heightCm < 50 || heightCm > 260)) {
    return { status: 400, json: { error: "قد وارد شده معتبر نیست" } };
  }
  if (weightKg !== undefined && (typeof weightKg !== "number" || weightKg < 20 || weightKg > 400)) {
    return { status: 400, json: { error: "وزن وارد شده معتبر نیست" } };
  }
  if (description !== undefined && (typeof description !== "string" || description.length > MAX_DESCRIPTION_LEN)) {
    return { status: 400, json: { error: "توضیحات خیلی طولانی است" } };
  }
  if (limitationDetails !== undefined && (typeof limitationDetails !== "string" || limitationDetails.length > MAX_DESCRIPTION_LEN)) {
    return { status: 400, json: { error: "توضیح محدودیت خیلی طولانی است" } };
  }
  if (!rulesAccepted) {
    return { status: 400, json: { error: "قبول‌کردن قوانین الزامی است" } };
  }

  const uniqueDays = [...new Set(gymDays)];
  const cleanGoal = goal.trim();
  const cleanEquipment = equipment.trim();
  const cleanDescription = description?.trim() || null;
  const cleanLimitationDetails = hasPhysicalLimitation ? limitationDetails?.trim() || null : null;

  const quota = await checkAndConsumeAiQuota(userId, isSuperAdmin, AiFeatureKey.EXERCISE_PLAN_GENERATION);
  if (!quota.ok) {
    return { status: 429, json: { error: quota.error } };
  }

  // برنامه‌ی قبلی (اگه بود) برای پیش‌روی منطقی (progressive overload) به AI داده
  // می‌شود — بدون این، مدل هر بار از صفر طراحی می‌کند و «پیشرفت نسبت به ماه قبل»
  // معنی ندارد.
  const previousPlan = await prisma.exercisePlan.findFirst({
    where: { userId, isActive: false, generatedByAi: true },
    orderBy: { createdAt: "desc" },
    select: { planData: true },
  });

  let planData: unknown;
  let generatedByAi = false;
  try {
    const result = await generateExercisePlan({
      level, goalLabel: cleanGoal, gymDays: uniqueDays,
      heightCm: heightCm || null, weightKg: weightKg || null,
      trainingMonth: trainingMonth || null, equipment: cleanEquipment,
      hasPhysicalLimitation: !!hasPhysicalLimitation, limitationDetails: cleanLimitationDetails, description: cleanDescription,
      previousProgram: previousPlan?.planData ?? null,
    }, userId);
    if (!result.feasible) {
      return { status: 200, json: { ok: false, feasible: false, message: result.message } };
    }
    planData = result.days;
    generatedByAi = true;
  } catch (err) {
    // بدون کلید API یا خطای موقت سرویس — به قالب ایستای از‌پیش‌طراحی‌شده برمی‌گردیم،
    // نه اینکه کل onboarding رو خراب کنیم. ولی خطای واقعی رو لاگ می‌کنیم چون
    // قبلا اینجا کاملا بی‌صدا قورت داده می‌شد — روی سرور واقعی هیچ‌جوره
    // نمی‌شد فهمید مشکل env نتنظیم‌شده‌ست یا خطای شبکه یا چیز دیگه.
    // هدف دیگه یکی از چهار گزینه‌ی ثابت نیست (متنِ آزاد است)، پس برای
    // انتخابِ قالبِ ایستا باید حدس زده بشه — guessFallbackGoal.
    console.error("[exercise/plan] AI generation failed, falling back to static template:", err);
    planData = getExercisePlan(guessFallbackGoal(cleanGoal), level, !!hasPhysicalLimitation, uniqueDays);
  }

  // پلن قبلی (اگه بود) غیرفعال می‌شه؛ همیشه فقط یک پلن فعال داریم
  await prisma.exercisePlan.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });

  const plan = await prisma.exercisePlan.create({
    data: {
      userId,
      level,
      heightCm: heightCm || null,
      weightKg: weightKg || null,
      goal: cleanGoal,
      trainingMonth: trainingMonth || null,
      equipment: cleanEquipment,
      hasPhysicalLimitation: !!hasPhysicalLimitation,
      disclaimerAcceptedAt: new Date(),
      gymDays: uniqueDays as any,
      trainingPhase: "none",
      generatedByAi,
      planData: planData as any,
    },
  });

  return { status: 200, json: { ok: true, feasible: true, plan, generatedByAi } };
}
