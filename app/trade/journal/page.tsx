"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n";
import { TradePageShell } from "@/components/TradePageShell";
import { TradeAccountsPanel } from "@/components/TradeAccountsPanel";

export default function TradeJournalPage() {
  const [creating, setCreating] = useState(false);

  return (
    <TradePageShell
      title={tr("ژورنال‌نویسی", "Journal")}
      noScroll
      titleAction={
        <button type="button" className="trade-title-add-btn" onClick={() => setCreating(true)}>
          {tr("+ افزودن حساب", "+ Add account")}
        </button>
      }
    >
      <TradeAccountsPanel creating={creating} onCreatingChange={setCreating} />
    </TradePageShell>
  );
}
