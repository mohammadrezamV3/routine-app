"use client";

import { TradePageShell } from "@/components/TradePageShell";
import { MoneyManagerDownload } from "@/components/MoneyManagerDownload";
import { tr } from "@/lib/i18n";

export default function TradeMoneyPage() {
  return (
    <TradePageShell title={tr("اکسپرت مدیریت سرمایه", "Money management EA")} note={tr("اکسپرت مستقل متاتریدر برای ریسک، حد ضرر روزانه و حجم خودکار", "A standalone MetaTrader EA for risk, daily loss limit and auto lot size")}>
      <MoneyManagerDownload />
    </TradePageShell>
  );
}
