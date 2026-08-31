"use client";

import { TradePageShell } from "@/components/TradePageShell";
import { TradeAccountsPanel } from "@/components/TradeAccountsPanel";

export default function TradeJournalPage() {
  return (
    <TradePageShell title="ژورنال‌نویسی" note="هر حساب، آمار و معاملات خودش را دارد">
      <TradeAccountsPanel />
    </TradePageShell>
  );
}
