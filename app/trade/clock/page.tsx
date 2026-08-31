"use client";

import { TradePageShell } from "@/components/TradePageShell";
import { ForexSessionsTimeline } from "@/components/ForexSessionsTimeline";
import { ForexClockPanel } from "@/components/ForexClockPanel";

export default function TradeClockPage() {
  return (
    <TradePageShell title="ساعت فارکس" note="وضعیت لحظه‌ای جلسه‌های معاملاتی">
      <ForexSessionsTimeline />
      <ForexClockPanel />
    </TradePageShell>
  );
}
