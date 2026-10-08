// «هفته‌نامه» — قرارداد snapshot هر شماره. هر شنبه برای هفته‌ی تموم‌شده
// یک بار ساخته و در WeeklyLetter.data ذخیره می‌شه و دیگه تغییر نمی‌کنه
// (برخلاف خود آنالیز که همیشه زنده محاسبه می‌شه). این فایل import سروری
// نداره تا در باندل کلاینت هم امن باشه. تغییر شکل = بالا بردن v و سازگاری
// خواندن نسخه‌ی قبلی در UI.
import type {
  AiCoach, AnalysisDomain, DayCell, DomainResult, Grade, Insight, ReflectionDto,
  TrendPoint, WeekArchetype, WeekNumber, WeeklyAnalysis, WeeklyGoalDto,
} from "@/lib/weeklyAnalysis/types";

export const WEEKLY_LETTER_VERSION = 1 as const;

export type LetterDomain = DomainResult & {
  note: string; // یک جمله‌ی تحلیلی مخصوص همین دامنه با عدد واقعی
  bestDay: string | null; // weekday فارسی، مثلا «سه‌شنبه»
  worstDay: string | null;
};

export type LetterAchievement = {
  key: string;
  title: string;
  description: string;
  emoji: string;
  source: "weekly" | "global"; // weekly = نشان همین هفته، global = اچیومنت دائمی که این هفته باز شد
};

export type WeeklyLetterData = {
  v: typeof WEEKLY_LETTER_VERSION;
  issueNo: number; // شماره‌ی هفته‌نامه برای همین کاربر: 1، 2، ...
  weekStart: string; // YYYY-MM-DD (شنبه)
  weekEnd: string; // YYYY-MM-DD (جمعه)
  weekLabel: string; // «5 تا 11 مهر»
  generatedAt: string; // ISO
  greetingName: string | null; // اسم کوچک برای «سلام …»، هیچ‌وقت ایمیل/شماره نه

  headline: string; // تیتر اصلی
  intro: string; // پاراگراف آغازین 2 تا 3 جمله‌ای، قطعی
  archetype: WeekArchetype | null;

  overall: {
    score: number | null;
    prevScore: number | null;
    delta: number | null;
    grade: Grade | null;
    consistency: number | null;
    activeDays: number;
    rank: { position: number; of: number } | null; // جایگاه بین هفته‌های اخیر دارای امتیاز (1 = بهترین)
  };

  days: DayCell[]; // ۷تایی با details کامل
  domains: LetterDomain[];
  numbers: WeekNumber[];
  trend: TrendPoint[]; // ۸ هفته، آخری = همین هفته
  insights: Insight[];
  wins: string[]; // حداکثر 3 جمله
  improve: string[]; // حداکثر 3 جمله
  achievements: LetterAchievement[];
  streak: { days: number } | null; // استریک روتین در پایان هفته (lib/routineStreak.ts)
  goals: WeeklyGoalDto[]; // اهداف همین هفته با وضعیت نهایی
  reflection: ReflectionDto;
  ai: AiCoach;
  nextWeek: {
    focusDomain: AnalysisDomain | null;
    focusTitle: string; // «تمرکز هفته‌ی بعد: خواب»
    focusText: string; // یک-دو جمله‌ی عملی
    suggestedTarget: number | null; // امتیاز هدف پیشنهادی برای همون دامنه
  };
};

/**
 * خروجی زنده‌ی یک هفته برای خواننده (GET /api/analysis/letters/live و SSR صفحه):
 * همون قالب هفته‌نامه، ولی از داده‌ی زنده‌ی همین لحظه ساخته می‌شه نه snapshot.
 */
export type LiveWeekPayload = {
  letter: WeeklyLetterData;
  analysis: WeeklyAnalysis;
  /** شماره‌ی ثبت‌شده‌ی همین هفته؛ null = شماره‌ای ساخته نشده (مثلا هفته‌ی جاری) */
  issue: number | null;
  /** هفته‌ی قدیمی‌تر / جدیدتر (شنبه) یا null در لبه‌ی بازه */
  prev: string | null;
  next: string | null;
  weekStart: string;
  offset: number;
  isCurrent: boolean;
};
