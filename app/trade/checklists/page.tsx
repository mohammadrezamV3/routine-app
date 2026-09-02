"use client";

import { useState } from "react";
import { TradePageShell } from "@/components/TradePageShell";
import { TradeChecklistsPanel } from "@/components/TradeChecklistsPanel";

export default function TradeChecklistsPage() {
  const [creating, setCreating] = useState(false);

  return (
    <TradePageShell
      title="چک‌لیست"
      titleAction={
        <button type="button" className="trade-title-add-btn" onClick={() => setCreating(true)}>
          + افزودن چک‌لیست
        </button>
      }
    >
      <TradeChecklistsPanel creating={creating} onCreatingChange={setCreating} />
    </TradePageShell>
  );
}
