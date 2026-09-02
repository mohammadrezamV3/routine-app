"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { TradePageShell } from "@/components/TradePageShell";
import { PanelSkeleton } from "@/components/PanelSkeleton";
import { ACCOUNT_TYPE_LABELS, TradeAccount } from "@/lib/tradeTypes";

// اتصالِ متاتریدر روی هر حساب جداگانه انجام می‌شود (هر حساب ترمینال و
// لاگینِ خودش را دارد)، پس این صفحه فقط فهرستِ حساب‌ها و وضعیتشان را نشان
// می‌دهد. وضعیتِ اتصال از خودِ همان یک درخواستِ حساب‌ها می‌آید — قبلاً به‌ازای
// هر حساب یک درخواستِ جدا می‌رفت و باز شدنِ صفحه را کُند می‌کرد.
type Row = TradeAccount & { mtConnected?: boolean };

function AccountsForMt() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trade/accounts?archived=0")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setRows(d?.accounts || []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PanelSkeleton />;
  if (!rows.length) {
    return (
      <div className="item-line empty" style={{ marginTop: 16 }}>
        اول باید یک حساب معاملاتی بسازی —{" "}
        <Link href="/trade/journal" style={{ color: "var(--accent)" }}>رفتن به حساب‌ها</Link>
      </div>
    );
  }

  return (
    <div className="trade-account-grid">
      {rows.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: Math.min(i, 8) * 0.045, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link href={`/trade/metatrader/${a.id}`} prefetch className="trade-surface trade-mt-row">
            <span className="trade-account-stripe" style={{ background: a.color }} />
            <div className="trade-account-title-row">
              <span className="trade-account-name">{a.name}</span>
              <span className="trade-account-type">{ACCOUNT_TYPE_LABELS[a.type]}</span>
            </div>
            <div className={`trade-mt-status${a.mtConnected ? " connected" : ""}`} style={{ marginTop: 10 }}>
              <span className="forex-dot" />
              {a.mtConnected ? "فعال" : "غیرفعال"}
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

export default function TradeMetaTraderPage() {
  return (
    <TradePageShell
      title="اتصال متاتریدر"
      note="اتصال برای هر حساب جداگانه انجام می‌شود — حسابت را انتخاب کن"
    >
      <AccountsForMt />
    </TradePageShell>
  );
}
