"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowRight, BadgeCheck, Ban, CircleSlash, ClipboardList, Copy, Download, ExternalLink, Eye, FileText, Flag, History, Hourglass,
  ImageIcon, Lock, RefreshCw, RotateCcw, ShieldCheck, Star, UserRound, Users, X, XCircle,
} from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminModal, ConfirmModal } from "@/components/admin/AdminModal";
import { UserAvatar, displayName } from "@/components/admin/UserAvatar";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { Spinner } from "@/components/Spinner";
import { MentorRankingBreakdown } from "@/components/admin/MentorRankingBreakdown";
import "@/components/mentor.css";
import { formatDateShort, formatDateTime, formatNumber } from "@/lib/adminFormat";
import { MENTOR_CATEGORY_META, VERIFICATION_LABELS, VERIFICATION_SHORT, isMentorCategory } from "@/lib/mentorCategories";
import { tr } from "@/lib/i18n";

type VStatus = keyof typeof VERIFICATION_LABELS;
type DocKind = "IDENTITY" | "CERTIFICATE";
type Doc = { id: string; kind: DocKind; category: string | null; fileName: string; mimeType: string; sizeBytes: number; createdAt: string };
type Credential = { id: string; category: string; status: VStatus; rejectReason: string | null; reviewedAt: string | null; updatedAt: string };
type Detail = {
  profile: {
    id: string; userId: string; headline: string | null; routineRole?: string | null; bio: string | null; specialties: string[]; categories: string[];
    published: boolean; acceptingStudents: boolean;
    identityStatus: VStatus; identityRejectReason: string | null; identityReviewedAt: string | null;
    suspendedAt: string | null; suspendedReason: string | null; ratingAvg: number; ratingCount: number;
    lastActiveAt: string | null; createdAt: string; updatedAt: string;
    user: { id: string; name: string | null; lastName: string | null; username: string | null; avatarUrl: string | null; isBlocked: boolean; deletedAt: string | null; createdAt: string };
    credentials: Credential[];
    documents: Doc[];
  };
  events: {
    id: string; kind: DocKind; category: string | null; fromStatus: VStatus; toStatus: VStatus; reason: string | null;
    byMentor: boolean; actor: { name: string | null; lastName: string | null; username: string | null } | null; createdAt: string;
  }[];
  stats: { activeStudents: number; totalStudents: number; programs: number; completedPrograms: number; ratingAvg: number; ratingCount: number; hiddenReviews: number };
  openReports: { id: string; targetType: string; reason: string; details: string | null; createdAt: string }[];
};

const V_TONE: Record<VStatus, "green" | "red" | "amber" | "gray"> = { VERIFIED: "green", REJECTED: "red", PENDING: "amber", NOT_PROVIDED: "gray" };
const V_ICON: Record<VStatus, typeof Hourglass> = { VERIFIED: BadgeCheck, REJECTED: XCircle, PENDING: Hourglass, NOT_PROVIDED: CircleSlash };
const V_STATUSES: VStatus[] = ["PENDING", "VERIFIED", "REJECTED", "NOT_PROVIDED"];
// تابع، نه ثابت سطح ماژول: برچسب‌ها موقع رندر به زبان جاری وابسته‌ان.
const targetLabels = (): Record<string, string> => ({ USER: tr("کاربر", "User"), REVIEW: tr("نظر", "Review"), MESSAGE: tr("پیام", "Message"), PROGRAM: tr("برنامه", "Program") });
const I = { size: 15, strokeWidth: 1.75 } as const;
const IS = { size: 14, strokeWidth: 1.75 } as const;

// ردیف‌ها: فقط خط جداکننده (بدون سطح/پس‌زمینه‌ی تازه)
const ROW: React.CSSProperties = { padding: "12px 0", borderBottom: "1px solid var(--adm-border)" };
const ROW_HEAD: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" };
const ROW_TITLE: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 };

function categoryLabel(c: string) {
  return isMentorCategory(c) ? MENTOR_CATEGORY_META[c].label : c;
}
function certLabel(c: string) {
  return isMentorCategory(c) ? MENTOR_CATEGORY_META[c].certLabel : c;
}
function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? tr(`${formatNumber(Math.round((bytes / 1024 / 1024) * 10) / 10)} مگابایت`, `${formatNumber(Math.round((bytes / 1024 / 1024) * 10) / 10)} MB`)
    : tr(`${formatNumber(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`, `${formatNumber(Math.max(1, Math.round(bytes / 1024)))} KB`);
}

