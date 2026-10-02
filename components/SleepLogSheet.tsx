"use client";

import type { SleepRecord } from "@/lib/sleep";

// [قرارداد — پیاده‌سازی با ایجنت A] پنجره‌ی ثبت/ویرایش یک شب.
export type SleepLogSheetProps = {
  open: boolean;
  /** شب موجود برای ویرایش، یا پیش‌نویس (مثلا از ردیاب زنده)، یا null برای ثبت تازه */
  initial: Partial<SleepRecord> & { date: string } | null;
  /** ساعت‌های هدف روتین (پیش‌فرض فیلدها) */
  target: { wake: string; sleep: string };
  /** اگه true، initial یک شب ذخیره‌شده‌ست و دکمه‌ی حذف نشون داده می‌شه */
  existing: boolean;
  onClose: () => void;
  /** بعد از ذخیره یا حذف موفق */
  onChanged: () => void;
};

export function SleepLogSheet(_props: SleepLogSheetProps) {
  return null;
}
