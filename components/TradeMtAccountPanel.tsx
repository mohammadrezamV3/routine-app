"use client";

import { useEffect, useState } from "react";
import { getSetting } from "@/lib/storage";
import { CAL_SYSTEM_KEY, CalSystem, TradeAccount } from "@/lib/tradeTypes";
import { TradeMtLinkPanel } from "./TradeMtLinkPanel";
import { PanelSkeleton } from "./PanelSkeleton";

// از صفحه‌ی فهرست متاتریدر، انتخاب یک حساب فقط باکس اتصال رو نشون
// می‌ده — نه کل صفحه‌ی حساب (آمار/لیست معاملات که به این بخش ربطی
// نداره). به‌جای TradeAccountView کاملا جدا، همین کامپوننت سبک.
export function TradeMtAccountPanel({ accountId }: { accountId: string }) {
  const [account, setAccount] = useState<TradeAccount | null>(null);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trade/accounts?archived=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const found = (d?.accounts || []).find((a: TradeAccount) => a.id === accountId) || null;
        if (!found) { setNotFound(true); return; }
        setAccount(found);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accountId]);

  if (loading) return <PanelSkeleton />;
  if (notFound || !account) return <div className="item-line empty">این حساب پیدا نشد.</div>;

  return <TradeMtLinkPanel accountId={account.id} calSystem={calSystem} accountName={account.name} />;
}
