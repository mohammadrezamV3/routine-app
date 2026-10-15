"use client";

import { TradePageShell } from "@/components/TradePageShell";
import { EconomicCalendarPanel } from "@/components/EconomicCalendarPanel";
import { tr } from "@/lib/i18n";

export default function TradeCalendarPage() {
  return (
    <TradePageShell title={tr("تقویم اقتصادی", "Economic calendar")}>
      <EconomicCalendarPanel />
    </TradePageShell>
  );
}
