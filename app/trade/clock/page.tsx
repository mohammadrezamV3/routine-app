"use client";

import { TradePageShell } from "@/components/TradePageShell";
import { ForexClockPanel } from "@/components/ForexClockPanel";
import { tr } from "@/lib/i18n";

export default function TradeClockPage() {
  return (
    <TradePageShell title={tr("ساعت فارکس", "Forex clock")} note={tr("وضعیت لحظه‌ای جلسه‌های معاملاتی", "Live status of trading sessions")}>
      <ForexClockPanel />
    </TradePageShell>
  );
}
