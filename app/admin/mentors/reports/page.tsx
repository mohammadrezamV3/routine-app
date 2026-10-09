"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AlertTriangle, CheckCircle2, CircleSlash, Hourglass, Lock, RefreshCw, Star, X } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminPagination } from "@/components/admin/Pagination";
import { AdminTabBar } from "@/components/admin/TabBar";
import { displayName } from "@/components/admin/UserAvatar";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { Spinner } from "@/components/Spinner";
import { formatDateTime, formatNumber } from "@/lib/adminFormat";
import { tr } from "@/lib/i18n";

type PublicUser = { id: string; name: string | null; lastName: string | null; username: string | null; avatarUrl: string | null };
type Target =
  | { kind: "USER"; exists: boolean; user: PublicUser | null }
  | { kind: "REVIEW"; exists: boolean; rating: number | null; body: string | null; status: string | null; author: PublicUser | null; mentor: PublicUser | null }
  | { kind: "MESSAGE"; exists: boolean; body: string | null; createdAt: string | null; sender: PublicUser | null; verified: boolean }
  | { kind: "PROGRAM"; exists: boolean; title: string | null; type: string | null; status: string | null; mentor: PublicUser | null }
  | { kind: "CONVERSATION"; exists: boolean; mentor: PublicUser | null; student: PublicUser | null;
      messages: { id: string; sender: PublicUser | null; text: string | null; createdAt: string; verified: boolean }[] };
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

// توابع، نه ثابت سطح ماژول: برچسب‌ها موقع رندر به زبان جاری وابسته‌ان.
const tabList = (): { key: ReportStatus; label: string }[] => [
  { key: "OPEN", label: tr("باز", "Open") },
  { key: "RESOLVED", label: tr("رسیدگی‌شده", "Resolved") },
  { key: "DISMISSED", label: tr("ردشده", "Dismissed") },
];
const emptyLabels = (): Record<ReportStatus, string> => ({
  OPEN: tr("گزارش بازی نیست", "No open reports"),
  RESOLVED: tr("گزارش رسیدگی‌شده‌ای نیست", "No resolved reports"),
  DISMISSED: tr("گزارش ردشده‌ای نیست", "No dismissed reports"),
});
const STATUS_BADGE: Record<ReportStatus, "amber" | "green" | "gray"> = { OPEN: "amber", RESOLVED: "green", DISMISSED: "gray" };
const STATUS_ICON: Record<ReportStatus, typeof Hourglass> = { OPEN: Hourglass, RESOLVED: CheckCircle2, DISMISSED: CircleSlash };
const targetLabels = (): Record<Target["kind"], string> => ({
  USER: tr("کاربر", "User"),
  REVIEW: tr("نظر", "Review"),
  MESSAGE: tr("پیام چت", "Chat message"),
  PROGRAM: tr("برنامه", "Program"),
  CONVERSATION: tr("گفت‌وگو", "Conversation"),
});
const actionLabels = (): Record<Action, string> => ({
  hide_review: tr("پنهان کردن نظر", "Hide review"),
  delete_message: tr("حذف پیام", "Delete message"),
  suspend_mentor: tr("تعلیق مربی‌گری صاحب محتوا", "Suspend the content owner's mentoring"),
});
const actionDone = (): Record<Action, string> => ({
  hide_review: tr("نظر پنهان شد و گزارش بسته شد", "Review hidden and report closed"),
  delete_message: tr("پیام حذف شد و گزارش بسته شد", "Message deleted and report closed"),
  suspend_mentor: tr("مربی‌گری تعلیق شد و گزارش بسته شد", "Mentoring suspended and report closed"),
});
const programType = (): Record<string, string> => ({ ROUTINE: tr("روتین", "Routine"), WORKOUT: tr("تمرینی", "Workout") });
const programStatus = (): Record<string, string> => ({
  DRAFT: tr("پیش‌نویس", "Draft"), PENDING: tr("در انتظار پاسخ", "Awaiting reply"), ACCEPTED: tr("پذیرفته‌شده", "Accepted"), REJECTED: tr("ردشده", "Rejected"),
  ACTIVE: tr("در حال اجرا", "Active"), COMPLETED: tr("تمام‌شده", "Completed"), CANCELLED: tr("لغوشده", "Cancelled"),
});
const IS = { size: 14, strokeWidth: 1.75 } as const;
const ROW_LINE: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" };

