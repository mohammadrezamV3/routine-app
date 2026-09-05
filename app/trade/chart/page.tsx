"use client";

import { TradePageShell } from "@/components/TradePageShell";
import { TradeChartView } from "@/components/TradeChartView";

export default function TradeChartPage() {
  return (
    <TradePageShell
      title=""
      fullBleed
    >
      <TradeChartView />
    </TradePageShell>
  );
}
