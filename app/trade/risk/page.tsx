"use client";

import { useEffect, useState } from "react";
import { TradePageShell } from "@/components/TradePageShell";
import { RiskCalculator } from "@/components/RiskCalculator";
import type { TradeAccount } from "@/lib/tradeTypes";
import { tr } from "@/lib/i18n";

export default function TradeRiskPage() {
  const [accounts, setAccounts] = useState<TradeAccount[]>([]);
  useEffect(() => {
    fetch("/api/trade/accounts?archived=0")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAccounts(d?.accounts || []))
      .catch(() => setAccounts([]));
  }, []);
  return (
    <TradePageShell title={tr("ریسک و سود", "Risk & reward")} note={tr("اندازه‌ی پوزیشن، نسبت ریسک به سود و حداقل درصد برد", "Position size, risk-to-reward ratio and minimum win rate")}>
      <RiskCalculator accounts={accounts} />
    </TradePageShell>
  );
}
