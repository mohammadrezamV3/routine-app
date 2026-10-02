import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { FA_WEEKDAY } from "@/lib/jalali";
import type { ExerciseLevel } from "@/lib/exercisePlans";
import { splitRuleIssues, validateUserSplit } from "@/lib/exerciseSplit";
import { suggestSplitFix } from "@/lib/aiClient";

// «تنظیمات پیشرفته»ی ساخت برنامه با AI: قبل از ساخت، تقسیم هفتگی‌ای که خود
// کاربر چیده بررسی می‌شه. ایرادها با قواعد ثابت سمت سرور پیدا می‌شن
// (lib/exerciseSplit.ts — جلوبازو و پشت‌بازو جدا، ریکاوری 48 ساعته، تعادل،
// عضله‌ی اصلی جاافتاده) و فقط اگه ایرادی بود، مربی AI یک نسخه‌ی اصلاح‌شده با
// کمترین تغییر پیشنهاد می‌ده. سهمیه‌ی ساخت برنامه مصرف نمی‌شه؛ فقط سقف روزانه.

const VALID_LEVELS: ExerciseLevel[] = ["beginner", "intermediate", "advanced"];
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;

  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body as { level?: unknown; gymDays?: unknown; split?: unknown; goal?: unknown; hasPhysicalLimitation?: unknown };

  const level = VALID_LEVELS.includes(b.level as ExerciseLevel) ? (b.level as ExerciseLevel) : null;
  if (!level) return NextResponse.json({ error: "سطح نامعتبر است" }, { status: 400 });
  if (!Array.isArray(b.gymDays) || !b.gymDays.length || !b.gymDays.every((d) => typeof d === "string" && FA_WEEKDAY.includes(d))) {
    return NextResponse.json({ error: "روزهای باشگاه نامعتبر است" }, { status: 400 });
  }
  const gymDays = [...new Set(b.gymDays as string[])];
  const v = validateUserSplit(b.split, gymDays);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const relaxed = b.hasPhysicalLimitation === true;
  const issues = splitRuleIssues(v.days, { level, relaxed });
  if (!issues.length) return NextResponse.json({ ok: true, issues: [], suggestion: null });

  let suggestion = null;
  if (guard.isSuperAdmin || (await checkRateLimit(`exercise-split-check:${guard.userId}`, 20, 24 * 60 * 60 * 1000))) {
    suggestion = await suggestSplitFix(
      { level, gymDays, goalLabel: typeof b.goal === "string" ? b.goal.slice(0, 200) : "", hasPhysicalLimitation: relaxed },
      v.days, issues, guard.userId,
    );
  }
  return NextResponse.json({ ok: true, issues, suggestion });
}
