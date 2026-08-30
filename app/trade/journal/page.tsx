"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { TradeAccountsPanel } from "@/components/TradeAccountsPanel";

export default function TradeJournalPage() {
  const { status } = useSession();
  return (
    <section className="trade-desktop">
      <Link href="/trade" className="trade-back-link"><ChevronRight size={15} /> ترید</Link>
      <h1>ژورنال‌نویسی</h1>
      <div className="section-note">هر حساب، آمار و معاملات خودش را دارد</div>
      {status === "authenticated" ? (
        <ModuleGate module="TRADE"><TradeAccountsPanel /></ModuleGate>
      ) : (
        <AuthGate message="برای استفاده از این سرویس وارد شوید" />
      )}
    </section>
  );
}
