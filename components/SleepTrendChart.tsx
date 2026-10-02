"use client";

import type { SleepInsights, SleepRecord } from "@/lib/sleep";

// [قرارداد — پیاده‌سازی با ایجنت B] نمودار شب‌ها (7/30 شب).
export type SleepTrendChartProps = {
  entries: SleepRecord[];
  insights: SleepInsights;
  target: { wake: string; sleep: string };
  todayIso: string;
  onPick: (dateIso: string) => void;
};

export function SleepTrendChart(_props: SleepTrendChartProps) {
  return null;
}
