"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n";
import { TradePageShell } from "@/components/TradePageShell";
import { TradeChecklistsPanel } from "@/components/TradeChecklistsPanel";

export default function TradeChecklistsPage() {
  const [creating, setCreating] = useState(false);

  return (
    <TradePageShell
      title={tr("چک‌لیست", "Checklists")}
      noScroll
      titleAction={
        <button type="button" className="trade-title-add-btn" onClick={() => setCreating(true)}>
          {tr("+ افزودن چک‌لیست", "+ Add checklist")}
        </button>
      }
    >
      <TradeChecklistsPanel creating={creating} onCreatingChange={setCreating} />
    </TradePageShell>
  );
}
