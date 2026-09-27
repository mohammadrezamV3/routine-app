"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Star } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminPagination } from "@/components/admin/Pagination";
import { AdminTabBar } from "@/components/admin/TabBar";
import { displayName } from "@/components/admin/UserAvatar";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { formatDateTime, formatNumber } from "@/lib/adminFormat";

type PublicUser = { id: string; name: string | null; lastName: string | null; username: string | null; avatarUrl: string | null };
type Target =
  | { kind: "USER"; exists: boolean; user: PublicUser | null }
  | { kind: "REVIEW"; exists: boolean; rating: number | null; body: string | null; status: string | null; author: PublicUser | null; mentor: PublicUser | null }
  | { kind: "MESSAGE"; exists: boolean; body: string | null; createdAt: string | null; sender: PublicUser | null }
  | { kind: "PROGRAM"; exists: boolean; title: string | null; type: string | null; status: string | null; mentor: PublicUser | null };
type ReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";
type Report = {
  id: string; targetType: Target["kind"]; targetId: string; reason: string; details: string | null;
  status: ReportStatus; resolution: string | null; resolvedAt: string | null;
  resolvedBy: { name: string | null; lastName: string | null; username: string | null } | null;
  createdAt: string; reporter: PublicUser;
  targetUser: (PublicUser & { mentorProfileId: string | null; mentorSuspended: boolean }) | null;
  target: Target;
};
type Data = { reports: Report[]; total: number; pageSize: number; countByStatus: Record<string, number> };

type Action = "hide_review" | "delete_message" | "suspend_mentor";

const TABS: { key: ReportStatus; label: string }[] = [
  { key: "OPEN", label: "باز" },
  { key: "RESOLVED", label: "رسیدگی‌شده" },
  { key: "DISMISSED", label: "ردشده" },
];
const STATUS_BADGE: Record<ReportStatus, "amber" | "green" | "gray"> = { OPEN: "amber", RESOLVED: "green", DISMISSED: "gray" };
const TARGET_LABELS: Record<Target["kind"], string> = { USER: "کاربر", REVIEW: "نظر", MESSAGE: "پیام چت", PROGRAM: "برنامه" };
const ACTION_LABELS: Record<Action, string> = {
  hide_review: "پنهان کردن نظر",
  delete_message: "حذف پیام",
  suspend_mentor: "تعلیق منتوری صاحب محتوا",
};
const PROGRAM_TYPE: Record<string, string> = { ROUTINE: "روتین", WORKOUT: "تمرینی" };

function availableActions(r: Report): Action[] {
  const a: Action[] = [];
  if (r.target.kind === "REVIEW" && r.target.exists && r.target.status !== "HIDDEN") a.push("hide_review");
  if (r.targetType === "MESSAGE" && r.target.exists) a.push("delete_message");
  if (r.targetUser?.mentorProfileId && !r.targetUser.mentorSuspended) a.push("suspend_mentor");
  return a;
}

function TargetSnippet({ t }: { t: Target }) {
  if (!t.exists) return <div className="trade-row-sub">محتوای هدف دیگه وجود نداره (حذف شده).</div>;
  if (t.kind === "USER") return <div className="trade-row-main">{t.user ? displayName(t.user) : "—"}</div>;
  if (t.kind === "REVIEW") {
    return (
      <>
        <div className="trade-row-sub">
          نظرِ {t.author ? displayName(t.author) : "—"} درباره‌ی {t.mentor ? displayName(t.mentor) : "—"}
          {t.status === "HIDDEN" && " · (پنهان)"}
        </div>
        {t.rating != null && (
          <span style={{ display: "inline-flex", gap: 2, color: "var(--adm-amber)" }} aria-label={`${t.rating} از ۵`}>
            {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} fill={i <= (t.rating || 0) ? "currentColor" : "none"} strokeWidth={1.6} />)}
          </span>
        )}
        <div className="trade-row-main" style={{ whiteSpace: "pre-wrap" }}>{t.body || <span className="admin-muted">بدون متن</span>}</div>
      </>
    );
  }
  if (t.kind === "MESSAGE") {
    return (
      <>
        <div className="trade-row-sub">
          پیامِ {t.sender ? displayName(t.sender) : "—"}
          {t.createdAt && <span style={{ direction: "ltr", display: "inline-block", marginInlineStart: 6 }}>{formatDateTime(t.createdAt)}</span>}
        </div>
        <div className="trade-row-main" style={{ whiteSpace: "pre-wrap" }}>{t.body}</div>
      </>
    );
  }
  return (
    <>
      <div className="trade-row-sub">برنامه‌ی {PROGRAM_TYPE[t.type || ""] || t.type} از {t.mentor ? displayName(t.mentor) : "—"} · {t.status}</div>
      <div className="trade-row-main">{t.title}</div>
    </>
  );
}

