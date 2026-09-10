import { NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";

// خواندنِ سبکِ «چه روزهایی برنامه‌ی تمرینی دارم» — برای نمایشِ ردیفِ
// «برنامه تمرینی امروز» توی «روتین من». عمداً از GET /api/exercise/plan
// استفاده نشده: آن روت rate-limit سهمیه‌ی *ساختِ* پلن (که واقعاً AI صدا
// می‌زند) را دارد، و «روتین من» هر بار که صفحه باز می‌شود این را صدا
// می‌زند — اگر همان روت را صدا می‌زدیم، خودِ باز کردنِ صفحه سهمیه‌ی روزانه‌ی
// ساختِ برنامه را می‌خورد. این‌جا فقط یک ردیفِ سبک خوانده می‌شود، بدونِ
// نیاز به سقف.
export async function GET() {
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;

  const plan = await prisma.exercisePlan.findFirst({
    where: { userId: guard.userId, isActive: true },
    orderBy: { startDate: "desc" },
    select: { gymDays: true },
  });

  const gymDays = Array.isArray(plan?.gymDays)
    ? (plan!.gymDays as unknown[]).filter((d): d is string => typeof d === "string")
    : [];
  return NextResponse.json({ gymDays });
}
