"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { tr } from "@/lib/i18n";

export type AlertItem = {
  key: string; label: string; count: number; href: string; tone: "warn" | "danger" | "info";
  oldestAt?: string | null; overdue?: number;
};
type AlertsState = { items: AlertItem[]; total: number; loading: boolean; error: boolean; reload: () => void };

const Ctx = createContext<AlertsState>({ items: [], total: 0, loading: false, error: false, reload: () => {} });
export const useAdminAlerts = () => useContext(Ctx);

// یک درخواست برای زنگوله + نشان‌های سایدبار + صفحه‌ی هشدارها؛ هر 60 ثانیه
// فقط وقتی تب دیده می‌شه تازه می‌شه.
export function AdminAlertsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/alerts", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const d = await res.json();
      setItems(Array.isArray(d.items) ? d.items : []);
      setTotal(Number(d.total) || 0);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, 60_000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [load]);

  const value = useMemo(() => ({ items, total, loading, error, reload: load }), [items, total, loading, error, load]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function relAge(iso?: string | null): string {
  if (!iso) return "";
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600_000);
  if (h < 1) return tr("کمتر از 1 ساعت پیش", "less than 1 hour ago");
  if (h < 24) return tr(`${h} ساعت پیش`, `${h} h ago`);
  const d = Math.floor(h / 24);
  return tr(`${d} روز پیش`, `${d} ${d === 1 ? "day" : "days"} ago`);
}
