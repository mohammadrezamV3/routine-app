import type { WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";

/**
 * قرارداد مشترک فصل‌های تعاملی آنالیز هفتگی (هفته‌نامه‌ی زنده).
 * خواننده (WeeklyLetterReader) برای هر هفته یک بار داده رو می‌گیره و همین
 * رو به همه‌ی فصل‌ها می‌ده؛ هیچ فصلی خودش هفته رو دوباره fetch نمی‌کنه.
 */
export type LetterCtx = {
  /** شنبه‌ی هفته، YYYY-MM-DD */
  weekStart: string;
  /** 0 = هفته‌ی جاری، منفی = گذشته (هم‌معنای /api/analysis/weekly) */
  offset: number;
  /** هفته هنوز تموم نشده (پیش‌بینی، فرم هدف هفته‌ی بعد) */
  isCurrent: boolean;
  /** داده‌ی زنده‌ی همون هفته؛ منبع فصل‌های تعاملی (هدف، بازتاب، مربی، پیش‌بینی، نقشه) */
  analysis: WeeklyAnalysis;
  /** شماره‌ی هفته‌نامه اگه این هفته شماره‌ی ثبت‌شده داره */
  issue: number | null;
  /** بعد از نوشتن (هدف، بازتاب، مربی) داده‌ی همین هفته رو تازه کن */
  reload: () => void;
};

export type LetterChapterProps = { letter: WeeklyLetterData; ctx: LetterCtx };
