// GET /api/exercise/schedule — آینه‌ی محلیِ app/api/exercise/schedule/route.ts:
// gymDaysِ پلنِ فعال (جدیدترین startDate) از arion-fitness. گیتِ EXERCISE
// قبل از این هندلر در guards.ts اعمال می‌شه (همون requireModuleِ وب).
// مستقیم روی fitnessDb (نه features/fitness/lib/repo که دیتای پلن‌ها و
// کاتالوگ رو هم می‌کشه) تا چانکِ شروعِ اپ سبک بمونه — همون قاعده‌ی getActivePlan.
import { fitnessDb } from "@m/features/fitness/db";
import { json } from "../respond";

export async function getExerciseSchedule(): Promise<Response> {
  const active = await fitnessDb.plans.filter((p) => p.isActive && !p.deletedAt).sortBy("startDate");
  const plan = active[active.length - 1];
  const gymDays = Array.isArray(plan?.gymDays) ? (plan!.gymDays as unknown[]).filter((d): d is string => typeof d === "string") : [];
  return json({ gymDays });
}
