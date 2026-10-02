"use client";

import type { SleepInsights, SleepRecord } from "@/lib/sleep";

// [قرارداد — پیاده‌سازی با ایجنت A] فهرست شب‌های ثبت‌شده با امتیاز.
export type SleepHistoryListProps = {
  /** مرتب‌شده بر اساس تاریخ (قدیمی → جدید) */
  entries: SleepRecord[];
  insights: SleepInsights;
  onEdit: (rec: SleepRecord) => void;
};

export function SleepHistoryList(_props: SleepHistoryListProps) {
  return null;
}
