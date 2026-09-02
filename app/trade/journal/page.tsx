"use client";

import { useState } from "react";
import { TradePageShell } from "@/components/TradePageShell";
import { TradeAccountsPanel } from "@/components/TradeAccountsPanel";

export default function TradeJournalPage() {
  const [creating, setCreating] = useState(false);

  return (
    <TradePageShell
      title="ژورنال‌نویسی"
      titleAction={
        <button type="button" className="trade-title-add-btn" onClick={() => setCreating(true)}>
          + افزودن حساب
        </button>
      }
    >
      <TradeAccountsPanel creating={creating} onCreatingChange={setCreating} />
    </TradePageShell>
  );
}
