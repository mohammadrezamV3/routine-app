"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { formatNumber } from "@/lib/adminFormat";
import { tr } from "@/lib/i18n";

type Counts = { requests: number; limited: number; shed: number };
type Payload = {
  minutes: number;
  local: {
    pid: number;
    byPolicy: Record<string, Counts>;
    topUsers: { userId: string; count: number }[];
    breakers: { name: string; state: string }[];
    gates: { name: string; inFlight: number; max: number }[];
  };
  shared: { byPolicy: Record<string, { total: number; guests: number }>; topUsers: { userId: string; count: number }[] } | null;
};

const REFRESH_MS = 15_000;

export default function AdminSystemLoadPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

  const load = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    fetch("/api/admin/system/load", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Payload) => { setData(d); setFailed(false); })
      .catch(() => setFailed(true))
      .finally(() => { inFlight.current = false; setLoading(false); });
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const head = (
    <div className="admin-page-head">
      <div>
        <div className="admin-page-kicker">{tr("بار و محدودیت درخواست‌ها", "Load and request limits")}</div>
        <div className="admin-section-hint">
          {tr(`آمار ${data?.minutes ?? 10} دقیقه‌ی اخیر؛ جدول اول فقط مربوط به همین پردازه (worker) است و هر 15 ثانیه تازه می‌شه.`, `Last ${data?.minutes ?? 10} minutes; the first table covers only this worker process and refreshes every 15 seconds.`)}
        </div>
      </div>
      <div className="admin-head-actions">
        <button type="button" className="admin-btn" onClick={load} aria-busy={loading}>
          <RefreshCw size={14} /> {tr("تازه‌سازی", "Refresh")}
        </button>
      </div>
    </div>
  );

  if (!data) {
    return (
      <section>
        {head}
        <div className={loading ? "admin-empty is-loading" : "admin-empty"}>
          {loading ? tr("در حال بارگذاری…", "Loading…") : tr("خطا در دریافت آمار", "Couldn't load stats")}
          {!loading && failed && <button type="button" className="admin-btn" onClick={load}>{tr("تلاش دوباره", "Try again")}</button>}
        </div>
      </section>
    );
  }

  const policies = Object.keys(data.local.byPolicy).sort();
  const sum = (k: keyof Counts) => policies.reduce((a, p) => a + data.local.byPolicy[p][k], 0);

  return (
    <section>
      {head}
      <KpiGrid>
        <KpiTile label={tr("درخواست‌ها", "Requests")} value={formatNumber(sum("requests"))} index={0} />
        <KpiTile label={tr("رد شده (429)", "Rejected (429)")} value={formatNumber(sum("limited"))} index={1} />
        <KpiTile label={tr("ریزش بار (503)", "Shed (503)")} value={formatNumber(sum("shed"))} index={2} />
      </KpiGrid>

      <div className="admin-section-title">{tr("به‌ازای هر سیاست (این worker)", "Per policy (this worker)")}</div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{tr("سیاست", "Policy")}</th><th>{tr("درخواست", "Requests")}</th><th>429</th><th>503</th></tr></thead>
          <tbody>
            {policies.length === 0 && <tr><td colSpan={4}>{tr("هنوز درخواستی ثبت نشده", "No requests recorded yet")}</td></tr>}
            {policies.map((p) => (
              <tr key={p}><td>{p}</td><td>{formatNumber(data.local.byPolicy[p].requests)}</td><td>{formatNumber(data.local.byPolicy[p].limited)}</td><td>{formatNumber(data.local.byPolicy[p].shed)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-section-title">{tr("سقف هم‌زمانی و قطع‌کننده‌ها", "Concurrency caps and breakers")}</div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{tr("مورد", "Item")}</th><th>{tr("وضعیت", "State")}</th></tr></thead>
          <tbody>
            {data.local.gates.map((g) => (<tr key={`g-${g.name}`}><td>{g.name}</td><td>{g.inFlight} / {g.max}</td></tr>))}
            {data.local.breakers.length === 0 && <tr><td>{tr("قطع‌کننده", "Breakers")}</td><td>{tr("همه بسته (سالم)", "All closed (healthy)")}</td></tr>}
            {data.local.breakers.map((b) => (<tr key={`b-${b.name}`}><td>{b.name}</td><td>{b.state}</td></tr>))}
          </tbody>
        </table>
      </div>

      <div className="admin-section-title">{tr("شمارنده‌های مشترک دیتابیس (همه‌ی workerها)", "Shared database counters (all workers)")}</div>
      {data.shared ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>{tr("سیاست", "Policy")}</th><th>{tr("مجموع", "Total")}</th><th>{tr("مهمان", "Guests")}</th></tr></thead>
            <tbody>
              {Object.keys(data.shared.byPolicy).length === 0 && <tr><td colSpan={3}>{tr("چیزی ثبت نشده", "Nothing recorded")}</td></tr>}
              {Object.entries(data.shared.byPolicy).map(([p, v]) => (<tr key={p}><td>{p}</td><td>{formatNumber(v.total)}</td><td>{formatNumber(v.guests)}</td></tr>))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty">{tr("شمارنده‌ی مشترک در دسترس نیست", "Shared counters unavailable")}</div>
      )}

      <div className="admin-section-title">{tr("پرتکرارترین کاربران (فقط شناسه)", "Top users by request count (ids only)")}</div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{tr("شناسه‌ی کاربر", "User id")}</th><th>{tr("تعداد", "Count")}</th><th>{tr("منبع", "Source")}</th></tr></thead>
          <tbody>
            {data.local.topUsers.length + (data.shared?.topUsers.length ?? 0) === 0 && <tr><td colSpan={3}>{tr("چیزی ثبت نشده", "Nothing recorded")}</td></tr>}
            {data.local.topUsers.map((u) => (<tr key={`l-${u.userId}`}><td className="mono">{u.userId}</td><td>{formatNumber(u.count)}</td><td>{tr("این worker", "This worker")}</td></tr>))}
            {(data.shared?.topUsers ?? []).map((u) => (<tr key={`s-${u.userId}`}><td className="mono">{u.userId}</td><td>{formatNumber(u.count)}</td><td>{tr("دیتابیس", "Database")}</td></tr>))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
