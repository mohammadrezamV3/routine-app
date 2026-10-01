"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { formatNumber } from "@/lib/adminFormat";

type Status = {
  db: { connected: boolean; pingMs: number | null };
  process: { uptimeSeconds: number; nodeVersion: string; memoryUsedMb: number; memoryTotalMb: number; loadAvg1m: number | null };
  aiGateway: { requestsLastHour: number; errorsLastHour: number; avgDurationMsLastHour: number | null };
  errorsLastHour: number;
};

const REFRESH_MS = 30_000;

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString("fa-IR-u-nu-latn", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AdminSystemStatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const inFlight = useRef(false);
  const alive = useRef(true);

  const load = useCallback(() => {
    // هر ۳۰ ثانیه + دکمه‌ی دستی — دو درخواست هم‌زمان لازم نیست
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    fetch("/api/admin/system-status")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { status?: Status }) => {
        if (!d?.status) throw new Error();
        if (!alive.current) return;
        setStatus(d.status);
        setFailed(false);
        setUpdatedAt(new Date());
      })
      .catch(() => { if (alive.current) setFailed(true); })
      .finally(() => {
        inFlight.current = false;
        if (alive.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    // تب پس‌زمینه لازم نیست سرور رو هر ۳۰ ثانیه صدا بزنه؛ برگشت به تب → تازه‌سازی فوری
    const interval = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive.current = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const head = (
    <div className="admin-page-head">
      <div>
        <div className="admin-page-kicker">وضعیت سرورها و منابع</div>
        <div className="admin-section-hint">
          {failed && status ? "آخرین تازه‌سازی ناموفق بود — داده‌ی زیر مربوط به " : "هر 30 ثانیه خودکار تازه می‌شه — آخرین به‌روزرسانی "}
          <span className="admin-updated-at">{updatedAt ? formatClock(updatedAt) : "…"}</span>
        </div>
      </div>
      <div className="admin-head-actions">
        {status && (
          <span className={`admin-badge ${status.db.connected ? "green" : "red"}`}>
            دیتابیس {status.db.connected ? "متصل" : "قطع"}
          </span>
        )}
        {/* برچسب ثابت می‌مونه تا تازه‌سازی خودکار هر ۳۰ ثانیه دکمه رو نپرونه؛ inFlight دوبل‌کلیک رو می‌گیره */}
        <button type="button" className="admin-btn" onClick={load} aria-busy={loading}>
          <RefreshCw size={14} /> تازه‌سازی
        </button>
      </div>
    </div>
  );

  if (!status) {
    return (
      <section>
        {head}
        <div className={loading ? "admin-empty is-loading" : "admin-empty"}>
          {loading ? "در حال بارگذاری…" : "خطا در دریافت وضعیت سیستم"}
          {!loading && failed && <button type="button" className="admin-btn" onClick={load}>تلاش دوباره</button>}
        </div>
      </section>
    );
  }

  return (
    <section>
      {head}

      <div className="admin-section-title">دیتابیس</div>
      <KpiGrid>
        <KpiTile label="وضعیت اتصال" value={status.db.connected ? "متصل" : "قطع"} index={0} />
        <KpiTile label="زمان پاسخ" value={status.db.pingMs != null ? `${status.db.pingMs}ms` : "—"} index={1} />
      </KpiGrid>

      <div className="admin-section-title">سرور (پردازه Node.js فعلی)</div>
      <KpiGrid>
        <KpiTile label="Uptime" value={formatUptime(status.process.uptimeSeconds)} index={0} />
        <KpiTile label="حافظه مصرفی" value={`${formatNumber(status.process.memoryUsedMb)} MB`} index={1} />
        <KpiTile label="حافظه کل هاست" value={`${formatNumber(status.process.memoryTotalMb)} MB`} index={2} />
        <KpiTile label="Load Average (1 دقیقه)" value={status.process.loadAvg1m != null ? status.process.loadAvg1m.toFixed(2) : "—"} index={3} />
        <KpiTile label="نسخه Node" value={status.process.nodeVersion} index={4} />
      </KpiGrid>

      <div className="admin-section-title">گیت‌وی AI (ساعت گذشته)</div>
      <KpiGrid>
        <KpiTile label="درخواست‌ها" value={formatNumber(status.aiGateway.requestsLastHour)} index={0} />
        <KpiTile label="خطاها" value={formatNumber(status.aiGateway.errorsLastHour)} index={1} />
        <KpiTile label="میانگین زمان پاسخ" value={status.aiGateway.avgDurationMsLastHour != null ? `${status.aiGateway.avgDurationMsLastHour}ms` : "—"} index={2} />
      </KpiGrid>

      <div className="admin-section-title">خطاهای سیستم (ساعت گذشته)</div>
      <KpiGrid>
        <KpiTile label="تعداد خطا" value={formatNumber(status.errorsLastHour)} index={0} />
      </KpiGrid>

      <div className="admin-section-hint is-after">
        متریک‌های CPU/Disk سطح زیرساخت (نه پردازه) این‌جا نمایش داده نمی‌شن چون این محیط به مانیتورینگ واقعی سرور production متصل نیست — طبق قاعده‌ی «هیچ داده‌ای Fake نشه». حافظه/Uptime/Load بالا واقعی و از خود پردازه‌ی در حال اجرا خونده می‌شن.
      </div>
    </section>
  );
}
