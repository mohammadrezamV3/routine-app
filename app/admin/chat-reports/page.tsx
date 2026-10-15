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
import { tr } from "@/lib/i18n";

type ReportStatus = "OPEN" | "ACTIONED" | "DISMISSED";
type Report = {
  id: string; reason: string; note: string | null; status: ReportStatus; createdAt: string;
  reporter: string;
  message: { id: string; symbol: string; body: string; createdAt: string; deleted: boolean; author: string; authorId: string };
};
type Data = { openCount: number; reports: Report[] };

const TABS = ["ACTIONED", "OPEN", "DISMISSED"] as const;
const tabLabels = (): Record<ReportStatus, string> => ({
  ACTIONED: tr("حذف‌شده (به‌محض گزارش)", "Deleted (on report)"),
  OPEN: tr("بررسی‌نشده", "Not reviewed"),
  DISMISSED: tr("رد شده", "Dismissed"),
});
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
      toast(acting.action === "delete" ? tr("پیام حذف شد", "Message deleted") : tr("گزارش رد شد", "Report dismissed"));
      setActing(null);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : tr("خطا در انجام درخواست", "Couldn't complete the request"), "err");
    }
  }

  const reports = data?.reports || [];
  const labels = tabLabels();
  const tabItems = TABS.map((t) => ({
    key: t,
    label: t === "OPEN" && data?.openCount ? `${labels[t]} (${formatNumber(data.openCount)})` : labels[t],
  }));

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">{tr("گزارش‌های چت", "Chat reports")}</div>
          <div className="admin-section-hint" style={{ margin: 0 }}>
            {tr(
              "هر پیام گزارش‌شده همان لحظه از اتاق گفت‌وگو حذف می‌شود — این صفحه متن کامل همان پیام‌ها را نشان می‌دهد. اگر نویسنده‌ای مکرر گزارش می‌شود، از روی نامش وارد پنل کاربری‌اش شو و اخطار/بن/غیرفعال‌سازی چت را از آن‌جا بده.",
              "Every reported message is removed from the chat room right away. This page shows the full text of those messages. If an author is reported repeatedly, open their user panel from their name and issue a warning, ban or chat disable from there.",
            )}
          </div>
        </div>
      </div>

      <AdminTabBar items={tabItems} active={tab} onChange={setTab} />

      {!data ? (
        loading || !failed ? <LoadingState /> : <ErrorState onRetry={reload} />
      ) : reports.length === 0 ? (
        <EmptyState message={tr("گزارشی در این دسته نیست", "No reports in this category")} />
      ) : (
        <div className={`trade-list${loading ? " admin-list-dim" : ""}`}>
          {reports.map((r) => (
            <div key={r.id} className="trade-row admin-stack-row">
              <div className="admin-row-top">
                <span className="trade-row-sub">
                  <span className="admin-ltr-inline">{r.message.symbol}</span> · {tr("نویسنده:", "Author:")}{" "}
                  {can("users.view")
                    ? <Link href={`/admin/users/${r.message.authorId}`} className="admin-link">{r.message.author}</Link>
                    : r.message.author}
                  {" "}· {tr("گزارش‌دهنده:", "Reporter:")} {r.reporter} · {CHAT_REPORT_REASON_LABELS[r.reason] || r.reason}
                </span>
                <span className="admin-badge-row">
                  {r.message.deleted && r.status !== "ACTIONED" && <span className="admin-badge red">{tr("پیام حذف شده", "Message deleted")}</span>}
                  <span className={`admin-badge ${STATUS_BADGE[r.status] || "gray"}`}>{CHAT_REPORT_STATUS_LABELS[r.status] || r.status}</span>
                </span>
              </div>
              <div className="admin-row-body">{r.message.body}</div>
              {r.note && <div className="trade-row-sub">{tr("یادداشت گزارش‌دهنده:", "Reporter's note:")} {r.note}</div>}
              <div className="admin-row-foot">
                <span className="trade-row-sub admin-ltr">
                  {formatDateTime(r.message.createdAt)}
                </span>
                {r.status === "OPEN" && (
                  <span className="admin-head-actions">
                    <button type="button" className="admin-btn sm" onClick={() => setActing({ report: r, action: "dismiss" })}>
                      <XCircle size={14} /> {tr("رد گزارش", "Dismiss report")}
                    </button>
                    {!r.message.deleted && (
                      <button type="button" className="admin-btn sm danger" onClick={() => setActing({ report: r, action: "delete" })}>
                        <Trash2 size={14} /> {tr("حذف پیام", "Delete message")}
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
          title={acting.action === "delete" ? tr("حذف پیام", "Delete message") : tr("رد گزارش", "Dismiss report")}
          message={acting.action === "delete"
            ? tr("پیام از اتاق گفت‌وگو برداشته می‌شه و همه‌ی گزارش‌های باز همین پیام بسته می‌شن.", "The message will be removed from the chat room, and all open reports for it will be closed.")
            : tr("گزارش بدون اقدام بسته می‌شه و پیام سر جاش می‌مونه.", "The report will be closed without action, and the message stays where it is.")}
          confirmLabel={acting.action === "delete" ? tr("حذف پیام", "Delete message") : tr("رد گزارش", "Dismiss report")}
          danger={acting.action === "delete"}
          onConfirm={act}
          onClose={() => setActing(null)}
        />
      )}
    </section>
  );
}
