"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n";
import { TradePageShell } from "@/components/TradePageShell";
import { TradeNotesPanel } from "@/components/TradeNotesPanel";

export default function TradeNotesPage() {
  const [creating, setCreating] = useState(false);

  return (
    <TradePageShell
      title={tr("یادداشت‌ها", "Notes")}
      noScroll
      titleAction={
        <button type="button" className="trade-title-add-btn" onClick={() => setCreating(true)}>
          {tr("+ افزودن یادداشت", "+ Add note")}
        </button>
      }
    >
      <TradeNotesPanel creating={creating} onCreatingChange={setCreating} />
    </TradePageShell>
  );
}
