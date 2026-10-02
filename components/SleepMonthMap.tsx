"use client";

import type { SleepInsights } from "@/lib/sleep";

// [قرارداد — پیاده‌سازی با ایجنت B] تقویم ماهانه‌ی امتیاز خواب.
export type SleepMonthMapProps = {
  insights: SleepInsights;
  todayIso: string;
  onPick: (dateIso: string) => void;
};

export function SleepMonthMap(_props: SleepMonthMapProps) {
  return null;
}
