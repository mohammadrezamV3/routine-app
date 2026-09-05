"use client";

import { TradePageShell } from "@/components/TradePageShell";
import { TradeChartView } from "@/components/TradeChartView";

export default function TradeChartPage() {
  return (
    <TradePageShell
      title="چارت"
      note="چارت تریدینگ‌ویو، تقویم اقتصادی و گفت‌وگوی هر نماد در یک صفحه"
      fullBleed
    >
      <TradeChartView />
    </TradePageShell>
  );
}
