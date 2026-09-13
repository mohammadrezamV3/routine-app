"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateTime } from "@/lib/adminFormat";

type TicketStatus = "OPEN" | "ANSWERED" | "CLOSED";
type Ticket = {
  id: string; subject: string; status: TicketStatus; updatedAt: string;
  user: { id: string; name: string | null; lastName: string | null; username: string | null; email: string | null; phone: string | null };
  lastMessage: { body: string; fromAdmin: boolean } | null;
};

const TABS = ["OPEN", "ANSWERED", "CLOSED"] as const;
const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  OPEN: "در انتظار پاسخ", ANSWERED: "پاسخ داده‌شده", CLOSED: "بسته‌شده",
};
const STATUS_BADGE: Record<TicketStatus, "amber" | "green" | "gray"> = { OPEN: "amber", ANSWERED: "green", CLOSED: "gray" };

// صفِ تیکت‌های پشتیبانیِ در-سایت. طبقِ همون الگویِ گزارش‌های چت
// (app/admin/chat-reports): تب‌بندی بر اساسِ status + شمارشِ هر تب.
export default function AdminSupportPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("OPEN");
  const [data, setData] = useState<{ countByStatus: Record<string, number>; tickets: Ticket[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/support?status=${tab}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <section>
      <h1>تیکت‌های پشتیبانی</h1>
      <div className="account-content-hint">
        تنها راهِ پشتیبانی همین سایته — هر سوال/مشکلی که کاربرها دارن از همین‌جا میاد.
      </div>

      <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
        {TABS.map((t) => (
          <button
            key={t} type="button"
            className={`admin-btn${tab === t ? " primary" : ""}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
            {!!data?.countByStatus[t] && ` (${data.countByStatus[t]})`}
          </button>
        ))}
      </div>

      {loading && <div className="admin-empty is-loading">در حال بارگذاری…</div>}
      {!loading && !data?.tickets.length && <EmptyState message="تیکتی در این دسته نیست" />}

      <div className="trade-list">
        {data?.tickets.map((t) => {
          const u = t.user;
          const userLabel = [u.name, u.lastName].filter(Boolean).join(" ") || u.username || u.email || u.phone || "کاربر";
          return (
            <Link key={t.id} href={`/admin/support/${t.id}`} className="trade-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8, textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span className="trade-row-sub">{userLabel}</span>
                <span className={`admin-badge ${STATUS_BADGE[t.status]}`}>{TAB_LABELS[t.status]}</span>
              </div>
              <div className="trade-row-main">{t.subject}</div>
              {t.lastMessage && (
                <div className="trade-row-sub" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.lastMessage.fromAdmin ? "ادمین: " : ""}{t.lastMessage.body}
                </div>
              )}
              <div className="trade-row-sub" style={{ direction: "ltr", textAlign: "right" }}>{formatDateTime(t.updatedAt)}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
