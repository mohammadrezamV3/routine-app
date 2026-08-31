"use client";

import { TradePageShell } from "@/components/TradePageShell";
import { EconomicCalendarPanel } from "@/components/EconomicCalendarPanel";

export default function TradeCalendarPage() {
  return (
    <TradePageShell title="تقویم اقتصادی" note="همه‌ی ساعت‌ها به وقت محلی خودت">
      <EconomicCalendarPanel />
    </TradePageShell>
  );
}
