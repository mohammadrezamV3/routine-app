"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { TradeJournal } from "@/components/TradeJournal";
import { TradeChecklist } from "@/components/TradeChecklist";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { MarketTicker } from "@/components/MarketTicker";

export default function TradePage() {
  const { status } = useSession();
  const [tab, setTab] = useState<"checklist" | "journal">("checklist");

  return (
    <section className="trade-desktop">
      <MarketTicker />
      <h1>ترید</h1>

      <div style={{ marginTop: 10 }}>
        <SegmentedTabs
          active={tab}
          onChange={setTab}
          options={[
            { value: "checklist", label: "چک‌لیست" },
            { value: "journal", label: "ژورنال" },
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
