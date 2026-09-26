// GET /api/exercise/schedule — آینه‌ی محلیِ app/api/exercise/schedule/route.ts:
// gymDaysِ پلنِ فعال (جدیدترین startDate) از arion-fitness. گیتِ EXERCISE
// قبل از این هندلر در guards.ts اعمال می‌شه (همون requireModuleِ وب).
// مستقیم روی fitnessDb (نه features/fitness/lib/repo که دیتای پلن‌ها و
// کاتالوگ رو هم می‌کشه) تا چانکِ شروعِ اپ سبک بمونه — همون قاعده‌ی getActivePlan.
// بقیه‌ی هندلرهای بدنسازی (فاز ۲) در exerciseLocal.ts، تنبل (router.ts ← lazyHandler).
import { fitnessDb } from "@m/features/fitness/db";
import type { ExercisePlanRow } from "@m/features/fitness/lib/exerciseTypes";
import { json } from "../respond";

/** برنامه‌ی فعال = جدیدترین startDate بینِ فعال‌های آرشیونشده (همون orderBy ِ وب) */
export async function activePlanRow(): Promise<ExercisePlanRow | undefined> {
  const active = await fitnessDb.plans.filter((p) => p.isActive && !p.deletedAt).sortBy("startDate");
  return active[active.length - 1];
}

export async function getExerciseSchedule(): Promise<Response> {
  const plan = await activePlanRow();
  const gymDays = Array.isArray(plan?.gymDays) ? (plan!.gymDays as unknown[]).filter((d): d is string => typeof d === "string") : [];
  return json({ gymDays });
}
