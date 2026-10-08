"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, XCircle } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/EmptyState";
import { AdminTabBar } from "@/components/admin/TabBar";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { formatDateTime, formatNumber } from "@/lib/adminFormat";
import { CHAT_REPORT_REASON_LABELS, CHAT_REPORT_STATUS_LABELS } from "@/lib/tradeChat";

type ReportStatus = "OPEN" | "ACTIONED" | "DISMISSED";
type Report = {
  id: string; reason: string; note: string | null; status: ReportStatus; createdAt: string;
  reporter: string;
  message: { id: string; symbol: string; body: string; createdAt: string; deleted: boolean; author: string; authorId: string };
};
type Data = { openCount: number; reports: Report[] };

const TABS = ["ACTIONED", "OPEN", "DISMISSED"] as const;
const TAB_LABELS: Record<ReportStatus, string> = {
  ACTIONED: "حذف‌شده (به‌محض گزارش)",
  OPEN: "بررسی‌نشده",
  DISMISSED: "رد شده",
};
const STATUS_BADGE: Record<ReportStatus, "amber" | "red" | "gray"> = { OPEN: "amber", ACTIONED: "red", DISMISSED: "gray" };

// صف گزارش‌های چت ترید. طبق تصمیم ثابت‌شده در app/api/trade/chat/report،
// به‌محض گزارش‌شدن یک پیام همان لحظه حذف (نرم) می‌شود — پس این صفحه بیشتر
// یک آرشیو «چه چیزی گزارش و حذف شد» است تا یک کار در-انتظار؛ نقش اصلی‌اش
// این‌ست که متن کامل پیام را (حتی بعد حذف) به ادمین نشان بدهد تا اگر لازم
// بود از پنل خود کاربر (لینک «نویسنده» پایین) اخطار/بن/غیرفعال‌سازی بدهد.
// گزارش‌های «بررسی‌نشده» احتمالی (مثلا قدیمی‌تر از این قاعده) این‌جا با
// «حذف پیام» یا «رد گزارش» بسته می‌شوند.
export default function AdminChatReportsPage() {
  const toast = useAdminToast();
  const { can } = useAdminAccess();
  const [tab, setTab] = useState<ReportStatus>("ACTIONED");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [acting, setActing] = useState<{ report: Report; action: "delete" | "dismiss" } | null>(null);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    fetch(`/api/admin/chat-reports?status=${tab}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Data) => { if (alive) setData(d); })
      .catch(() => { if (alive) { setFailed(true); setData(null); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tab, reloadKey]);

  async function act() {
    if (!acting) return;
    try {
      await adminFetch("/api/admin/chat-reports", { method: "PATCH", json: { id: acting.report.id, action: acting.action } });
      toast(acting.action === "delete" ? "پیام حذف شد" : "گزارش رد شد");
      setActing(null);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "خطا در انجام درخواست", "err");
    }
  }

  const reports = data?.reports || [];
  const tabItems = TABS.map((t) => ({
    key: t,
    label: t === "OPEN" && data?.openCount ? `${TAB_LABELS[t]} (${formatNumber(data.openCount)})` : TAB_LABELS[t],
  }));

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">گزارش‌های چت</div>
          <div className="admin-section-hint" style={{ margin: 0 }}>
            هر پیام گزارش‌شده همان لحظه از اتاق گفت‌وگو حذف می‌شود — این صفحه متن
            کامل همان پیام‌ها را نشان می‌دهد. اگر نویسنده‌ای مکرر گزارش می‌شود، از
            روی نامش وارد پنل کاربری‌اش شو و اخطار/بن/غیرفعال‌سازی چت را از آن‌جا بده.
          </div>
        </div>
      </div>

      <AdminTabBar items={tabItems} active={tab} onChange={setTab} />

      {!data ? (
        loading || !failed ? <LoadingState /> : <ErrorState onRetry={reload} />
      ) : reports.length === 0 ? (
        <EmptyState message="گزارشی در این دسته نیست" />
      ) : (
        <div className={`trade-list${loading ? " admin-list-dim" : ""}`}>
          {reports.map((r) => (
            <div key={r.id} className="trade-row admin-stack-row">
              <div className="admin-row-top">
                <span className="trade-row-sub">
                  <span className="admin-ltr-inline">{r.message.symbol}</span> · نویسنده:{" "}
                  {can("users.view")
                    ? <Link href={`/admin/users/${r.message.authorId}`} className="admin-link">{r.message.author}</Link>
                    : r.message.author}
                  {" "}· گزارش‌دهنده: {r.reporter} · {CHAT_REPORT_REASON_LABELS[r.reason] || r.reason}
                </span>
                <span className="admin-badge-row">
                  {r.message.deleted && r.status !== "ACTIONED" && <span className="admin-badge red">پیام حذف شده</span>}
                  <span className={`admin-badge ${STATUS_BADGE[r.status] || "gray"}`}>{CHAT_REPORT_STATUS_LABELS[r.status] || r.status}</span>
                </span>
              </div>
              <div className="admin-row-body">{r.message.body}</div>
              {r.note && <div className="trade-row-sub">یادداشت گزارش‌دهنده: {r.note}</div>}
              <div className="admin-row-foot">
                <span className="trade-row-sub admin-ltr">
                  {formatDateTime(r.message.createdAt)}
                </span>
                {r.status === "OPEN" && (
                  <span className="admin-head-actions">
                    <button type="button" className="admin-btn sm" onClick={() => setActing({ report: r, action: "dismiss" })}>
                      <XCircle size={14} /> رد گزارش
                    </button>
                    {!r.message.deleted && (
                      <button type="button" className="admin-btn sm danger" onClick={() => setActing({ report: r, action: "delete" })}>
                        <Trash2 size={14} /> حذف پیام
                      </button>
                    )}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {acting && (
        <ConfirmModal
          title={acting.action === "delete" ? "حذف پیام" : "رد گزارش"}
          message={acting.action === "delete"
            ? "پیام از اتاق گفت‌وگو برداشته می‌شه و همه‌ی گزارش‌های باز همین پیام بسته می‌شن."
            : "گزارش بدون اقدام بسته می‌شه و پیام سر جاش می‌مونه."}
          confirmLabel={acting.action === "delete" ? "حذف پیام" : "رد گزارش"}
          danger={acting.action === "delete"}
          onConfirm={act}
          onClose={() => setActing(null)}
        />
      )}
    </section>
  );
}
