"use client";

import { TradePageShell } from "@/components/TradePageShell";
import { ForexClockPanel } from "@/components/ForexClockPanel";

export default function TradeClockPage() {
  return (
    <TradePageShell title="ساعت فارکس" note="وضعیت لحظه‌ای جلسه‌های معاملاتی">
      <ForexClockPanel />
    </TradePageShell>
  );
}
