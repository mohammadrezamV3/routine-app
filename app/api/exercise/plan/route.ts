import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey, AiFeatureKey } from "@prisma/client";
import { getExercisePlan, guessFallbackGoal, ExerciseLevel } from "@/lib/exercisePlans";
import { generateExercisePlan } from "@/lib/aiClient";
import { checkAndConsumeAiQuota } from "@/lib/aiQuota";
import { FA_WEEKDAY } from "@/lib/jalali";
import { withLiveSync } from "@/lib/realtime";
import { validateUserSplit, type UserSplitDay } from "@/lib/exerciseSplit";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";

const VALID_LEVELS: ExerciseLevel[] = ["beginner", "intermediate", "advanced"];
const MAX_DESCRIPTION_LEN = 500;
const MAX_GOAL_LEN = 200;
// تاریخچه‌ی تمرین برنامه‌های حذف‌شده تا این مدت نگه داشته می‌شه
const HISTORY_KEEP_MONTHS = 12;

// AI ممکنه تا AI_TOTAL_BUDGET_MS طول بکشه — بدون این export، هاست
// سرورلس ممکنه زودتر از اون قطعش کنه.
export const maxDuration = 60;

export async function GET() {
  { const off = await sessionFeatureBlocked("exercise"); if (off) return off; }
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  // ساخت برنامه واقعا AI صدا می‌زند — هزینه‌ی پول دارد و یک اتصال سرور را
  // چند ده ثانیه اشغال می‌کند. گیت ماژول فقط می‌گوید «مشترک است»، نه
  // «نمی‌تواند صد بار پشت‌سرهم بزند». سقف روزانه همان کاری را می‌کند که
  // برای refresh گزارش هفتگی هم کردیم.
  if (!guard.isSuperAdmin && !(await checkRateLimit(`exercise-plan-generate:${guard.userId}`, 10, 24 * 60 * 60 * 1000))) {
    return NextResponse.json({ error: tr("تعداد ساخت برنامه‌ی امروز تمام شده — فردا دوباره امتحان کن", "Today's plan build limit has been reached — try again tomorrow") }, { status: 429 });
  }

  const plan = await prisma.exercisePlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ plan });
}

