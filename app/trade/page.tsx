"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { TradeJournal } from "@/components/TradeJournal";
import { TradeChecklist } from "@/components/TradeChecklist";

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

      {tab === "checklist" ? (
        status === "authenticated" ? (
          <TradeChecklist />
        ) : (
          <>
            <div className="section-note" style={{ marginTop: 14 }}>برای ساختن چک‌لیست شخصی خودت اول وارد حساب بشو.</div>
            <Link href="/auth/login" className="nav-link" style={{ display: "inline-block", marginTop: 10 }}>ورود / ثبت‌نام →</Link>
          </>
        )
      ) : status === "authenticated" ? (
        <TradeJournal />
      ) : (
        <>
          <div className="section-note" style={{ marginTop: 14 }}>برای ژورنال ترید اول وارد حساب بشو.</div>
          <Link href="/auth/login" className="nav-link" style={{ display: "inline-block", marginTop: 10 }}>ورود / ثبت‌نام →</Link>
        </>
      )}
    </section>
  );
}
