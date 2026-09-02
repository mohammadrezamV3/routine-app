"use client";

import { TradePageShell } from "@/components/TradePageShell";
import { TradeMtAccountPanel } from "@/components/TradeMtAccountPanel";

export default function TradeMetaTraderAccountPage({ params }: { params: { id: string } }) {
  return (
    <TradePageShell
      title="اتصال متاتریدر"
      back={{ href: "/trade/metatrader", label: "اتصال متاتریدر" }}
    >
      <TradeMtAccountPanel accountId={params.id} />
    </TradePageShell>
  );
}
