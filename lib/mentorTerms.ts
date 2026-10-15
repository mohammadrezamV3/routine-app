// «شرایط استفاده از بخش منتورها» — نسخه و قواعد پذیرش.
//
// متن کامل: app/terms/mentors/page.tsx. یادداشت‌های حقوقی و مواردی که وکیل باید
// تایید کند: docs/mentor-terms-notes.md.
//
// قرارداد:
//   - منتور: PUT /api/mentors/me (ساخت یا ویرایش پروفایل) فقط وقتی پذیرفته می‌شود که
//     نسخه‌ی ذخیره‌شده روی MentorProfile همین MENTOR_TERMS_VERSION باشد یا بدنه‌ی
//     درخواست { acceptMentorTerms: MENTOR_TERMS_VERSION } داشته باشد.
//   - شاگرد: POST /api/mentorships (درخواست شاگرد به منتور) با همان قاعده روی
//     User.mentorStudentTermsVersion؛ نسخه‌ی پذیرفته‌شده روی خود رابطه هم snapshot می‌شود.
//   - کلاینت نسخه‌ای را می‌فرستد که متنش را نشان داده؛ اگر با نسخه‌ی جاری سرور یکی
//     نباشد (باندل قدیمی) پذیرش رد می‌شود تا کسی ناخواسته متن دیده‌نشده را نپذیرد.
//
// تغییر ماهوی متن = عوض‌کردن MENTOR_TERMS_VERSION (و MENTOR_TERMS_UPDATED_LABEL).
// با این کار همه‌ی منتورها در ذخیره‌ی بعدی و همه‌ی شاگردها در درخواست بعدی دوباره
// باید بپذیرند. اصلاح املایی/ویرایشی نسخه را عوض نمی‌کند.

import { tr } from "@/lib/i18n";

export const MENTOR_TERMS_VERSION = "2026-09-28";
export const MENTOR_TERMS_UPDATED_LABEL = "مهر 1405";
export const MENTOR_TERMS_PATH = "/terms/mentors";

/** کد ماشینی خطای ۴۰۰ — کلاینت با دیدنش چک‌باکس پذیرش را نشان می‌دهد */
export const MENTOR_TERMS_ERROR_CODE = "MENTOR_TERMS_REQUIRED";

export type MentorTermsRole = "mentor" | "student";

export const MENTOR_TERMS_REQUIRED_MESSAGE: Record<MentorTermsRole, string> = {
  get mentor() { return tr("برای ساخت یا ذخیره‌ی پروفایل مربی‌گری، شرایط استفاده از بخش مربی‌ها را بخوان و بپذیر", "To create or save your mentor profile, read and accept the mentor terms"); },
  get student() { return tr("برای ارسال درخواست شاگردی، شرایط استفاده از بخش مربی‌ها را بخوان و بپذیر", "To send a mentorship request, read and accept the mentor terms"); },
};
// ثابت فارسی: هویت پیام کهنه برای مقایسه (تست و روت)؛ متن زبان جاری از mentorTermsStaleMessage()
export const MENTOR_TERMS_STALE_MESSAGE = "شرایط مربی‌ها به‌روز شده است؛ صفحه را دوباره باز کن و نسخه‌ی جدید را بپذیر";
export function mentorTermsStaleMessage(): string {
  return tr(MENTOR_TERMS_STALE_MESSAGE, "The mentor terms have been updated. Reload the page and accept the new version");
}

/** آیا نسخه‌ی ذخیره‌شده همان نسخه‌ی جاری است */
export function hasCurrentMentorTerms(version: string | null | undefined): boolean {
  return version === MENTOR_TERMS_VERSION;
}

export type MentorTermsDecision =
  | { ok: true; record: boolean } // record: همین درخواست پذیرش را ثبت کند
  | { ok: false; message: string; stale?: boolean };

/**
 * تصمیم سرور درباره‌ی پذیرش. `stored` نسخه‌ی ذخیره‌شده، `sent` مقدار
 * acceptMentorTerms در بدنه. فقط رشته‌ی دقیق نسخه‌ی جاری پذیرش حساب می‌شود
 * (نه true) — سند باید نشان دهد کدام متن پذیرفته شده.
 */
export function decideMentorTerms(role: MentorTermsRole, stored: string | null | undefined, sent: unknown): MentorTermsDecision {
  if (sent === MENTOR_TERMS_VERSION) return { ok: true, record: !hasCurrentMentorTerms(stored) };
  if (hasCurrentMentorTerms(stored)) return { ok: true, record: false };
  if (typeof sent === "string" && sent) return { ok: false, message: mentorTermsStaleMessage(), stale: true };
  return { ok: false, message: MENTOR_TERMS_REQUIRED_MESSAGE[role] };
}
