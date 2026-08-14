"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { TradeJournal } from "@/components/TradeJournal";
import { TradeChecklist } from "@/components/TradeChecklist";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { MarketTicker } from "@/components/MarketTicker";

// خوندنِ ?tab= مستقیم از window.location (نه useSearchParams) — هم‌قاعده‌ی
// app/auth/login/page.tsx، برای دیپ‌لینک از منوی «ترید» ← «چک‌لیست»/«ژورنال»
function initialTab(): "checklist" | "journal" {
  if (typeof window === "undefined") return "journal";
  const t = new URLSearchParams(window.location.search).get("tab");
  return t === "checklist" ? "checklist" : "journal";
}

export default function TradePage() {
  const { status } = useSession();
  const [tab, setTab] = useState<"checklist" | "journal">(initialTab);

  return (
    <section className="trade-desktop">
      <MarketTicker />
      <h1>ترید</h1>

      <div style={{ marginTop: 10 }}>
        <SegmentedTabs
          active={tab}
          onChange={setTab}
          options={[
            { value: "journal", label: "ژورنال" },
            { value: "checklist", label: "چک‌لیست" },
          ]}
        />
      </div>

      {status === "authenticated" ? (
        <ModuleGate module="TRADE">
          {tab === "checklist" ? <TradeChecklist /> : <TradeJournal />}
        </ModuleGate>
      ) : (
        <AuthGate message="برای استفاده از این سرویس وارد شوید" />
      )}
    </section>
  );
}
