"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { EconomicCalendarPanel } from "@/components/EconomicCalendarPanel";

export default function TradeCalendarPage() {
  const { status } = useSession();
  return (
    <section className="trade-desktop">
      <Link href="/trade" className="trade-back-link"><ChevronRight size={15} /> ترید</Link>
      <h1>تقویم اقتصادی</h1>
      <div className="section-note">همه‌ی ساعت‌ها به وقت محلی خودت</div>
      {status === "authenticated" ? (
        <ModuleGate module="TRADE"><EconomicCalendarPanel /></ModuleGate>
      ) : (
        <AuthGate message="برای استفاده از این سرویس وارد شوید" />
      )}
    </section>
  );
}
