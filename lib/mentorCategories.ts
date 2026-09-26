// رجیستریِ دسته‌های منتوری — تک‌منبعِ حقیقت، هم کلاینت هم سرور (بدون import سروری).
// دسته‌ی جدید = یک ردیفِ جدید همین‌جا؛ دیتابیس فقط رشته‌ی کلید رو نگه می‌داره
// (MentorProfile.categories / MentorCredential.category)، پس مایگریشن لازم نیست.

export const MENTOR_CATEGORIES = ["FITNESS", "NUTRITION"] as const;
export type MentorCategory = (typeof MENTOR_CATEGORIES)[number];

export const MENTOR_CATEGORY_META: Record<MentorCategory, { label: string; certLabel: string }> = {
  FITNESS: { label: "مربی بدنسازی", certLabel: "مدرک مربیگری بدنسازی" },
  NUTRITION: { label: "تغذیه / کالری", certLabel: "مدرک تغذیه" },
};

export function isMentorCategory(v: unknown): v is MentorCategory {
  return typeof v === "string" && (MENTOR_CATEGORIES as readonly string[]).includes(v);
}

export function sanitizeCategories(v: unknown): MentorCategory[] {
  if (!Array.isArray(v)) return [];
  return Array.from(new Set(v.filter(isMentorCategory)));
}

export const VERIFICATION_LABELS = {
  NOT_PROVIDED: "ارسال نشده",
  PENDING: "در انتظار بررسی",
  VERIFIED: "تأییدشده",
  REJECTED: "ردشده",
} as const;
