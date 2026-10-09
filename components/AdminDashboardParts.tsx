"use client";

import Link from "next/link";
import { areaPaths, barHeights, relativeTimeFa, sparklinePoints, type FeedItem, type QueueItem } from "@/lib/adminOverview";
import { formatCurrencyAmount, formatNumber } from "@/lib/adminFormat";
import type { KpiOut, OverviewDashboard } from "@/lib/adminOverviewServer";
import { tr } from "@/lib/i18n";

export function KpiCard({ label, k, invert, color }: { label: string; k: KpiOut; invert?: boolean; color: string }) {
  const noData = k.spark.every((v) => v === 0);
  const hasValue = k.value !== null && k.value !== undefined && !(k.unit === "percent" && k.value === 0 && noData);
  const value = !hasValue ? "—" : k.unit === "percent" ? `${k.value}%` : formatNumber(k.value as number);
  const d = k.delta === 0 && noData ? null : k.delta;
  const good = d === null || d === 0 ? null : invert ? d < 0 : d > 0;
  const deltaText = d === null ? "—" : `${d > 0 ? "+" : ""}${d}%`;
  return (
    <div className="adb-kpi">
      <span className="adb-kpi-label">{label}</span>
      <strong className="adb-kpi-value">
        {value}
        {hasValue && k.unit === "toman" && <span className="adb-kpi-unit">{tr("تومان", "Toman")}</span>}
      </strong>
      <div className="adb-kpi-foot">
        <span className={`adb-delta${good === null ? "" : good ? " up" : " down"}`}>{deltaText}</span>
        <svg className="adb-spark" viewBox="0 0 72 26" aria-hidden="true">
          <polyline points={sparklinePoints(k.spark)} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

export function RevenueChart({ chart, days, canRevenue }: { chart: NonNullable<OverviewDashboard["chart"]>; days: number; canRevenue: boolean }) {
  const W = 760, H = 230;
  const n = chart.signups.length || chart.revenue.length;
  const step = n > 1 ? (W - 20) / (n - 1) : 0;
  const bw = Math.max(3, Math.min(14, (W / Math.max(n, 1)) * 0.5));
  const bars = barHeights(chart.signups, 110);
  const { line, area } = areaPaths(chart.revenue, W, H, 20, 25);
  const hasRevenue = chart.revenue.some((v) => v > 0);
  return (
    <>
      <div className="adb-card-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h2 className="adb-card-title">{canRevenue ? tr("درآمد و ثبت‌نام", "Revenue and sign-ups") : tr("ثبت‌نام", "Sign-ups")}</h2>
          <span className="adb-card-hint">{tr(`${days} روز اخیر`, `Last ${days} ${(days) === 1 ? "day" : "days"}`)}{canRevenue ? tr(" · تومان", " · Toman") : ""}</span>
        </div>
        {canRevenue && (
          <div className="adb-nums">
            <div className="adb-num"><span>{tr("درآمد خالص", "Net revenue")}</span><strong>{formatNumber(chart.netRevenue)}</strong></div>
            <div className="adb-num"><span>{tr("میانگین سبد", "Average order")}</span><strong>{chart.avgOrder === null ? "—" : formatNumber(chart.avgOrder)}</strong></div>
          </div>
        )}
      </div>
      <svg className="adb-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={tr("نمودار درآمد و ثبت‌نام روزانه", "Daily revenue and sign-ups chart")} style={{ direction: "ltr" }}>
        <defs>
          <linearGradient id="adb-ra" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[30, 100, 170].map((y) => <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="var(--surface-line)" />)}
        {bars.map((h, i) => (h > 0 ? <rect key={i} x={10 + i * step - bw / 2} y={205 - h} width={bw} height={h} rx="3" fill="var(--ring-2a)" opacity="0.35" /> : null))}
        {canRevenue && hasRevenue && (
          <>
            <path d={area} fill="url(#adb-ra)" />
            <path d={line} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      {canRevenue && !hasRevenue && <div className="adb-card-hint">{tr("درآمدی در این بازه ثبت نشده", "No revenue recorded in this period")}</div>}
      <div className="adb-legend">
        {canRevenue && hasRevenue && <span><i className="adb-lg-line" />{tr("درآمد", "Revenue")}</span>}
        <span><i className="adb-lg-bar" />{tr("ثبت‌نام روزانه", "Daily sign-ups")}</span>
      </div>
    </>
  );
}

export function QueueCard({ items, total }: { items: QueueItem[]; total: number }) {
  return (
    <div className="adb-card adb-queue adb-span-4" style={{ gap: 12 }}>
      <div className="adb-card-head" style={{ alignItems: "center" }}>
        <h2 className="adb-card-title">{tr("نیاز به اقدام", "Needs action")}</h2>
        <span className="adb-queue-total">{tr(`${total} مورد`, `${total} ${(total) === 1 ? "item" : "items"}`)}</span>
      </div>
      {items.length === 0 && <div className="adb-empty">{tr("مورد منتظری نیست.", "Nothing is waiting.")}</div>}
      {items.map((q) => (
        <Link key={q.key} href={q.href} className="adb-q-item">
          <span className={`adb-q-dot${q.count > 0 && q.tone === "red" ? " red" : ""}`} />
          <div className="adb-q-body"><strong>{q.title}</strong><span>{q.sub}</span></div>
          <span className="adb-q-n">{formatNumber(q.count)}</span>
        </Link>
      ))}
    </div>
  );
}

export function FunnelCard({ steps }: { steps: NonNullable<OverviewDashboard["funnel"]> }) {
  const top = Math.max(steps[0]?.count || 0, 1);
  return (
    <div className="adb-card adb-span-4 adb-third">
      <h2 className="adb-card-title sm">{tr("قیف تبدیل", "Conversion funnel")}</h2>
      {steps.map((s) => (
        <div className="adb-bar-row" key={s.key}>
          <div className="adb-bar-top"><span>{s.label}</span><strong>{formatNumber(s.count)}</strong></div>
          <div className="adb-track"><div className="adb-fill" style={{ width: `${Math.round((s.count / top) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function ModulesCard({ modules }: { modules: NonNullable<OverviewDashboard["modules"]> }) {
  return (
    <div className="adb-card adb-span-4 adb-third">
      <h2 className="adb-card-title sm">{tr("استفاده از بخش‌ها", "Module usage")}</h2>
      {modules.map((m) => (
        <div className="adb-mod-row" key={m.key}>
          <span>{m.label}</span>
          <div className="adb-track thin"><div className="adb-fill" style={{ width: `${m.percent ?? 0}%` }} /></div>
          <strong>{m.percent === null ? "—" : `${m.percent}%`}</strong>
        </div>
      ))}
    </div>
  );
}

export function HealthCard({ h }: { h: NonNullable<OverviewDashboard["health"]> }) {
  const stateText = h.state === "ok" ? tr("همه سالم", "All healthy") : h.state === "warn" ? tr("نیاز به توجه", "Needs attention") : tr("مشکل در اتصال", "Connection problem");
  const rows: { label: string; value: string; tone?: "warn" | "bad" | "off" }[] = [
    { label: tr("پایگاه داده", "Database"), value: h.dbConnected ? (h.dbPingMs !== null ? `${h.dbPingMs}ms` : tr("متصل", "Connected")) : tr("قطع", "Down"), tone: h.dbConnected ? undefined : "bad" },
    { label: tr("آخرین همگام‌سازی تقویم", "Last calendar sync"), value: h.calendarSyncAt ? relativeTimeFa(h.calendarSyncAt) : "—", tone: h.calendarSyncAt ? undefined : "off" },
    { label: tr("یادآور در صف پوش", "Reminders in push queue"), value: h.pushQueue === null ? "—" : formatNumber(h.pushQueue) },
    { label: tr("آخرین خطا", "Last error"), value: h.lastErrorAt ? relativeTimeFa(h.lastErrorAt) : tr("بدون خطا", "No errors"), tone: h.errors24h ? "warn" : undefined },
  ];
  return (
    <div className="adb-card adb-span-4 adb-third" style={{ gap: 6 }}>
      <div className="adb-card-head" style={{ alignItems: "center" }}>
        <h2 className="adb-card-title sm">{tr("سلامت سیستم", "System health")}</h2>
        <span className={`adb-state${h.state === "ok" ? "" : " " + h.state}`}>{stateText}</span>
      </div>
      {rows.map((r) => (
        <div className="adb-health-row" key={r.label}>
          <span className={`adb-dot${r.tone ? " " + r.tone : ""}`} />
          <span style={{ flex: 1 }}>{r.label}</span>
          <span className="v">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function FeedCard({ items }: { items: FeedItem[] }) {
  return (
    <div className="adb-card adb-span-5" style={{ gap: 4 }}>
      <div className="adb-card-head" style={{ alignItems: "center", paddingBottom: 8 }}>
        <h2 className="adb-card-title sm">{tr("فعالیت اخیر", "Recent activity")}</h2>
      </div>
      {items.length === 0 && <div className="adb-empty">{tr("فعالیتی ثبت نشده.", "No activity recorded.")}</div>}
      {items.map((e) => (
        <Link key={`${e.kind}:${e.id}`} href={e.href} className="adb-feed-item">
          <span className={`adb-feed-dot ${e.kind}`} />
          <div className="adb-feed-body"><span>{e.text}</span><span className="adb-feed-time">{relativeTimeFa(e.at)}</span></div>
        </Link>
      ))}
    </div>
  );
}

function statusMeta(): Record<string, { label: string; cls: string }> {
  return {
    paid: { label: tr("موفق", "Paid"), cls: "green" },
    refunded: { label: tr("بازپرداخت", "Refunded"), cls: "amber" },
    pending: { label: tr("ناموفق", "Failed"), cls: "red" },
  };
}

export function TransactionsCard({ rows, canUsers }: { rows: NonNullable<OverviewDashboard["transactions"]>; canUsers: boolean }) {
  return (
    <div className="adb-card adb-span-7 adb-tx-card" style={{ gap: 10 }}>
      <div className="adb-card-head" style={{ alignItems: "center" }}>
        <h2 className="adb-card-title sm">{tr("آخرین تراکنش‌ها", "Latest transactions")}</h2>
        <Link href="/admin/transactions" className="adb-link">{tr("همه ‹", "All ›")}</Link>
      </div>
      {rows.length === 0 ? <div className="adb-empty">{tr("تراکنشی ثبت نشده.", "No transactions recorded.")}</div> : (
        <div className="adb-tx-wrap">
          <table className="adb-tx">
            <thead><tr><th>{tr("کاربر", "User")}</th><th>{tr("پلن", "Plan")}</th><th>{tr("مبلغ", "Amount")}</th><th>{tr("وضعیت", "Status")}</th><th>{tr("زمان", "Time")}</th></tr></thead>
            <tbody>
              {rows.map((t) => {
                const st = statusMeta()[t.status];
                const name = (
                  <span className="adb-user">
                    <span className="adb-init">{t.user.replace("@", "").trim().charAt(0) || tr("؟", "?")}</span>{t.user}
                  </span>
                );
                return (
                  <tr key={t.id}>
                    <td>{canUsers ? <Link href={`/admin/users/${t.userId}`}>{name}</Link> : name}</td>
                    <td className="adb-muted">{t.plan}</td>
                    <td className="adb-amount"><Link href="/admin/transactions">{formatCurrencyAmount(t.amount, t.currency)}</Link></td>
                    <td><span className={`admin-badge ${st.cls}`}>{st.label}</span></td>
                    <td className="adb-muted">{relativeTimeFa(t.at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="adb-skel page-loader-skel" aria-hidden="true">
      <div className="adb-kpis">{Array.from({ length: 6 }, (_, i) => <span className="pls-card" key={i} />)}</div>
      <div className="adb-grid"><span className="pls-card tall adb-span-8" /><span className="pls-card tall adb-span-4" /></div>
      <div className="adb-grid"><span className="pls-card tall adb-span-4" /><span className="pls-card tall adb-span-4" /><span className="pls-card tall adb-span-4" /></div>
    </div>
  );
}
