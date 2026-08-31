"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { PanelSkeleton } from "@/components/PanelSkeleton";
import { ACCOUNT_TYPE_LABELS, TradeAccount } from "@/lib/tradeTypes";

// اتصالِ متاتریدر روی **هر حساب جداگانه** انجام می‌شود (هر حساب ترمینال و
// لاگینِ خودش را دارد)، پس این صفحه فقط فهرستِ حساب‌ها و وضعیتِ اتصالشان را
// نشان می‌دهد و برای اتصال می‌فرستد داخلِ خودِ حساب.
type Row = TradeAccount & { connected?: boolean; lastSyncAt?: string | null };

function AccountsForMt() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/trade/accounts");
        const accounts: TradeAccount[] = res.ok ? (await res.json()).accounts || [] : [];
        const withLinks = await Promise.all(
          accounts.map(async (a) => {
            const r = await fetch(`/api/trade/metatrader?accountId=${a.id}`);
            const link = r.ok ? (await r.json()).link : null;
            return { ...a, connected: !!link?.connected, lastSyncAt: link?.lastSyncAt ?? null };
          })
        );
        setRows(withLinks);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <PanelSkeleton />;
  if (!rows.length) return <div className="item-line empty">اول باید یک حساب معاملاتی بسازی</div>;

  return (
    <div className="trade-account-grid">
      {rows.map((a) => (
        <Link key={a.id} href={`/trade/accounts/${a.id}`} className="trade-account-card trade-mt-row">
          <span className="trade-account-stripe" style={{ background: a.color }} />
          <div className="trade-account-title-row">
            <span className="trade-account-name">{a.name}</span>
            <span className="trade-account-type">{ACCOUNT_TYPE_LABELS[a.type]}</span>
          </div>
          <div className={`trade-mt-status${a.connected ? " connected" : ""}`} style={{ marginTop: 8 }}>
            <span className="forex-dot" />
            {a.connected ? "متصل" : "متصل نیست"}
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function TradeMetaTraderPage() {
  const { status } = useSession();
  return (
    <section className="trade-desktop">
      <Link href="/trade" className="trade-back-link"><ChevronRight size={15} /> ترید</Link>
      <h1>اتصال متاتریدر</h1>
      <div className="section-note">اتصال برای هر حساب جداگانه انجام می‌شود — حسابت را انتخاب کن</div>
      {status === "authenticated" ? (
        <ModuleGate module="TRADE"><AccountsForMt /></ModuleGate>
      ) : (
        <AuthGate message="برای استفاده از این سرویس وارد شوید" />
      )}
    </section>
  );
}
