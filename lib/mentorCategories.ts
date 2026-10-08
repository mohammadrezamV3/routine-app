// رجیستری دسته‌های منتوری — تک‌منبع حقیقت، هم کلاینت هم سرور (بدون import سروری).
// دسته‌ی جدید = یک ردیف جدید همین‌جا؛ دیتابیس فقط رشته‌ی کلید رو نگه می‌داره
// (MentorProfile.categories / MentorCredential.category)، پس مایگریشن لازم نیست.

export const MENTOR_CATEGORIES = ["ROUTINE", "FITNESS", "NUTRITION"] as const;
export type MentorCategory = (typeof MENTOR_CATEGORIES)[number];

export const MENTOR_CATEGORY_META: Record<MentorCategory, { label: string; short: string; certLabel: string }> = {
  ROUTINE: { label: "روتین و برنامه‌ریزی", short: "روتین", certLabel: "مدرک برنامه‌ریزی" },
  FITNESS: { label: "بدنسازی", short: "بدنسازی", certLabel: "مدرک مربیگری بدنسازی" },
  NUTRITION: { label: "تغذیه", short: "تغذیه", certLabel: "مدرک تغذیه" },
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
  NOT_PROVIDED: "ارسال نشده",
  PENDING: "در صف بررسی ادمین‌های آریون",
  VERIFIED: "تاییدشده",
  REJECTED: "رد شده",
} as const;

// برچسب کوتاه برای چیپ‌ها (یک خط، حداکثر دو کلمه)
export const VERIFICATION_SHORT: Record<keyof typeof VERIFICATION_LABELS, string> = {
  NOT_PROVIDED: "ارسال نشده",
  PENDING: "در صف بررسی",
  VERIFIED: "تاییدشده",
  REJECTED: "رد شده",
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