function availableActions(r: Report): Action[] {
  const a: Action[] = [];
  if (r.target.kind === "REVIEW" && r.target.exists && r.target.status !== "HIDDEN") a.push("hide_review");
  if (r.targetType === "MESSAGE" && r.target.exists) a.push("delete_message");
  if (r.targetUser?.mentorProfileId && !r.targetUser.mentorSuspended) a.push("suspend_mentor");
  return a;
}

function TargetSnippet({ t }: { t: Target }) {
  // پیام گفت‌وگو رمزگذاری سرتاسری دارد: متن فقط از خود گزارش می‌آید، پس حتی
  // پس از حذف پیام هم نمایش داده می‌شود
  if (!t.exists && t.kind !== "MESSAGE" && t.kind !== "CONVERSATION") return <div className="trade-row-sub">{tr("محتوای گزارش‌شده حذف شده است", "The reported content was deleted")}</div>;
  if (t.kind === "USER") return <div className="trade-row-main">{t.user ? displayName(t.user) : "—"}</div>;
  if (t.kind === "REVIEW") {
    return (
      <>
        <div className="trade-row-sub">
          {tr("نظر ", "Review by ")}{t.author ? displayName(t.author) : "—"}{tr(" درباره‌ی ", " about ")}{t.mentor ? displayName(t.mentor) : "—"}
          {t.status === "HIDDEN" && tr("؛ پنهان", "; hidden")}
        </div>
        {t.rating != null && (
          <span style={{ display: "inline-flex", gap: 2, color: "var(--adm-amber)" }} role="img" aria-label={tr(`${formatNumber(t.rating)} از 5`, `${formatNumber(t.rating)} of 5`)}>
            {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} fill={i <= (t.rating || 0) ? "currentColor" : "none"} strokeWidth={1.75} aria-hidden />)}
          </span>
        )}
        <div className="trade-row-main" style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.9 }}>{t.body || <span className="admin-muted">{tr("بدون متن", "No text")}</span>}</div>
      </>
    );
  }
  if (t.kind === "MESSAGE") {
    return (
      <>
        <div className="trade-row-sub">
          {tr("پیام ", "Message from ")}{t.sender ? displayName(t.sender) : "—"}
          {t.createdAt && <span className="admin-ltr" style={{ display: "inline-block", margin: "0 6px" }}>{formatDateTime(t.createdAt)}</span>}
          {!t.exists && tr("؛ حذف‌شده", "; deleted")}
        </div>
        <div className="trade-row-main" style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.9 }}>{t.body || <span className="admin-muted">{tr("متن در دسترس نیست", "Text not available")}</span>}</div>
        <div className="trade-row-sub">
          {t.verified
            ? tr("متن با تعهد رمزنگاری فرستنده تایید شده؛ پیام‌های دیگر این گفت‌وگو برای ادمین قابل خواندن نیست", "The text is verified by the sender's encryption commitment. The admin can't read the other messages in this conversation.")
            : tr("پیام پیش از رمزگذاری سرتاسری ارسال شده و تایید رمزنگاری ندارد", "This message was sent before end-to-end encryption and has no encryption verification.")}
        </div>
      </>
    );
  }
  if (t.kind === "CONVERSATION") {
    const allVerified = t.messages.every((m) => m.verified);
    return (
      <>
        <div className="trade-row-sub">
          {tr("گفت‌وگوی ", "Conversation between ")}{t.mentor ? displayName(t.mentor) : "—"}{tr(" (مربی) و ", " (mentor) and ")}{t.student ? displayName(t.student) : "—"}{tr(" (شاگرد)؛ ", " (student); ")}{tr(`${formatNumber(t.messages.length)} پیام پیوست`, `${formatNumber(t.messages.length)} attached message(s)`)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
          {t.messages.map((m) => (
            <div key={m.id}>
              <div className="trade-row-sub">
                {m.sender ? displayName(m.sender) : "—"}
                <span className="admin-ltr" style={{ display: "inline-block", margin: "0 6px" }}>{formatDateTime(m.createdAt)}</span>
                {!m.verified && tr("؛ بدون تایید رمزنگاری", "; no encryption verification")}
              </div>
              <div className="trade-row-main" style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.9 }}>{m.text || <span className="admin-muted">{tr("متن در دسترس نیست", "Text not available")}</span>}</div>
            </div>
          ))}
        </div>
        <div className="trade-row-sub">
          {allVerified
            ? tr("هر پیام با تعهد رمزنگاری فرستنده‌اش تایید شده؛ پیام‌های دیگر این گفت‌وگو برای ادمین قابل خواندن نیست", "Each message is verified by its sender's encryption commitment. The admin can't read the other messages in this conversation.")
            : tr("بعضی پیام‌ها پیش از رمزگذاری سرتاسری ارسال شده‌اند و تایید رمزنگاری ندارند", "Some messages were sent before end-to-end encryption and have no encryption verification.")}
        </div>
      </>
    );
  }
  return (
    <>
      <div className="trade-row-sub">
        {tr("برنامه‌ی ", "Program ")}{programType()[t.type || ""] || t.type}{tr(" از ", " by ")}{t.mentor ? displayName(t.mentor) : "—"}
        {t.status && `${tr("؛ ", "; ")}${programStatus()[t.status] || t.status}`}
      </div>
      <div className="trade-row-main">{t.title}</div>
    </>
  );
}

