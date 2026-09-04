"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatCurrencyAmount, formatDateShort, formatDateTime, formatNumber, formatUsdMicros } from "@/lib/adminFormat";

type Detail = {
  user: {
    id: string; name: string | null; lastName: string | null; email: string | null; phone: string | null; username: string | null;
    market: string; locale: string; isSuperAdmin: boolean; isBlocked: boolean; blockedAt: string | null; createdAt: string;
    gender: string | null; birthDate: string | null;
    subscriptions: { id: string; status: string; interval: string; startDate: string; currentPeriodEnd: string; canceledAt: string | null; plan: { nameFa: string; currency: string; priceMonthly: number }; payments: { id: string; amount: number; currency: string; paidAt: string | null; refundedAt: string | null; provider: string }[] }[];
    moduleAccess: { module: string; active: boolean; expiresAt: string | null }[];
    loginEvents: { id: string; provider: string; ip: string | null; createdAt: string }[];
  };
  activity: { dailyEntries: number; exerciseLogs: number; foodLogs: number; tradeEntries: number; roadmaps: number };
  aiUsage: { requests: number; inputTokens: number; outputTokens: number; costUsdMicros: number };
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [data, setData] = useState<Detail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`).then((r) => {
      if (!r.ok) { setNotFound(true); return null; }
      return r.json();
    }).then((d) => d && setData(d));
  }, [id]);

  async function toggleBlock() {
    if (!data) return;
    const next = !data.user.isBlocked;
    if (next && !confirm("این کاربر مسدود بشه؟")) return;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocked: next }),
    });
    if (res.ok) setData({ ...data, user: { ...data.user, isBlocked: next } });
  }

  if (notFound) return <EmptyState message="کاربر پیدا نشد" />;
  if (!data) return <div className="admin-empty is-loading">در حال بارگذاری…</div>;

  const u = data.user;
  const initials = (u.name?.[0] || u.username?.[0] || "?").toUpperCase();

  return (
    <section>
      <button type="button" className="admin-btn" style={{ marginBottom: 16 }} onClick={() => router.back()}>
        <ArrowRight size={14} /> بازگشت
      </button>

      <div className="admin-user-detail-head">
        <span className="admin-avatar-fallback">{initials}</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{[u.name, u.lastName].filter(Boolean).join(" ") || u.username || "بدون نام"}</div>
          <div style={{ fontSize: 12, color: "var(--adm-muted)", direction: "ltr", textAlign: "right" }}>{u.email || u.phone || u.username}</div>
        </div>
        <div style={{ marginRight: "auto", display: "flex", gap: 8 }}>
          {u.isSuperAdmin ? (
            <span className="admin-badge amber">Owner — قابل مسدودکردن نیست</span>
          ) : (
            <button type="button" className={`admin-btn${u.isBlocked ? "" : " danger"}`} onClick={toggleBlock}>
              {u.isBlocked ? "رفع مسدودی" : "مسدودکردن کاربر"}
            </button>
          )}
        </div>
      </div>

      <div className="admin-kpi-grid">
        <div className="admin-kpi-tile"><span className="admin-kpi-label">بازار</span><span className="admin-kpi-value" style={{ fontSize: 14 }}>{u.market === "IRAN" ? "ایران" : "بین‌المللی"}</span></div>
        <div className="admin-kpi-tile"><span className="admin-kpi-label">تاریخ ثبت‌نام</span><span className="admin-kpi-value" style={{ fontSize: 14 }}>{formatDateShort(u.createdAt)}</span></div>
        <div className="admin-kpi-tile"><span className="admin-kpi-label">وضعیت</span><span className="admin-kpi-value" style={{ fontSize: 14 }}>{u.isBlocked ? "مسدود" : "فعال"}</span></div>
        <div className="admin-kpi-tile"><span className="admin-kpi-label">درخواست‌های AI</span><span className="admin-kpi-value" style={{ fontSize: 14 }}>{formatNumber(data.aiUsage.requests)}</span></div>
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">اشتراک‌ها</span></div>
        {u.subscriptions.length === 0 ? <EmptyState /> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>پلن</th><th>وضعیت</th><th>شروع</th><th>پایان دوره</th><th>لغو</th></tr></thead>
              <tbody>
                {u.subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.plan.nameFa}</td>
                    <td>{s.status}</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{formatDateShort(s.startDate)}</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{formatDateShort(s.currentPeriodEnd)}</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{s.canceledAt ? formatDateShort(s.canceledAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">تراکنش‌ها</span></div>
        {u.subscriptions.flatMap((s) => s.payments).length === 0 ? <EmptyState /> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>مبلغ</th><th>درگاه</th><th>تاریخ پرداخت</th><th>وضعیت</th></tr></thead>
              <tbody>
                {u.subscriptions.flatMap((s) => s.payments).map((p) => (
                  <tr key={p.id}>
                    <td>{formatCurrencyAmount(p.amount, p.currency)}</td>
                    <td>{p.provider}</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{p.paidAt ? formatDateShort(p.paidAt) : "—"}</td>
                    <td>{p.refundedAt ? <span className="admin-badge red">بازپرداخت‌شده</span> : <span className="admin-badge green">موفق</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">فعالیت در محصولات</span></div>
        <div className="admin-kpi-grid" style={{ marginBottom: 0 }}>
          <div className="admin-kpi-tile"><span className="admin-kpi-label">روتین</span><span className="admin-kpi-value" style={{ fontSize: 16 }}>{formatNumber(data.activity.dailyEntries)}</span></div>
          <div className="admin-kpi-tile"><span className="admin-kpi-label">بدنسازی</span><span className="admin-kpi-value" style={{ fontSize: 16 }}>{formatNumber(data.activity.exerciseLogs)}</span></div>
          <div className="admin-kpi-tile"><span className="admin-kpi-label">کالری</span><span className="admin-kpi-value" style={{ fontSize: 16 }}>{formatNumber(data.activity.foodLogs)}</span></div>
          <div className="admin-kpi-tile"><span className="admin-kpi-label">ترید</span><span className="admin-kpi-value" style={{ fontSize: 16 }}>{formatNumber(data.activity.tradeEntries)}</span></div>
          <div className="admin-kpi-tile"><span className="admin-kpi-label">رودمپ</span><span className="admin-kpi-value" style={{ fontSize: 16 }}>{formatNumber(data.activity.roadmaps)}</span></div>
        </div>
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">ورودهای اخیر</span></div>
        {u.loginEvents.length === 0 ? <EmptyState /> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>روش ورود</th><th>IP</th><th>زمان</th></tr></thead>
              <tbody>
                {u.loginEvents.map((l) => (
                  <tr key={l.id}><td>{l.provider}</td><td style={{ direction: "ltr", textAlign: "right" }}>{l.ip || "—"}</td><td style={{ direction: "ltr", textAlign: "right" }}>{formatDateTime(l.createdAt)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data.aiUsage.requests > 0 && (
        <div className="admin-chart-card">
          <div className="admin-chart-head"><span className="admin-chart-title">مصرف AI</span></div>
          <div className="admin-section-hint" style={{ marginTop: 0 }}>
            {formatNumber(data.aiUsage.requests)} درخواست · {formatNumber(data.aiUsage.inputTokens + data.aiUsage.outputTokens)} توکن · هزینه تخمینی {formatUsdMicros(data.aiUsage.costUsdMicros)}
          </div>
        </div>
      )}
    </section>
  );
}
