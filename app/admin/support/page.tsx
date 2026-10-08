"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/EmptyState";
import { AdminTabBar } from "@/components/admin/TabBar";
import { formatDateTime, formatNumber } from "@/lib/adminFormat";

type TicketStatus = "OPEN" | "ANSWERED" | "CLOSED";
type TicketUser = { id: string; name: string | null; lastName: string | null; username: string | null; email: string | null; phone: string | null };
type Ticket = {
  id: string; subject: string; status: TicketStatus; updatedAt: string;
  user: TicketUser;
  lastMessage: { body: string; fromAdmin: boolean } | null;
};
type Data = { countByStatus: Record<string, number>; tickets: Ticket[] };

const TABS = ["OPEN", "ANSWERED", "CLOSED"] as const;
const TAB_LABELS: Record<TicketStatus, string> = {
  OPEN: "در انتظار پاسخ", ANSWERED: "پاسخ داده‌شده", CLOSED: "بسته‌شده",
};
const STATUS_BADGE: Record<TicketStatus, "amber" | "green" | "gray"> = { OPEN: "amber", ANSWERED: "green", CLOSED: "gray" };

function userLabel(u: TicketUser) {
  return [u.name, u.lastName].filter(Boolean).join(" ") || u.username || u.email || u.phone || "کاربر";
}

// صف تیکت‌های پشتیبانی در-سایت. طبق همون الگوی گزارش‌های چت
// (app/admin/chat-reports): تب‌بندی بر اساس status + شمارش هر تب.
export default function AdminSupportPage() {
  const [tab, setTab] = useState<TicketStatus>("OPEN");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    // پاسخ تب قبلی اگه دیرتر برسه نباید لیست تب فعلی رو بازنویسی کنه.
    let alive = true;
    setLoading(true);
    setFailed(false);
    fetch(`/api/admin/support?status=${tab}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Data) => { if (alive) setData(d); })
      .catch(() => { if (alive) { setFailed(true); setData(null); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tab, reloadKey]);

  const tickets = data?.tickets || [];
  const tabItems = TABS.map((t) => ({
    key: t,
    label: data?.countByStatus?.[t] ? `${TAB_LABELS[t]} (${formatNumber(data.countByStatus[t])})` : TAB_LABELS[t],
  }));

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">تیکت‌های پشتیبانی</div>
          <div className="admin-section-hint" style={{ margin: 0 }}>
            تنها راه پشتیبانی همین سایته — هر سوال/مشکلی که کاربرها دارن از همین‌جا میاد.
          </div>
        </div>
      </div>

      <AdminTabBar items={tabItems} active={tab} onChange={setTab} />

      {!data ? (
        loading || !failed ? <LoadingState /> : <ErrorState onRetry={retry} />
      ) : tickets.length === 0 ? (
        <EmptyState message="تیکتی در این دسته نیست" />
      ) : (
        <div className={`trade-list${loading ? " admin-list-dim" : ""}`}>
          {tickets.map((t) => (
            <Link key={t.id} href={`/admin/support/${t.id}`} className="trade-row admin-stack-row">
              <div className="admin-row-top">
                <span className="trade-row-sub">{userLabel(t.user)}</span>
                <span className={`admin-badge ${STATUS_BADGE[t.status]}`}>{TAB_LABELS[t.status]}</span>
              </div>
              <div className="trade-row-symbol">{t.subject}</div>
              {t.lastMessage && (
                <div className="trade-row-sub admin-row-clip">
                  {t.lastMessage.fromAdmin ? "ادمین: " : ""}{t.lastMessage.body}
                </div>
              )}
              <div className="trade-row-sub admin-ltr">{formatDateTime(t.updatedAt)}</div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
