"use client";

import { useEffect, useState } from "react";
import { TradePageShell } from "@/components/TradePageShell";
import { RiskCalculator } from "@/components/RiskCalculator";
import type { TradeAccount } from "@/lib/tradeTypes";

export default function TradeRiskPage() {
  const [accounts, setAccounts] = useState<TradeAccount[]>([]);
  useEffect(() => {
    fetch("/api/trade/accounts?archived=0")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAccounts(d?.accounts || []))
      .catch(() => setAccounts([]));
  }, []);
  return (
    <TradePageShell title="ریسک و سود" note="اندازه‌ی پوزیشن، نسبت ریسک به سود و حداقل درصد برد">
      <RiskCalculator accounts={accounts} />
    </TradePageShell>
  );
}