function VBadge({ status }: { status: VStatus }) {
  const Icon = V_ICON[status];
  return (
    <span className={`admin-badge ${V_TONE[status]}`} title={VERIFICATION_LABELS[status]}>
      <Icon size={13} strokeWidth={1.75} aria-hidden />{VERIFICATION_SHORT[status]}
    </span>
  );
}

type VerifyTarget = { kind: DocKind; category: string | null; current: VStatus; preset: VStatus };

export default function AdminMentorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useAdminToast();
  const { can, isSuperAdmin } = useAdminAccess();
  const { data: session } = useSession();
  const viewerId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const id = params?.profileId as string;
  const [data, setData] = useState<Detail | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "blocked" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verify, setVerify] = useState<VerifyTarget | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<Doc | null>(null);

  const load = useCallback(() => {
    fetch(`/api/admin/mentors/${id}`)
      .then(async (r) => {
        if (r.status === 404 || r.status === 403) {
          const d = await r.json().catch(() => ({}));
          setErrorMsg((d as { error?: string })?.error || (r.status === 404 ? tr("مربی پیدا نشد", "Mentor not found") : tr("دسترسی به این مربی مجاز نیست", "You don't have access to this mentor")));
          setState("blocked");
          return;
        }
        if (!r.ok) { setState("error"); return; }
        setData(await r.json());
        setState("ok");
      })
      .catch(() => setState("error"));
  }, [id]);
  useEffect(load, [load]);

  if (state === "blocked") return <EmptyState message={errorMsg || tr("مربی پیدا نشد", "Mentor not found")} />;
  if (state === "error" && !data) {
    return (
      <div className="admin-empty">
        <span>{tr("اطلاعات مربی دریافت نشد", "Couldn't load the mentor's details")}</span>
        <button type="button" className="admin-btn" onClick={() => { setState("loading"); load(); }}>
          <RefreshCw {...IS} aria-hidden /> {tr("تلاش دوباره", "Try again")}
        </button>
      </div>
    );
  }
  if (!data) return <div className="admin-empty is-loading" role="status" aria-label={tr("در حال دریافت", "Loading")} />;

  const p = data.profile;
  const u = p.user;
  const isSelf = !!viewerId && viewerId === p.userId;
  // Owner همه‌چیز را، حتی پروفایل خودش را، بررسی می‌کند؛ ادمین محدود روی خودش نه (تضاد منافع — سمت سرور هم بسته است)
  const canReview = isSuperAdmin || !isSelf;
  const categories = Array.from(new Set([...p.categories, ...p.credentials.map((c) => c.category)]));
  const identityDocs = p.documents.filter((d) => d.kind === "IDENTITY");
  const routineRole = p.routineRole && p.categories.includes("ROUTINE") ? p.routineRole : null;

  return (
    <section>
      <button type="button" className="admin-btn" style={{ marginBottom: 16 }} onClick={() => router.back()}>
        <ArrowRight {...IS} className="dir-flip" aria-hidden /> {tr("بازگشت", "Back")}
      </button>

      <div className="admin-chart-card admin-onebox">
      <div className="admin-card admin-user-hero">
        <UserAvatar user={u} size={58} />
        <div className="admin-user-hero-info">
          <div className="admin-user-hero-name">
            {displayName(u)}
            {p.suspendedAt ? <span className="admin-badge red"><Ban size={13} strokeWidth={1.75} aria-hidden />{tr("تعلیق", "Suspended")}</span>
              : p.published ? <span className="admin-badge green">{tr("منتشرشده", "Published")}</span>
              : <span className="admin-badge gray">{tr("منتشرنشده", "Unpublished")}</span>}
            {u.deletedAt ? <span className="admin-badge red">{tr("حساب حذف‌شده", "Deleted account")}</span> : u.isBlocked ? <span className="admin-badge red">{tr("حساب مسدود", "Account blocked")}</span> : null}
            {isSelf && <span className="admin-badge gray">{tr("پروفایل خودت", "Your profile")}</span>}
          </div>
          <div className="admin-user-hero-sub admin-ltr">{u.username ? `@${u.username}` : "—"}</div>
          {p.suspendedAt && (
            <div className="admin-user-hero-sub">
              {tr("تعلیق از ", "Suspended since ")}{formatDateShort(p.suspendedAt)}{p.suspendedReason ? tr(`؛ دلیل: ${p.suspendedReason}`, `; reason: ${p.suspendedReason}`) : ""}
            </div>
          )}
          <button type="button" className="admin-id-chip" onClick={() => { navigator.clipboard?.writeText(p.id).then(() => toast(tr("آیدی پروفایل کپی شد", "Profile ID copied")), () => toast(tr("کپی ناموفق بود", "Copy failed"), "err")); }}>
            <Copy size={12} strokeWidth={1.75} aria-hidden /> <span className="admin-ltr">{p.id}</span>
          </button>
        </div>
        <div className="admin-head-actions">
          {can("users.view") && (
            <Link href={`/admin/users/${u.id}`} className="admin-btn"><UserRound {...IS} aria-hidden /> {tr("حساب کاربری", "User account")}</Link>
          )}
          {!isSelf && (p.suspendedAt
            ? <button type="button" className="admin-btn" onClick={() => setRestoreOpen(true)}><RotateCcw {...IS} aria-hidden /> {tr("رفع تعلیق", "Lift suspension")}</button>
            : <button type="button" className="admin-btn danger" onClick={() => setSuspendOpen(true)}><Ban {...IS} aria-hidden /> {tr("تعلیق مربی‌گری", "Suspend mentoring")}</button>)}
        </div>
      </div>

      <div className="admin-kpi-grid">
        <Kpi icon={<Users size={13} strokeWidth={1.75} aria-hidden />} label={tr("شاگرد فعال", "Active students")} value={formatNumber(data.stats.activeStudents)} sub={tr(`از ${formatNumber(data.stats.totalStudents)} شاگرد`, `of ${formatNumber(data.stats.totalStudents)} ${(data.stats.totalStudents) === 1 ? "student" : "students"}`)} />
        <Kpi icon={<ClipboardList size={13} strokeWidth={1.75} aria-hidden />} label={tr("برنامه‌های ارسالی", "Programs sent")} value={formatNumber(data.stats.programs)} sub={tr(`${formatNumber(data.stats.completedPrograms)} تمام‌شده`, `${formatNumber(data.stats.completedPrograms)} completed`)} />
        <Kpi
          icon={<Star size={13} strokeWidth={1.75} aria-hidden />} label={tr("امتیاز", "Rating")}
          value={data.stats.ratingCount ? data.stats.ratingAvg.toFixed(1) : "—"}
          sub={data.stats.ratingCount ? tr(`${formatNumber(data.stats.ratingCount)} نظر`, `${formatNumber(data.stats.ratingCount)} review(s)`) : tr("بدون نظر", "No reviews")}
        />
        <Kpi icon={<Flag size={13} strokeWidth={1.75} aria-hidden />} label={tr("گزارش باز", "Open reports")} value={formatNumber(data.openReports.length)} sub={tr(`${formatNumber(data.stats.hiddenReviews)} نظر پنهان`, `${formatNumber(data.stats.hiddenReviews)} hidden review(s)`)} />
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title"><UserRound {...I} className="admin-title-icon" style={{ display: "inline-block" }} aria-hidden />{tr("پروفایل مربی‌گری", "Mentor profile")}</span></div>
        <div className="admin-info-grid">
          <InfoRow k={tr("عنوان", "Headline")} v={p.headline} />
          <div className="admin-info-row">
            <span className="admin-muted">{tr("دسته‌ها", "Categories")}</span>
            {p.categories.length === 0 ? <span>—</span> : (
              <span className="admin-badge-row" style={{ justifyContent: "flex-end" }}>
                {p.categories.map((c) => (
                  <span key={c} className="admin-badge gray" title={c === "ROUTINE" && routineRole ? tr(`نقش در روتین: ${routineRole}`, `Role in routine: ${routineRole}`) : undefined}>
                    {categoryLabel(c)}{c === "ROUTINE" && routineRole ? tr(`؛ ${routineRole}`, `; ${routineRole}`) : ""}
                  </span>
                ))}
              </span>
            )}
          </div>
          <InfoRow k={tr("تخصص‌ها", "Specialties")} v={p.specialties.join(tr("، ", ", ")) || null} />
          <InfoRow k={tr("پذیرش شاگرد جدید", "Accepting new students")} v={p.acceptingStudents ? tr("باز", "Open") : tr("بسته", "Closed")} />
          <InfoRow k={tr("آخرین فعالیت", "Last active")} v={p.lastActiveAt ? formatDateTime(p.lastActiveAt) : null} />
          <InfoRow k={tr("مربی از", "Mentor since")} v={formatDateShort(p.createdAt)} />
          <InfoRow k={tr("عضویت در آریون", "Joined Arion")} v={formatDateShort(u.createdAt)} />
        </div>
        {p.bio && <div className="admin-modal-text admin-mentor-bio">{p.bio}</div>}
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head">
          <span className="admin-chart-title"><ShieldCheck {...I} className="admin-title-icon" style={{ display: "inline-block" }} aria-hidden />{tr("احراز هویت و مدارک", "Verification and documents")}</span>
          {!canReview && (
            <span className="admin-muted" style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Lock size={13} strokeWidth={1.75} aria-hidden />{tr("بررسی مدارک خودت فقط با Owner انجام می‌شود", "Only Owner can review your own documents")}
            </span>
          )}
        </div>
        <div>
          <VerificationRow
            title={tr("احراز هویت", "Identity verification")}
            status={p.identityStatus}
            rejectReason={p.identityRejectReason}
            reviewedAt={p.identityReviewedAt}
            docs={identityDocs}
            canReview={canReview}
            onView={setViewDoc}
            onAction={(preset) => setVerify({ kind: "IDENTITY", category: null, current: p.identityStatus, preset })}
          />
          {categories.map((c) => {
            const cred = p.credentials.find((x) => x.category === c);
            const status: VStatus = cred?.status || "NOT_PROVIDED";
            return (
              <VerificationRow
                key={c}
                title={certLabel(c)}
                status={status}
                rejectReason={cred?.rejectReason || null}
                reviewedAt={cred?.reviewedAt || null}
                docs={p.documents.filter((d) => d.kind === "CERTIFICATE" && d.category === c)}
                canReview={canReview}
                onView={setViewDoc}
                onAction={isMentorCategory(c) ? (preset) => setVerify({ kind: "CERTIFICATE", category: c, current: status, preset }) : undefined}
              />
            );
          })}
        </div>
        {categories.length === 0 && <div className="admin-section-hint" style={{ margin: "10px 0 0" }}>{tr("دسته‌ای انتخاب نشده؛ مدرک تخصصی وجود ندارد", "No category selected; there are no credentials")}</div>}
      </div>

      {data.openReports.length > 0 && (
        <div className="admin-chart-card">
          <div className="admin-chart-head">
            <span className="admin-chart-title"><Flag {...I} className="admin-title-icon" style={{ display: "inline-block" }} aria-hidden />{tr("گزارش‌های باز علیه این کاربر", "Open reports against this user")}</span>
            <Link href="/admin/mentors/reports" className="admin-link" style={{ fontSize: 12, fontWeight: 700 }}>{tr("رسیدگی در صف گزارش‌ها", "Handle in the report queue")}</Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>{tr("هدف", "Target")}</th><th>{tr("دلیل", "Reason")}</th><th>{tr("توضیح", "Details")}</th><th>{tr("زمان", "Time")}</th></tr></thead>
              <tbody>
                {data.openReports.map((r) => (
                  <tr key={r.id}>
                    <td>{targetLabels()[r.targetType] || r.targetType}</td>
                    <td>{r.reason}</td>
                    <td className="admin-muted admin-cell-wrap">{r.details || "—"}</td>
                    <td className="admin-ltr">{formatDateTime(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* رتبه‌بندی شایستگی — بخش مستقل (components/admin/MentorRankingBreakdown.tsx) */}
      <MentorRankingBreakdown profileId={p.id} />

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title"><History {...I} className="admin-title-icon" style={{ display: "inline-block" }} aria-hidden />{tr("تاریخچه‌ی احراز", "Verification history")}</span></div>
        {data.events.length === 0 ? <EmptyState message={tr("تغییری ثبت نشده", "No changes recorded")} /> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>{tr("مورد", "Item")}</th><th>{tr("تغییر وضعیت", "Status change")}</th><th>{tr("دلیل", "Reason")}</th><th>{tr("توسط", "By")}</th><th>{tr("زمان", "Time")}</th></tr></thead>
              <tbody>
                {data.events.map((e) => (
                  <tr key={e.id}>
                    <td>{e.kind === "IDENTITY" ? tr("احراز هویت", "Identity verification") : certLabel(e.category || "")}</td>
                    <td>
                      <span className="admin-badge-row">
                        <VBadge status={e.fromStatus} />
                        <span className="admin-muted" aria-label={tr("به", "to")}>{tr("←", "→")}</span>
                        <VBadge status={e.toStatus} />
                      </span>
                    </td>
                    <td className="admin-muted admin-cell-wrap">{e.reason || "—"}</td>
                    <td>{e.byMentor ? tr("خود مربی", "The mentor") : e.actor ? displayName(e.actor) : "—"}</td>
                    <td className="admin-ltr">{formatDateTime(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </div>

      {verify && (
        <VerifyModal
          profileId={p.id}
          target={verify}
          onClose={() => setVerify(null)}
          onDone={() => { setVerify(null); load(); }}
        />
      )}
      {suspendOpen && (
        <SuspendModal profileId={p.id} onClose={() => setSuspendOpen(false)} onDone={() => { setSuspendOpen(false); load(); }} />
      )}
      {restoreOpen && (
        <ConfirmModal
          title={tr("رفع تعلیق مربی‌گری", "Lift mentoring suspension")} danger={false} confirmLabel={tr("رفع تعلیق", "Lift suspension")}
          message={tr("پروفایل مربی‌گری دوباره فعال می‌شود و اگر منتشرشده باشد، در فهرست مربی‌ها نمایش داده می‌شود.", "The mentor profile becomes active again, and if it's published, it shows in the mentor list.")}
          onClose={() => setRestoreOpen(false)}
          onConfirm={async () => {
            // روی خطا مودال باز می‌مونه تا ادمین بدونه اقدام انجام نشده
            try {
              await adminFetch(`/api/admin/mentors/${p.id}/suspend`, { method: "POST", json: { suspend: false } });
            } catch (e: any) {
              toast(e.message, "err");
              return;
            }
            toast(tr("تعلیق برداشته شد", "Suspension lifted"));
            setRestoreOpen(false);
            load();
          }}
        />
      )}
      {viewDoc && <DocumentViewer doc={viewDoc} onClose={() => setViewDoc(null)} />}
    </section>
  );
}

// ---------------------------------------------------------------- اجزا

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="admin-kpi-tile">
      <span className="admin-kpi-label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{icon}{label}</span>
      <span className="admin-kpi-value" style={{ fontSize: 18 }}>{value}</span>
      {sub && <span className="admin-muted" style={{ fontSize: 11.5 }}>{sub}</span>}
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="admin-info-row">
      <span className="admin-muted">{k}</span>
      <span className="admin-info-value">{v || "—"}</span>
    </div>
  );
}

function VerificationRow({
  title, status, rejectReason, reviewedAt, docs, canReview, onView, onAction,
}: {
  title: string; status: VStatus; rejectReason: string | null; reviewedAt: string | null; docs: Doc[];
  canReview: boolean; onView: (d: Doc) => void; onAction?: (preset: VStatus) => void;
}) {
  const meta = [
    reviewedAt ? tr(`آخرین بررسی ${formatDateShort(reviewedAt)}`, `Last reviewed ${formatDateShort(reviewedAt)}`) : null,
    docs.length ? tr(`${formatNumber(docs.length)} فایل`, `${formatNumber(docs.length)} file(s)`) : tr("فایلی ارسال نشده", "No files submitted"),
  ].filter(Boolean).join(tr("؛ ", "; "));

  return (
    <div style={ROW}>
      <div style={ROW_HEAD}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <div style={ROW_TITLE}>
            <span className="admin-perm-label">{title}</span>
            <VBadge status={status} />
          </div>
          <span className="admin-perm-hint" style={{ marginTop: 0 }}>{meta}</span>
        </div>
        {onAction && canReview && (
          <div className="admin-head-actions">
            {status !== "VERIFIED" && docs.length > 0 && (
              <button type="button" className="admin-btn primary" onClick={() => onAction("VERIFIED")}>
                <BadgeCheck {...IS} aria-hidden /> {tr("تایید", "Approve")}
              </button>
            )}
            {(status !== "NOT_PROVIDED" || docs.length > 0) && (
              <button type="button" className="admin-btn danger" onClick={() => onAction("REJECTED")}>
                <X {...IS} aria-hidden /> {tr("رد", "Reject")}
              </button>
            )}
            <button type="button" className="admin-btn" onClick={() => onAction(status === "PENDING" ? "NOT_PROVIDED" : "PENDING")}>
              {tr("تغییر وضعیت", "Change status")}
            </button>
          </div>
        )}
      </div>

      {status === "REJECTED" && rejectReason && (
        <div className="admin-perm-hint" style={{ marginTop: 6 }}>{tr("دلیل رد: ", "Rejection reason: ")}{rejectReason}</div>
      )}

      {docs.length > 0 && (
        <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {docs.map((d) => {
            const DocIcon = d.mimeType === "application/pdf" ? FileText : ImageIcon;
            return (
              <li key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, minWidth: 0 }}>
                <DocIcon size={16} strokeWidth={1.75} className="admin-muted" style={{ flexShrink: 0 }} aria-hidden />
                <span style={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={d.fileName}>
                  {d.fileName}
                </span>
                <span className="admin-muted" style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>
                  {formatSize(d.sizeBytes)}{tr("؛ ", "; ")}{formatDateShort(d.createdAt)}
                </span>
                {canReview && (
                  <button type="button" className="admin-icon-btn" aria-label={tr(`مشاهده‌ی ${d.fileName}`, `View ${d.fileName}`)} onClick={() => onView(d)}>
                    <Eye {...I} aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function VerifyModal({ profileId, target, onClose, onDone }: { profileId: string; target: VerifyTarget; onClose: () => void; onDone: () => void }) {
  const toast = useAdminToast();
  const [status, setStatus] = useState<VStatus>(target.preset);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsReason = status === "REJECTED";
  const unchanged = status === target.current && status !== "REJECTED";
  const title = target.kind === "IDENTITY" ? tr("احراز هویت", "Identity verification") : certLabel(target.category || "");

  async function submit() {
    if (needsReason && !reason.trim()) { setError(tr("دلیل رد الزامی است", "A rejection reason is required")); return; }
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/mentors/${profileId}/verification`, {
        method: "POST",
        json: { kind: target.kind, category: target.category || undefined, status, reason: reason.trim() || undefined },
      });
      toast(tr("وضعیت ثبت شد؛ اعلان برای مربی ارسال شد", "Status saved; a notification was sent to the mentor"));
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title={title} eyebrow={tr("بررسی مدرک", "Document review")} onClose={onClose}>
      <div className="admin-modal-text" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="admin-muted">{tr("وضعیت فعلی", "Current status")}</span>
        <VBadge status={target.current} />
      </div>
      <label className="admin-field">
        <span>{tr("وضعیت جدید", "New status")}</span>
        <select className="admin-input" value={status} onChange={(e) => { setStatus(e.target.value as VStatus); setError(null); }}>
          {V_STATUSES.map((s) => <option key={s} value={s}>{VERIFICATION_LABELS[s]}</option>)}
        </select>
      </label>
      <label className="admin-field" style={{ marginTop: 12 }}>
        <span>{needsReason ? tr("دلیل رد", "Rejection reason") : tr("توضیح (اختیاری)", "Note (optional)")}</span>
        <textarea
          className="admin-input" rows={3} maxLength={500} value={reason}
          placeholder={needsReason ? tr("مثلا تصویر مدرک خوانا نیست", "e.g. the document image isn't readable") : undefined}
          onChange={(e) => { setReason(e.target.value); setError(null); }}
        />
        {needsReason && <span className="admin-perm-hint" style={{ marginTop: 0, fontWeight: 400 }}>{tr("این دلیل برای مربی نمایش داده می‌شود", "This reason is shown to the mentor")}</span>}
      </label>
      {error && <div className="admin-form-error">{error}</div>}
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" onClick={onClose} disabled={busy}>{tr("انصراف", "Cancel")}</button>
        <button
          type="button" className={`admin-btn ${status === "REJECTED" ? "danger" : "primary"}`}
          disabled={busy || unchanged || (needsReason && !reason.trim())} onClick={submit}
          aria-busy={busy}
        >
          {busy ? <Spinner size={14} /> : tr("ثبت وضعیت", "Save status")}
        </button>
      </div>
    </AdminModal>
  );
}

function SuspendModal({ profileId, onClose, onDone }: { profileId: string; onClose: () => void; onDone: () => void }) {
  const toast = useAdminToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/mentors/${profileId}/suspend`, { method: "POST", json: { suspend: true, reason: reason.trim() } });
      toast(tr("مربی‌گری تعلیق شد", "Mentoring suspended"));
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title={tr("تعلیق مربی‌گری", "Suspend mentoring")} eyebrow={tr("تایید اقدام", "Confirm action")} onClose={onClose}>
      <div className="admin-modal-text">
        {tr("پروفایل از فهرست مربی‌ها حذف می‌شود و پذیرش شاگرد و ساخت برنامه بسته می‌شود؛ حساب کاربری فعال می‌ماند.", "The profile is removed from the mentor list, student acceptance and program creation are closed. The user account stays active.")}
      </div>
      <label className="admin-field">
        <span>{tr("دلیل تعلیق", "Reason for suspension")}</span>
        <textarea className="admin-input" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        <span className="admin-perm-hint" style={{ marginTop: 0, fontWeight: 400 }}>{tr("این دلیل برای مربی نمایش داده می‌شود", "This reason is shown to the mentor")}</span>
      </label>
      {error && <div className="admin-form-error">{error}</div>}
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" onClick={onClose} disabled={busy}>{tr("انصراف", "Cancel")}</button>
        <button type="button" className="admin-btn danger" disabled={busy || !reason.trim()} onClick={submit} aria-busy={busy}>
          {busy ? <Spinner size={14} /> : tr("تعلیق مربی‌گری", "Suspend mentoring")}
        </button>
      </div>
    </AdminModal>
  );
}

// نمایشگر مدرک: فایل با fetch (کوکی سشن) گرفته و به blob URL تبدیل می‌شه —
// هیچ آدرس مستقیمی از فایل در DOM نمی‌مونه و بعد از بستن revoke می‌شه.
function DocumentViewer({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [mime, setMime] = useState<string>(doc.mimeType);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    fetch(`/api/admin/mentors/documents/${doc.id}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error((d as any)?.error || tr("فایل دریافت نشد", "Couldn't load the file"));
        }
        const blob = await r.blob();
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setMime(blob.type || doc.mimeType);
        setUrl(objectUrl);
      })
      .catch((e: Error) => { if (!revoked) setError(e.message); });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc.id, doc.mimeType]);

  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf";

  return (
    <AdminModal title={doc.fileName} eyebrow={doc.kind === "IDENTITY" ? tr("مدرک هویت", "Identity document") : certLabel(doc.category || "")} onClose={onClose} wide>
      {error ? (
        <div className="admin-empty">{error}</div>
      ) : !url ? (
        <div className="admin-empty is-loading" role="status" aria-label={tr("در حال دریافت فایل", "Loading file")} />
      ) : isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={doc.fileName} className="admin-doc-image" />
      ) : isPdf ? (
        <div className="admin-empty">
          <FileText size={24} strokeWidth={1.75} aria-hidden />
          <span>{tr("فایل PDF؛ ", "PDF file; ")}{formatSize(doc.sizeBytes)}</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="admin-btn primary">
            <ExternalLink {...IS} aria-hidden /> {tr("باز کردن در زبانه‌ی جدید", "Open in a new tab")}
          </a>
        </div>
      ) : (
        <div className="admin-empty">
          <span>{tr("پیش‌نمایش این نوع فایل ممکن نیست", "This file type can't be previewed")}</span>
          <a href={url} download={doc.fileName} className="admin-btn"><Download {...IS} aria-hidden /> {tr("دریافت فایل", "Download file")}</a>
        </div>
      )}
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" onClick={onClose}>{tr("بستن", "Close")}</button>
      </div>
    </AdminModal>
  );
}
