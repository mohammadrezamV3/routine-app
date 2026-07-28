"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { TradeJournal } from "@/components/TradeJournal";
import { TradeChecklist } from "@/components/TradeChecklist";
import { ModuleGate } from "@/components/ModuleGate";

export default function TradePage() {
  const { status } = useSession();
  const [tab, setTab] = useState<"checklist" | "journal">("checklist");

  return (
    <section>
      <h1>ترید</h1>

      <div className="day-picker" style={{ marginTop: 10 }}>
        <span className={`day-pill${tab === "checklist" ? " on" : ""}`} onClick={() => setTab("checklist")}>چک‌لیست</span>
        <span className={`day-pill${tab === "journal" ? " on" : ""}`} onClick={() => setTab("journal")}>ژورنال</span>
      </div>

      {status === "authenticated" ? (
        <ModuleGate module="TRADE">
          {tab === "checklist" ? <TradeChecklist /> : <TradeJournal />}
        </ModuleGate>
      ) : (
        <>
          <div className="section-note" style={{ marginTop: 14 }}>
            {tab === "checklist" ? "برای ساختن چک‌لیست شخصی خودت اول وارد حساب بشو." : "برای ژورنال ترید اول وارد حساب بشو."}
          </div>
          <Link href="/auth/login" className="nav-link" style={{ display: "inline-block", marginTop: 10 }}>ورود / ثبت‌نام →</Link>
        </>
      )}
    </section>
  );
}
