// آنالیز هفتگی به تفکیک بخش (زیردامنه‌ی routine / workout / trade). خالص و بدون import سروری:
// هم سازنده‌ی زنده (live.ts)، هم روت‌های API، هم خواننده‌ی کلاینت از همین فایل می‌خونن.
// section = null (دامنه‌ی اصلی) یعنی بدون هیچ محدودیتی، دقیقا مثل قبل.
import type { SectionKey } from "@/lib/sections";
import type { AchievementCategory } from "@/lib/achievements";
import type { AiCoach, AnalysisDomain, WeeklyGoalDto } from "@/lib/weeklyAnalysis/types";

/** دامنه‌های آنالیز که در هر بخش نمایش داده و محاسبه می‌شن */
export const SECTION_ANALYSIS_DOMAINS: Record<SectionKey, readonly AnalysisDomain[]> = {
  routine: ["routine", "sleep", "tasks", "learning"],
  workout: ["fitness", "nutrition", "sleep"],
  trade: ["trading"],
};

/** دسته‌های اچیومنت دائمی که توی هفته‌نامه‌ی هر بخش میان */
const SECTION_ACHIEVEMENT_CATEGORIES: Record<SectionKey, readonly AchievementCategory[]> = {
  routine: ["streak", "perfect", "ticks", "consistency", "sleep", "special"],
  workout: ["body", "sleep"],
  trade: ["trade"],
};

/** undefined = همه‌ی دامنه‌ها (دامنه‌ی اصلی) */
export function sectionDomains(section: SectionKey | null | undefined): readonly AnalysisDomain[] | undefined {
  return section ? SECTION_ANALYSIS_DOMAINS[section] : undefined;
}

export function sectionHasDomain(section: SectionKey | null | undefined, domain: AnalysisDomain): boolean {
  return !section || SECTION_ANALYSIS_DOMAINS[section].includes(domain);
}

export function sectionAchievementCategory(section: SectionKey | null | undefined, category: AchievementCategory): boolean {
  return !section || SECTION_ACHIEVEMENT_CATEGORIES[section].includes(category);
}

/** استریک روتین فقط مال بخش روتینه (و دامنه‌ی اصلی) */
export function sectionShowsRoutineStreak(section: SectionKey | null | undefined): boolean {
  return !section || section === "routine";
}

/** هدف عمومی (بدون دامنه) همه‌جا می‌مونه؛ هدف یک دامنه فقط توی بخشی که اون دامنه رو داره */
export function goalInSection(goal: Pick<WeeklyGoalDto, "domain">, section: SectionKey | null | undefined): boolean {
  return !goal.domain || sectionHasDomain(section, goal.domain);
}

/** برچسب بخش روی حرف مربی ذخیره‌شده: مربی هر بخش از اعداد همون بخش ساخته می‌شه */
export type ScopedAi = (NonNullable<AiCoach> & { scope?: string }) | null;

/**
 * مربی AI یک ردیف مشترک برای کاربر-هفته‌ست. روی زیردامنه فقط مربی‌ای نشون داده می‌شه که
 * همون بخش ساخته (scope برابر)، و روی دامنه‌ی اصلی فقط مربی بدون scope؛ وگرنه حرف بخش دیگه
 * (مثلا خلاصه‌ی ترید روی روتین) قاطی می‌شد.
 */
export function aiForSection(ai: AiCoach | ScopedAi, section: SectionKey | null | undefined): AiCoach {
  if (!ai) return null;
  const scope = (ai as ScopedAi)?.scope ?? null;
  if ((scope ?? null) !== (section ?? null)) return null;
  if (!scope) return ai;
  const { scope: _scope, ...rest } = ai as NonNullable<ScopedAi>;
  void _scope;
  // پیشنهادی که به دامنه‌ی بیرون از بخش اشاره می‌کنه (مدل ممکنه کلید دیگه‌ای بده) حذف می‌شه
  return { ...rest, recommendations: rest.recommendations.filter((r) => !r.domain || sectionHasDomain(section, r.domain)) };
}

/** مربی تازه‌ساخته برای ذخیره: روی زیردامنه برچسب بخش می‌خوره */
export function aiToStore(ai: NonNullable<AiCoach>, section: SectionKey | null | undefined): NonNullable<ScopedAi> {
  return section ? { ...ai, scope: section } : ai;
}
