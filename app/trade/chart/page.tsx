"use client";

import { TradePageShell } from "@/components/TradePageShell";
import { TradeChartView } from "@/components/TradeChartView";

export default function TradeChartPage() {
  return (
    // طبقِ درخواستِ صریح، «چارت» دیگر داخلِ کارتِ چارت نیست — عنوانِ خودِ
    // صفحه است و زیرِ لینکِ «بازگشت به ترید» می‌نشیند.
    <TradePageShell
      title="چارت"
      fullBleed
    >
      <TradeChartView />
    </TradePageShell>
  );
}
