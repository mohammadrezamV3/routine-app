"use client";

import { TradePageShell } from "@/components/TradePageShell";
import { TradeNotesPanel } from "@/components/TradeNotesPanel";

export default function TradeNotesPage() {
  return (
    <TradePageShell title="یادداشت‌ها" note="تحلیل‌ها، اشتباه‌ها و ایده‌هایت را همین‌جا نگه دار">
      <TradeNotesPanel />
    </TradePageShell>
  );
}
