import { tr } from "@/lib/i18n";

// رجیستری دسته‌های منتوری — تک‌منبع حقیقت، هم کلاینت هم سرور (بدون import سروری).
// دسته‌ی جدید = یک ردیف جدید همین‌جا؛ دیتابیس فقط رشته‌ی کلید رو نگه می‌داره
// (MentorProfile.categories / MentorCredential.category)، پس مایگریشن لازم نیست.

export const MENTOR_CATEGORIES = ["ROUTINE", "FITNESS", "NUTRITION"] as const;
export type MentorCategory = (typeof MENTOR_CATEGORIES)[number];

// فیلدها getter هستن تا متن موقع خواندن (نه موقع بارگذاری ماژول) به زبان جاری دربیاد
export const MENTOR_CATEGORY_META: Record<MentorCategory, { label: string; short: string; certLabel: string }> = {
  ROUTINE: {
    get label() { return tr("روتین و برنامه‌ریزی", "Routine and planning"); },
    get short() { return tr("روتین", "Routine"); },
    get certLabel() { return tr("مدرک برنامه‌ریزی", "planning certificate"); },
  },
  FITNESS: {
    get label() { return tr("بدنسازی", "Workout"); },
    get short() { return tr("بدنسازی", "Workout"); },
    get certLabel() { return tr("مدرک مربیگری بدنسازی", "workout coaching certificate"); },
  },
  NUTRITION: {
    get label() { return tr("تغذیه", "Nutrition"); },
    get short() { return tr("تغذیه", "Nutrition"); },
    get certLabel() { return tr("مدرک تغذیه", "nutrition certificate"); },
  },
};

export function isMentorCategory(v: unknown): v is MentorCategory {
  return typeof v === "string" && (MENTOR_CATEGORIES as readonly string[]).includes(v);
}

export function sanitizeCategories(v: unknown): MentorCategory[] {
  if (!Array.isArray(v)) return [];
  return Array.from(new Set(v.filter(isMentorCategory)));
}

// برچسب کامل وضعیت احراز (جمله‌ی وضعیت، اطلاعیه، ادمین)
export const VERIFICATION_LABELS = {
  get NOT_PROVIDED() { return tr("ارسال نشده", "Not submitted"); },
  get PENDING() { return tr("در صف بررسی ادمین‌های آریون", "Waiting for review by the Arion team"); },
  get VERIFIED() { return tr("تاییدشده", "Verified"); },
  get REJECTED() { return tr("رد شده", "Rejected"); },
};

// برچسب کوتاه برای چیپ‌ها (یک خط، حداکثر دو کلمه)
export const VERIFICATION_SHORT: Record<keyof typeof VERIFICATION_LABELS, string> = {
  get NOT_PROVIDED() { return tr("ارسال نشده", "Not submitted"); },
  get PENDING() { return tr("در صف بررسی", "In review"); },
  get VERIFIED() { return tr("تاییدشده", "Verified"); },
  get REJECTED() { return tr("رد شده", "Rejected"); },
};

// کدوم نوع برنامه زیر کدوم حوزه ساخته می‌شه — تغذیه هنوز نوع برنامه‌ی خودش رو نداره
// (فقط چت/فیدبک و دیدن کالری‌شمار شاگرد با اجازه‌ی خودش)
export const PROGRAM_TYPE_CATEGORY = { ROUTINE: "ROUTINE", WORKOUT: "FITNESS" } as const;

/** حوزه‌های مؤثر یک رابطه: خالی (رابطه‌ی قدیمی) یعنی همه‌ی حوزه‌های منتور */
export function effectiveCategories(relCategories: string[], mentorCategories: string[]): string[] {
  return relCategories.length ? relCategories : mentorCategories;
}

/** این نوع برنامه توی حوزه‌های این رابطه مجازه؟ (منتور بدون دسته → محدودیتی نیست) */
export function programTypeAllowed(type: keyof typeof PROGRAM_TYPE_CATEGORY, relCategories: string[], mentorCategories: string[]): boolean {
  const eff = effectiveCategories(relCategories, mentorCategories);
  return eff.length === 0 || eff.includes(PROGRAM_TYPE_CATEGORY[type]);
}

export const PROGRAM_TYPE_BLOCKED_MSG = "این نوع برنامه خارج از حوزه‌های همکاری با این شاگرد است";
/** نسخه‌ی زبان جاری PROGRAM_TYPE_BLOCKED_MSG */
export function programTypeBlockedMsg(): string {
  return tr(PROGRAM_TYPE_BLOCKED_MSG, "This program type is outside the areas you work on with this student");
}
