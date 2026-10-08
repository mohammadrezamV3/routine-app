"use client";

import { TradePageShell } from "@/components/TradePageShell";
import { MoneyManagerDownload } from "@/components/MoneyManagerDownload";

export default function TradeMoneyPage() {
  return (
    <TradePageShell title="اکسپرت مدیریت سرمایه" note="اکسپرت مستقل متاتریدر برای ریسک، حد ضرر روزانه و حجم خودکار">
      <MoneyManagerDownload />
    </TradePageShell>
  );
}
