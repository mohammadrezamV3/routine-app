"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { TradeNotesPanel } from "@/components/TradeNotesPanel";

export default function TradeNotesPage() {
  const { status } = useSession();
  return (
    <section className="trade-desktop">
      <Link href="/trade" className="trade-back-link"><ChevronRight size={15} /> ترید</Link>
      <h1>یادداشت‌ها</h1>
      <div className="section-note">تحلیل‌ها، اشتباه‌ها و ایده‌هایت را همین‌جا نگه دار</div>
      {status === "authenticated" ? (
        <ModuleGate module="TRADE"><TradeNotesPanel /></ModuleGate>
      ) : (
        <AuthGate message="برای استفاده از این سرویس وارد شوید" />
      )}
    </section>
  );
}
