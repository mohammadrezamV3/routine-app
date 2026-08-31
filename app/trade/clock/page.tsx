"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { ForexClockPanel } from "@/components/ForexClockPanel";

export default function TradeClockPage() {
  const { status } = useSession();
  return (
    <section className="trade-desktop">
      <Link href="/trade" className="trade-back-link"><ChevronRight size={15} /> ترید</Link>
      <h1>ساعت فارکس</h1>
      <div className="section-note">وضعیت لحظه‌ای جلسه‌های معاملاتی</div>
      {status === "authenticated" ? (
        <ModuleGate module="TRADE"><ForexClockPanel /></ModuleGate>
      ) : (
        <AuthGate message="برای استفاده از این سرویس وارد شوید" />
      )}
    </section>
  );
}
