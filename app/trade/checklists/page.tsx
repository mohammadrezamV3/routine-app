"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { TradeChecklistsPanel } from "@/components/TradeChecklistsPanel";

export default function TradeChecklistsPage() {
  const { status } = useSession();
  return (
    <section className="trade-desktop">
      <Link href="/trade" className="trade-back-link"><ChevronRight size={15} /> ترید</Link>
      <h1>چک‌لیست</h1>
      <div className="section-note">قبل از ورود، شرط‌های خودت را مرور کن — ناقص بودنش جلوی ثبت معامله را نمی‌گیرد</div>
      {status === "authenticated" ? (
        <ModuleGate module="TRADE"><TradeChecklistsPanel /></ModuleGate>
      ) : (
        <AuthGate message="برای استفاده از این سرویس وارد شوید" />
      )}
    </section>
  );
}