async function handlePOST(req: NextRequest) {
  { const off = await sessionFeatureBlocked("aiExercisePlan"); if (off) return off; }
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json();
  const { level, heightCm, weightKg, goal, trainingMonth, equipment, hasPhysicalLimitation, limitationDetails, gymDays, description, rulesAccepted, customSplit } = body as {
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
    /** «تنظیمات پیشرفته»: تقسیم هفتگی خود کاربر [{ day, muscles: MuscleKey[] }] */
    customSplit?: unknown;
  };

  if (!level || !VALID_LEVELS.includes(level)) {
    return NextResponse.json({ error: tr("سطح نامعتبر است", "Invalid level") }, { status: 400 });
  }
  if (!goal || typeof goal !== "string" || !goal.trim() || goal.trim().length > MAX_GOAL_LEN) {
    return NextResponse.json({ error: tr("هدف تمرین نامعتبر است", "Invalid training goal") }, { status: 400 });
  }
  if (!equipment || typeof equipment !== "string" || !equipment.trim() || equipment.trim().length > MAX_DESCRIPTION_LEN) {
    return NextResponse.json({ error: tr("تجهیزات وارد شده نامعتبر است", "The equipment entered is not valid") }, { status: 400 });
  }
  if (trainingMonth !== undefined && (typeof trainingMonth !== "number" || !Number.isInteger(trainingMonth) || trainingMonth < 1 || trainingMonth > 600)) {
    return NextResponse.json({ error: tr("ماه تمرین وارد شده معتبر نیست", "The training month entered is not valid") }, { status: 400 });
  }
  if (!Array.isArray(gymDays) || gymDays.length === 0 || !gymDays.every((d) => FA_WEEKDAY.includes(d))) {
    return NextResponse.json({ error: tr("روزهای باشگاه نامعتبر است", "Invalid gym days") }, { status: 400 });
  }
  if (heightCm !== undefined && (typeof heightCm !== "number" || heightCm < 50 || heightCm > 260)) {
    return NextResponse.json({ error: tr("قد وارد شده معتبر نیست", "The height entered is not valid") }, { status: 400 });
  }
  if (weightKg !== undefined && (typeof weightKg !== "number" || weightKg < 20 || weightKg > 400)) {
    return NextResponse.json({ error: tr("وزن وارد شده معتبر نیست", "The weight entered is not valid") }, { status: 400 });
  }
  if (description !== undefined && (typeof description !== "string" || description.length > MAX_DESCRIPTION_LEN)) {
    return NextResponse.json({ error: tr("توضیحات خیلی طولانی است", "The description is too long") }, { status: 400 });
  }
  if (limitationDetails !== undefined && (typeof limitationDetails !== "string" || limitationDetails.length > MAX_DESCRIPTION_LEN)) {
    return NextResponse.json({ error: tr("توضیح محدودیت خیلی طولانی است", "The limitation description is too long") }, { status: 400 });
  }
  if (!rulesAccepted) {
    return NextResponse.json({ error: tr("قبول‌کردن قوانین الزامی است", "Accepting the rules is required") }, { status: 400 });
  }

  const uniqueDays = [...new Set(gymDays)];
  // تقسیم دلخواه کاربر — فقط روزهای باشگاه خودش و عضله‌های شناخته‌شده
  let userSplit: UserSplitDay[] | null = null;
  if (customSplit !== undefined && customSplit !== null) {
    const v = validateUserSplit(customSplit, uniqueDays);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    userSplit = v.days;
  }
  const cleanGoal = goal.trim();
  const cleanEquipment = equipment.trim();
  const cleanDescription = description?.trim() || null;
  const cleanLimitationDetails = hasPhysicalLimitation ? limitationDetails?.trim() || null : null;

  const quota = await checkAndConsumeAiQuota(userId, guard.isSuperAdmin, AiFeatureKey.EXERCISE_PLAN_GENERATION);
  if (!quota.ok) {
    return NextResponse.json({ error: quota.error, code: quota.code }, { status: 429 });
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
      userSplit,
    }, userId);
    if (!result.feasible) {
      return NextResponse.json({ ok: false, feasible: false, message: result.message });
    }
    planData = result.days;
    generatedByAi = true;
  } catch (err) {
    // بدون کلید API یا خطای موقت سرویس — به قالب ایستای از‌پیش‌طراحی‌شده برمی‌گردیم،
    // نه اینکه کل onboarding رو خراب کنیم. ولی خطای واقعی رو لاگ می‌کنیم چون
    // قبلا اینجا کاملا بی‌صدا قورت داده می‌شد — روی سرور واقعی هیچ‌جوره
    // نمی‌شد فهمید مشکل env نتنظیم‌شده‌ست یا خطای شبکه یا چیز دیگه.
    // هدف دیگه یکی از چهار گزینه‌ی ثابت نیست (متن آزاد است)، پس برای
    // انتخاب قالب ایستا باید حدس زده بشه — guessFallbackGoal.
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

  return NextResponse.json({ ok: true, feasible: true, plan, generatedByAi });
}

// بعد از هر نوشتن موفق، بقیه‌ی دستگاه‌ها/تب‌های همین کاربر با WebSocket خبردار می‌شن (lib/realtime.ts)
export const POST = withLiveSync(["exercise"], handlePOST);

// حذف برنامه‌ی فعال: غیرفعال می‌شه (نه پاک‌کردن)، تا تاریخچه‌ی تمرین‌ها بمونه — همون کاری که ساخت برنامه‌ی جدید با قبلی می‌کنه
async function handleDELETE() {
  { const off = await sessionFeatureBlocked("exercise"); if (off) return off; }
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;
  // حذف برنامه فقط غیرفعالش می‌کنه؛ تاریخچه‌ی تمرین (لاگ‌ها) می‌مونه و فقط
  // بخشی که بیشتر از 12 ماه از تاریخش گذشته (و مال برنامه‌ی فعال نیست) پاک می‌شه
  await prisma.exercisePlan.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - HISTORY_KEEP_MONTHS);
  await prisma.exerciseLog.deleteMany({
    where: { userId, date: { lt: cutoff }, OR: [{ planId: null }, { plan: { isActive: false } }] },
  });
  await prisma.exercisePlan.deleteMany({
    where: { userId, isActive: false, updatedAt: { lt: cutoff }, logs: { none: {} } },
  });
  return NextResponse.json({ ok: true });
}
export const DELETE = withLiveSync(["exercise"], handleDELETE);
