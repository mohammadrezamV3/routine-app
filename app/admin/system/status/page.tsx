"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { formatNumber } from "@/lib/adminFormat";
import { isEn, tr } from "@/lib/i18n";

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
  return d.toLocaleTimeString(isEn() ? "en-GB" : "fa-IR-u-nu-latn", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
        <div className="admin-page-kicker">{tr("وضعیت سرورها و منابع", "Server and resource status")}</div>
        <div className="admin-section-hint">
          {failed && status
            ? tr("آخرین تازه‌سازی ناموفق بود — داده‌ی زیر مربوط به ", "The last refresh failed — the data below is from ")
            : tr("هر 30 ثانیه خودکار تازه می‌شه — آخرین به‌روزرسانی ", "Refreshes automatically every 30 seconds — last updated ")}
          <span className="admin-updated-at">{updatedAt ? formatClock(updatedAt) : "…"}</span>
        </div>
      </div>
      <div className="admin-head-actions">
        {status && (
          <span className={`admin-badge ${status.db.connected ? "green" : "red"}`}>
            {tr("دیتابیس", "Database")} {status.db.connected ? tr("متصل", "Connected") : tr("قطع", "Disconnected")}
          </span>
        )}
        {/* برچسب ثابت می‌مونه تا تازه‌سازی خودکار هر ۳۰ ثانیه دکمه رو نپرونه؛ inFlight دوبل‌کلیک رو می‌گیره */}
        <button type="button" className="admin-btn" onClick={load} aria-busy={loading}>
          <RefreshCw size={14} /> {tr("تازه‌سازی", "Refresh")}
        </button>
      </div>
    </div>
  );

  if (!status) {
    return (
      <section>
        {head}
        <div className={loading ? "admin-empty is-loading" : "admin-empty"}>
          {loading ? tr("در حال بارگذاری…", "Loading…") : tr("خطا در دریافت وضعیت سیستم", "Couldn't load system status")}
          {!loading && failed && <button type="button" className="admin-btn" onClick={load}>{tr("تلاش دوباره", "Try again")}</button>}
        </div>
      </section>
    );
  }

  return (
    <section>
      {head}

      <div className="admin-section-title">{tr("دیتابیس", "Database")}</div>
      <KpiGrid>
        <KpiTile label={tr("وضعیت اتصال", "Connection")} value={status.db.connected ? tr("متصل", "Connected") : tr("قطع", "Disconnected")} index={0} />
        <KpiTile label={tr("زمان پاسخ", "Response time")} value={status.db.pingMs != null ? `${status.db.pingMs}ms` : "—"} index={1} />
      </KpiGrid>

      <div className="admin-section-title">{tr("سرور (پردازه Node.js فعلی)", "Server (current Node.js process)")}</div>
      <KpiGrid>
        <KpiTile label="Uptime" value={formatUptime(status.process.uptimeSeconds)} index={0} />
        <KpiTile label={tr("حافظه مصرفی", "Memory used")} value={`${formatNumber(status.process.memoryUsedMb)} MB`} index={1} />
        <KpiTile label={tr("حافظه کل هاست", "Host total memory")} value={`${formatNumber(status.process.memoryTotalMb)} MB`} index={2} />
        <KpiTile label={tr("Load Average (1 دقیقه)", "Load average (1 min)")} value={status.process.loadAvg1m != null ? status.process.loadAvg1m.toFixed(2) : "—"} index={3} />
        <KpiTile label={tr("نسخه Node", "Node version")} value={status.process.nodeVersion} index={4} />
      </KpiGrid>

      <div className="admin-section-title">{tr("گیت‌وی AI (ساعت گذشته)", "AI gateway (last hour)")}</div>
      <KpiGrid>
        <KpiTile label={tr("درخواست‌ها", "Requests")} value={formatNumber(status.aiGateway.requestsLastHour)} index={0} />
        <KpiTile label={tr("خطاها", "Errors")} value={formatNumber(status.aiGateway.errorsLastHour)} index={1} />
        <KpiTile label={tr("میانگین زمان پاسخ", "Avg response time")} value={status.aiGateway.avgDurationMsLastHour != null ? `${status.aiGateway.avgDurationMsLastHour}ms` : "—"} index={2} />
      </KpiGrid>

      <div className="admin-section-title">{tr("خطاهای سیستم (ساعت گذشته)", "System errors (last hour)")}</div>
      <KpiGrid>
        <KpiTile label={tr("تعداد خطا", "Error count")} value={formatNumber(status.errorsLastHour)} index={0} />
      </KpiGrid>

      <div className="admin-section-hint is-after">
        {tr(
          "متریک‌های CPU/Disk سطح زیرساخت (نه پردازه) این‌جا نمایش داده نمی‌شن چون این محیط به مانیتورینگ واقعی سرور production متصل نیست — طبق قاعده‌ی «هیچ داده‌ای Fake نشه». حافظه/Uptime/Load بالا واقعی و از خود پردازه‌ی در حال اجرا خونده می‌شن.",
          "Infrastructure CPU/disk metrics (not the process) aren't shown here, because this environment isn't connected to real production server monitoring. Following the \"no fake data\" rule, the memory, uptime and load above are real and read from the running process itself.",
        )}
      </div>
    </section>
  );
}
