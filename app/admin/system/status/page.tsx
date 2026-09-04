"use client";

import { useEffect, useState } from "react";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { formatNumber } from "@/lib/adminFormat";

type Status = {
  db: { connected: boolean; pingMs: number | null };
  process: { uptimeSeconds: number; nodeVersion: string; memoryUsedMb: number; memoryTotalMb: number; loadAvg1m: number | null };
  aiGateway: { requestsLastHour: number; errorsLastHour: number; avgDurationMsLastHour: number | null };
  errorsLastHour: number;
};

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AdminSystemStatusPage() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/admin/system-status").then((r) => r.json()).then((d) => setStatus(d.status));
    const interval = setInterval(() => {
      fetch("/api/admin/system-status").then((r) => r.json()).then((d) => setStatus(d.status));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return <div className="admin-empty is-loading">در حال بارگذاری…</div>;

  return (
    <section>
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
        <KpiTile label="Load Average (۱ دقیقه)" value={status.process.loadAvg1m != null ? status.process.loadAvg1m.toFixed(2) : "—"} index={3} />
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

      <div className="admin-section-hint">
        متریک‌های CPU/Disk سطح زیرساخت (نه پردازه) این‌جا نمایش داده نمی‌شن چون این محیط به مانیتورینگ واقعی سرور production متصل نیست — طبق قاعده‌ی «هیچ داده‌ای Fake نشه». حافظه/Uptime/Load بالا واقعی و از خود پردازه‌ی در حال اجرا خونده می‌شن.
      </div>
    </section>
  );
}
