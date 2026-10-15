"use client";

import { tr } from "@/lib/i18n";
import { TradePageShell } from "@/components/TradePageShell";
import { TradeChecklistDetailView } from "@/components/TradeChecklistDetailView";

export default function TradeChecklistDetailPage({ params }: { params: { id: string } }) {
  return (
    <TradePageShell title={tr("چک‌لیست", "Checklists")} back={{ href: "/trade/checklists", label: tr("چک‌لیست", "Checklists") }}>
      <TradeChecklistDetailView checklistId={params.id} />
    </TradePageShell>
  );
}