// صف گزارش‌های اکوسیستم منتور — هر گزارش با خلاصه‌ی محتوای هدف (سمت
// سرور ساخته می‌شه). مسدودکردن کل حساب از /admin/users انجام می‌شه.
export default function AdminMentorReportsPage() {
  const toast = useAdminToast();
  const { can } = useAdminAccess();
  const { data: session } = useSession();
  const viewerId = (session?.user as { id?: string } | undefined)?.id ?? null;
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
  const tabItems = tabList().map((t) => ({ key: t.key, label: data?.countByStatus?.[t.key] ? `${t.label} (${formatNumber(data.countByStatus[t.key])})` : t.label }));

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">{tr("گزارش‌های مربی‌ها", "Mentor reports")}</div>
        </div>
      </div>

      <AdminTabBar items={tabItems} active={tab} onChange={(k) => { setTab(k); setPage(1); }} />

      {!data ? (
        loading ? (
          <div className="admin-empty is-loading" role="status" aria-label={tr("در حال دریافت", "Loading")} />
        ) : failed ? (
          <div className="admin-empty">
            <span>{tr("گزارش‌ها دریافت نشد", "Couldn't load the reports")}</span>
            <button type="button" className="admin-btn" onClick={load}><RefreshCw {...IS} aria-hidden /> {tr("تلاش دوباره", "Try again")}</button>
          </div>
        ) : null
      ) : rows.length === 0 ? (
        <EmptyState message={emptyLabels()[tab]} />
      ) : (
        <>
          <div className="trade-list" style={{ opacity: loading ? 0.6 : 1 }}>
            {rows.map((r) => {
              const StatusIcon = STATUS_ICON[r.status];
              const aboutSelf = !!viewerId && r.targetUser?.id === viewerId;
              return (
                <div key={r.id} className="trade-row" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                  <div style={ROW_LINE}>
                    <span className="trade-row-sub">
                      {targetLabels()[r.targetType]}{tr("؛ گزارش‌دهنده: ", "; reporter: ")}{displayName(r.reporter)}
                      {r.targetUser && (
                        <>
                          {tr("؛ صاحب محتوا: ", "; content owner: ")}
                          {r.targetUser.mentorProfileId ? (
                            <Link href={`/admin/mentors/${r.targetUser.mentorProfileId}`} className="admin-link">{displayName(r.targetUser)}</Link>
                          ) : can("users.view") ? (
                            <Link href={`/admin/users/${r.targetUser.id}`} className="admin-link">{displayName(r.targetUser)}</Link>
                          ) : displayName(r.targetUser)}
                        </>
                      )}
                    </span>
                    <span className="admin-badge-row">
                      {r.targetUser?.mentorSuspended && <span className="admin-badge red">{tr("مربی‌گری تعلیق", "Mentoring suspended")}</span>}
                      <span className={`admin-badge ${STATUS_BADGE[r.status]}`}>
                        <StatusIcon size={13} strokeWidth={1.75} aria-hidden />{tabList().find((t) => t.key === r.status)?.label}
                      </span>
                    </span>
                  </div>

                  <div className="trade-row-sub">{tr("دلیل: ", "Reason: ")}{r.reason}{r.details ? `${tr("؛ ", "; ")}${r.details}` : ""}</div>
                  <TargetSnippet t={r.target} />

                  {r.status !== "OPEN" && (
                    <div className="trade-row-sub">
                      {r.resolution ? `${tr("نتیجه: ", "Result: ")}${r.resolution}` : tr("بدون توضیح", "No note")}
                      {r.resolvedBy && `${tr("؛ ", "; ")}${displayName(r.resolvedBy)}`}
                      {r.resolvedAt && <span className="admin-ltr" style={{ display: "inline-block", margin: "0 6px" }}>{formatDateTime(r.resolvedAt)}</span>}
                    </div>
                  )}

                  <div style={ROW_LINE}>
                    <span className="trade-row-sub admin-ltr">{formatDateTime(r.createdAt)}</span>
                    {r.status === "OPEN" && (aboutSelf ? (
                      <span className="trade-row-sub" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Lock size={13} strokeWidth={1.75} aria-hidden />{tr("گزارش علیه خودت؛ رسیدگی با ادمین دیگر", "A report against you; another admin will handle it")}
                      </span>
                    ) : (
                      <span className="admin-head-actions">
                        <button type="button" className="admin-btn" onClick={() => setActing({ report: r, mode: "DISMISSED" })}>
                          <X {...IS} aria-hidden /> {tr("رد گزارش", "Dismiss report")}
                        </button>
                        <button type="button" className="admin-btn primary" onClick={() => setActing({ report: r, mode: "RESOLVED" })}>
                          <CheckCircle2 {...IS} aria-hidden /> {tr("رسیدگی", "Resolve")}
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
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
  const actions = mode === "RESOLVED" ? availableActions(report) : [];
  const [action, setAction] = useState<Action | "">("");
  const [resolution, setResolution] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const destructive = action === "delete_message" || action === "suspend_mentor";

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/mentors/reports/${report.id}`, {
        method: "PATCH",
        json: { status: mode, resolution: resolution.trim() || undefined, action: action || undefined },
      });
      onDone(mode === "DISMISSED" ? tr("گزارش رد شد", "Report dismissed") : action ? actionDone()[action] : tr("گزارش بسته شد", "Report closed"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title={mode === "DISMISSED" ? tr("رد گزارش", "Dismiss report") : tr("رسیدگی به گزارش", "Resolve report")} eyebrow={targetLabels()[report.targetType]} onClose={onClose}>
      <div className="admin-modal-text">
        {mode === "DISMISSED"
          ? tr("گزارش بدون اقدام روی محتوا بسته می‌شود.", "The report is closed without any action on the content.")
          : tr("بدون انتخاب اقدام، فقط گزارش بسته می‌شود.", "Without choosing an action, only the report is closed.")}
      </div>
      {mode === "RESOLVED" && (
        <label className="admin-field">
          <span>{tr("اقدام", "Action")}</span>
          <select className="admin-input" value={action} onChange={(e) => { setAction(e.target.value as Action | ""); setError(null); }}>
            <option value="">{tr("بدون اقدام", "No action")}</option>
            {actions.map((a) => <option key={a} value={a}>{actionLabels()[a]}</option>)}
          </select>
        </label>
      )}
      {action === "delete_message" && (
        <div className="admin-form-error" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={13} strokeWidth={1.75} aria-hidden />{tr("پیام برای همیشه حذف می‌شود و برگشت‌پذیر نیست", "The message will be deleted permanently and can't be undone")}
        </div>
      )}
      <label className="admin-field" style={{ marginTop: 12 }}>
        <span>{action === "hide_review" || action === "suspend_mentor" ? tr("دلیل", "Reason") : tr("توضیح (اختیاری)", "Note (optional)")}</span>
        <textarea className="admin-input" rows={3} maxLength={500} value={resolution} onChange={(e) => { setResolution(e.target.value); setError(null); }} />
        {(action === "hide_review" || action === "suspend_mentor") && (
          <span className="admin-perm-hint" style={{ marginTop: 0, fontWeight: 400 }}>{tr("اگر خالی بماند، دلیل گزارش ثبت می‌شود", "If left empty, the report's reason is recorded")}</span>
        )}
      </label>
      {error && <div className="admin-form-error">{error}</div>}
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" onClick={onClose} disabled={busy}>{tr("انصراف", "Cancel")}</button>
        <button type="button" className={`admin-btn ${destructive ? "danger" : "primary"}`} disabled={busy} onClick={submit} aria-busy={busy}>
          {busy ? <Spinner size={14} /> : mode === "DISMISSED" ? tr("رد گزارش", "Dismiss report") : tr("ثبت رسیدگی", "Submit resolution")}
        </button>
      </div>
    </AdminModal>
  );
}
