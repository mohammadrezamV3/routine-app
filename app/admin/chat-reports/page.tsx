"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateTime } from "@/lib/adminFormat";
import { CHAT_REPORT_REASON_LABELS, CHAT_REPORT_STATUS_LABELS } from "@/lib/tradeChat";

type Report = {
  id: string; reason: string; note: string | null; status: string; createdAt: string;
  reporter: string;
  message: { id: string; symbol: string; body: string; createdAt: string; deleted: boolean; author: string; authorId: string };
};

const TABS = ["ACTIONED", "OPEN", "DISMISSED"] as const;
const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  ACTIONED: "حذف‌شده (به‌محضِ گزارش)",
  OPEN: "بررسی‌نشده",
  DISMISSED: "رد شده",
};

// صفِ گزارش‌های چتِ ترید. طبقِ تصمیمِ ثابت‌شده در app/api/trade/chat/report،
// به‌محضِ گزارش‌شدنِ یک پیام همان لحظه حذف (نرم) می‌شود — پس این صفحه بیشتر
// یک آرشیوِ «چه چیزی گزارش و حذف شد» است تا یک کارِ در-انتظار؛ نقشِ اصلی‌اش
// این‌ست که متنِ کاملِ پیام را (حتی بعدِ حذف) به ادمین نشان بدهد تا اگر لازم
// بود از پنلِ خودِ کاربر (لینکِ «نویسنده» پایین) اخطار/بن/غیرفعال‌سازی بدهد.
export default function AdminChatReportsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("ACTIONED");
  const [data, setData] = useState<{ openCount: number; reports: Report[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/chat-reports?status=${tab}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <section>
      <h1>گزارش‌های چت</h1>
      <div className="account-content-hint">
        هر پیامِ گزارش‌شده همان لحظه از اتاقِ گفت‌وگو حذف می‌شود — این صفحه متنِ
        کاملِ همان پیام‌ها را نشان می‌دهد. اگر نویسنده‌ای مکرر گزارش می‌شود، از
        روی نامش وارد پنلِ کاربری‌اش شو و اخطار/بن/غیرفعال‌سازیِ چت را از آن‌جا بده.
      </div>

      <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
        {TABS.map((t) => (
          <button
            key={t} type="button"
            className={`admin-btn${tab === t ? " primary" : ""}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
            {t === "OPEN" && !!data?.openCount && ` (${data.openCount})`}
          </button>
        ))}
      </div>

      {loading && <div className="admin-empty is-loading">در حال بارگذاری…</div>}
      {!loading && !data?.reports.length && <EmptyState message="گزارشی در این دسته نیست" />}

      <div className="trade-list">
        {data?.reports.map((r) => (
          <div key={r.id} className="trade-row" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span className="trade-row-sub">
                {r.message.symbol} · نویسنده:{" "}
                <Link href={`/admin/users/${r.message.authorId}`} style={{ color: "var(--adm-accent)" }}>
                  {r.message.author}
                </Link>{" "}
                · گزارش‌دهنده: {r.reporter} · {CHAT_REPORT_REASON_LABELS[r.reason] || r.reason}
              </span>
              <span className="admin-badge amber">{CHAT_REPORT_STATUS_LABELS[r.status] || r.status}</span>
            </div>
            <div className="trade-row-main" style={{ whiteSpace: "pre-wrap" }}>{r.message.body}</div>
            {r.note && <div className="trade-row-sub">یادداشتِ گزارش‌دهنده: {r.note}</div>}
            <div className="trade-row-sub" style={{ direction: "ltr", textAlign: "right" }}>
              {formatDateTime(r.message.createdAt)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
