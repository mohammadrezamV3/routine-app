"use client";

import { useEffect, useState } from "react";
import { TradePageShell } from "@/components/TradePageShell";
import { MoneyManagementPanel } from "@/components/MoneyManagementPanel";
import type { TradeAccount } from "@/lib/tradeTypes";

export default function TradeMoneyPage() {
  const [accounts, setAccounts] = useState<TradeAccount[] | null>(null);
  useEffect(() => {
    fetch("/api/trade/accounts?archived=0")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAccounts(d?.accounts || []))
      .catch(() => setAccounts([]));
  }, []);
  return (
    <TradePageShell title="مدیریت سرمایه" note="قوانین ریسک و محدودیت که اکسپرت متاتریدر روی حساب اجرا می‌کند">
      <MoneyManagementPanel accounts={accounts} />
    </TradePageShell>
  );
}