// صفِ گزارش‌های اکوسیستم منتور — هر گزارش با خلاصه‌ی محتوای هدف (سمت
// سرور ساخته می‌شه). مسدودکردنِ کلِ حساب از /admin/users انجام می‌شه.
export default function AdminMentorReportsPage() {
  const toast = useAdminToast();
  const { can } = useAdminAccess();
  const [tab, setTab] = useState<ReportStatus>("OPEN");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [acting, setActing] = useState<{ report: Report; mode: "RESOLVED" | "DISMISSED" } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    fetch(`/api/admin/mentors/reports?status=${tab}&page=${page}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Data) => setData(d))
      .catch(() => { setFailed(true); setData(null); })
      .finally(() => setLoading(false));
  }, [tab, page]);
  useEffect(load, [load]);

  const rows = data?.reports || [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const tabItems = TABS.map((t) => ({ key: t.key, label: data?.countByStatus?.[t.key] ? `${t.label} (${formatNumber(data.countByStatus[t.key])})` : t.label }));

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">گزارش‌های منتورها</div>
          <div className="admin-section-hint" style={{ margin: 0 }}>
            رسیدگی با اقدام، بقیه‌ی گزارش‌های بازِ همون محتوا رو هم می‌بنده. برای مسدودکردنِ کلِ حساب، از روی نامِ کاربر وارد پنلش شو.
          </div>
        </div>
      </div>

      <AdminTabBar items={tabItems} active={tab} onChange={(k) => { setTab(k); setPage(1); }} />

      {!data ? (
        <div className={loading ? "admin-empty is-loading" : "admin-empty"}>
          {loading ? "در حال بارگذاری…" : "خطا در دریافت اطلاعات"}
          {!loading && failed && <button type="button" className="admin-btn" style={{ marginTop: 10 }} onClick={load}>تلاش دوباره</button>}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState message="گزارشی در این دسته نیست" />
      ) : (
        <>
          <div className="trade-list" style={{ opacity: loading ? 0.6 : 1 }}>
            {rows.map((r) => (
              <div key={r.id} className="trade-row" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span className="trade-row-sub">
                    {TARGET_LABELS[r.targetType]} · گزارش‌دهنده: {displayName(r.reporter)}
                    {r.targetUser && (
                      <>
                        {" "}· صاحب محتوا:{" "}
                        {r.targetUser.mentorProfileId ? (
                          <Link href={`/admin/mentors/${r.targetUser.mentorProfileId}`} style={{ color: "var(--adm-accent)" }}>{displayName(r.targetUser)}</Link>
                        ) : can("users.view") ? (
                          <Link href={`/admin/users/${r.targetUser.id}`} style={{ color: "var(--adm-accent)" }}>{displayName(r.targetUser)}</Link>
                        ) : displayName(r.targetUser)}
                        {r.targetUser.mentorSuspended && " (منتوری تعلیق)"}
                      </>
                    )}
                  </span>
                  <span className={`admin-badge ${STATUS_BADGE[r.status]}`}>{TABS.find((t) => t.key === r.status)?.label}</span>
                </div>

                <div className="trade-row-sub">دلیل: {r.reason}{r.details ? ` — ${r.details}` : ""}</div>
                <TargetSnippet t={r.target} />

                {r.status !== "OPEN" && (
                  <div className="trade-row-sub">
                    {r.resolution ? `نتیجه: ${r.resolution}` : "بدون توضیح"}
                    {r.resolvedBy && ` · توسط ${displayName(r.resolvedBy)}`}
                    {r.resolvedAt && <span style={{ direction: "ltr", display: "inline-block", marginInlineStart: 6 }}>{formatDateTime(r.resolvedAt)}</span>}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="trade-row-sub" style={{ direction: "ltr" }}>{formatDateTime(r.createdAt)}</span>
                  {r.status === "OPEN" && (
                    <span className="admin-head-actions">
                      <button type="button" className="admin-btn" onClick={() => setActing({ report: r, mode: "DISMISSED" })}><XCircle size={14} /> رد گزارش</button>
                      <button type="button" className="admin-btn primary" onClick={() => setActing({ report: r, mode: "RESOLVED" })}><CheckCircle2 size={14} /> رسیدگی</button>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <AdminPagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {acting && (
        <ResolveModal
          report={acting.report} mode={acting.mode}
          onClose={() => setActing(null)}
          onDone={(msg) => { setActing(null); toast(msg); load(); }}
        />
      )}
    </section>
  );
}

function ResolveModal({ report, mode, onClose, onDone }: { report: Report; mode: "RESOLVED" | "DISMISSED"; onClose: () => void; onDone: (msg: string) => void }) {
  const toast = useAdminToast();
  const actions = mode === "RESOLVED" ? availableActions(report) : [];
  const [action, setAction] = useState<Action | "">("");
  const [resolution, setResolution] = useState("");
  const [busy, setBusy] = useState(false);
  const destructive = action === "delete_message" || action === "suspend_mentor";

  async function submit() {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/mentors/reports/${report.id}`, {
        method: "PATCH",
        json: { status: mode, resolution: resolution.trim() || undefined, action: action || undefined },
      });
      onDone(mode === "DISMISSED" ? "گزارش رد شد" : action ? `${ACTION_LABELS[action]} انجام شد` : "گزارش بسته شد");
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title={mode === "DISMISSED" ? "رد گزارش" : "رسیدگی به گزارش"} eyebrow={TARGET_LABELS[report.targetType]} onClose={onClose}>
      <div className="admin-modal-text">
        {mode === "DISMISSED"
          ? "گزارش بدون هیچ اقدامی روی محتوا بسته می‌شه."
          : "در صورت نیاز یک اقدام انتخاب کن؛ بدون اقدام فقط گزارش بسته می‌شه."}
      </div>
      {mode === "RESOLVED" && (
        <label className="admin-field">
          <span>اقدام</span>
          <select className="admin-input" value={action} onChange={(e) => setAction(e.target.value as Action | "")}>
            <option value="">بدون اقدام</option>
            {actions.map((a) => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
          </select>
        </label>
      )}
      {action === "delete_message" && <div className="admin-form-error">پیام برای همیشه حذف می‌شه و برگشت‌پذیر نیست.</div>}
      <label className="admin-field">
        <span>{action === "hide_review" || action === "suspend_mentor" ? "توضیح (به‌عنوان دلیل ثبت می‌شه؛ خالی = دلیلِ گزارش)" : "توضیح (اختیاری)"}</span>
        <textarea className="admin-input" rows={3} maxLength={500} value={resolution} onChange={(e) => setResolution(e.target.value)} />
      </label>
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" onClick={onClose} disabled={busy}>انصراف</button>
        <button type="button" className={`admin-btn ${destructive ? "danger" : "primary"}`} disabled={busy} onClick={submit}>
          {busy ? "در حال انجام…" : mode === "DISMISSED" ? "رد گزارش" : "ثبت رسیدگی"}
        </button>
      </div>
    </AdminModal>
  );
}
