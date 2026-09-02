"use client";

import { TradePageShell } from "@/components/TradePageShell";
import { TradeChecklistDetailView } from "@/components/TradeChecklistDetailView";

export default function TradeChecklistDetailPage({ params }: { params: { id: string } }) {
  return (
    <TradePageShell title="چک‌لیست" back={{ href: "/trade/checklists", label: "چک‌لیست" }}>
      <TradeChecklistDetailView checklistId={params.id} />
    </TradePageShell>
  );
}
