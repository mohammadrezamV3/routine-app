"use client";

import { TradePageShell } from "@/components/TradePageShell";
import { TradeChecklistsPanel } from "@/components/TradeChecklistsPanel";

export default function TradeChecklistsPage() {
  return (
    <TradePageShell
      title="چک‌لیست"
      note="قبل از ورود، شرط‌های خودت را مرور کن — ناقص بودنش جلوی ثبت معامله را نمی‌گیرد"
    >
      <TradeChecklistsPanel />
    </TradePageShell>
  );
}
