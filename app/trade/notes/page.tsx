"use client";

import { useState } from "react";
import { TradePageShell } from "@/components/TradePageShell";
import { TradeNotesPanel } from "@/components/TradeNotesPanel";

export default function TradeNotesPage() {
  const [creating, setCreating] = useState(false);

  return (
    <TradePageShell
      title="یادداشت‌ها"
      titleAction={
        <button type="button" className="trade-title-add-btn" onClick={() => setCreating(true)}>
          + افزودن یادداشت
        </button>
      }
    >
      <TradeNotesPanel creating={creating} onCreatingChange={setCreating} />
    </TradePageShell>
  );
}
