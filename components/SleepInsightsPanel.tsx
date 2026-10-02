"use client";

import type { SleepInsights } from "@/lib/sleep";

// [قرارداد — پیاده‌سازی با ایجنت C] تحلیل‌ها و آمار.
export type SleepInsightsPanelProps = {
  insights: SleepInsights;
  target: { wake: string; sleep: string };
};

export function SleepInsightsPanel(_props: SleepInsightsPanelProps) {
  return null;
}
