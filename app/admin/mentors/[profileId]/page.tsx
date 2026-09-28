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
const TARGET_LABELS: Record<string, string> = { USER: "کاربر", REVIEW: "نظر", MESSAGE: "پیام", PROGRAM: "برنامه" };
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
    ? `${formatNumber(Math.round((bytes / 1024 / 1024) * 10) / 10)} مگابایت`
    : `${formatNumber(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`;
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
          setErrorMsg((d as { error?: string })?.error || (r.status === 404 ? "منتور پیدا نشد" : "دسترسی به این منتور مجاز نیست"));
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

  if (state === "blocked") return <EmptyState message={errorMsg || "منتور پیدا نشد"} />;
  if (state === "error" && !data) {
    return (
      <div className="admin-empty">
        <span>اطلاعات منتور دریافت نشد</span>
        <button type="button" className="admin-btn" onClick={() => { setState("loading"); load(); }}>
          <RefreshCw {...IS} aria-hidden /> تلاش دوباره
        </button>
      </div>
    );
  }
  if (!data) return <div className="admin-empty is-loading" role="status" aria-label="در حال دریافت" />;

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
        <ArrowRight {...IS} aria-hidden /> بازگشت
      </button>

      <div className="admin-chart-card admin-onebox">
      <div className="admin-card admin-user-hero">
        <UserAvatar user={u} size={58} />
        <div className="admin-user-hero-info">
          <div className="admin-user-hero-name">
            {displayName(u)}
            {p.suspendedAt ? <span className="admin-badge red"><Ban size={13} strokeWidth={1.75} aria-hidden />تعلیق</span>
              : p.published ? <span className="admin-badge green">منتشرشده</span>
              : <span className="admin-badge gray">منتشرنشده</span>}
            {u.deletedAt ? <span className="admin-badge red">حساب حذف‌شده</span> : u.isBlocked ? <span className="admin-badge red">حساب مسدود</span> : null}
            {isSelf && <span className="admin-badge gray">پروفایل خودت</span>}
          </div>
          <div className="admin-user-hero-sub admin-ltr">{u.username ? `@${u.username}` : "—"}</div>
          {p.suspendedAt && (
            <div className="admin-user-hero-sub">
              تعلیق از {formatDateShort(p.suspendedAt)}{p.suspendedReason ? `؛ دلیل: ${p.suspendedReason}` : ""}
            </div>
          )}
          <button type="button" className="admin-id-chip" onClick={() => { navigator.clipboard?.writeText(p.id); toast("آیدی پروفایل کپی شد"); }}>
            <Copy size={12} strokeWidth={1.75} aria-hidden /> <span className="admin-ltr">{p.id}</span>
          </button>
        </div>
        <div className="admin-head-actions">
          {can("users.view") && (
            <Link href={`/admin/users/${u.id}`} className="admin-btn"><UserRound {...IS} aria-hidden /> حساب کاربری</Link>
          )}
          {!isSelf && (p.suspendedAt
            ? <button type="button" className="admin-btn" onClick={() => setRestoreOpen(true)}><RotateCcw {...IS} aria-hidden /> رفع تعلیق</button>
            : <button type="button" className="admin-btn danger" onClick={() => setSuspendOpen(true)}><Ban {...IS} aria-hidden /> تعلیق منتوری</button>)}
        </div>
      </div>

      <div className="admin-kpi-grid">
        <Kpi icon={<Users size={13} strokeWidth={1.75} aria-hidden />} label="شاگرد فعال" value={formatNumber(data.stats.activeStudents)} sub={`از ${formatNumber(data.stats.totalStudents)} شاگرد`} />
        <Kpi icon={<ClipboardList size={13} strokeWidth={1.75} aria-hidden />} label="برنامه‌های ارسالی" value={formatNumber(data.stats.programs)} sub={`${formatNumber(data.stats.completedPrograms)} تمام‌شده`} />
        <Kpi
          icon={<Star size={13} strokeWidth={1.75} aria-hidden />} label="امتیاز"
          value={data.stats.ratingCount ? data.stats.ratingAvg.toFixed(1) : "—"}
          sub={data.stats.ratingCount ? `${formatNumber(data.stats.ratingCount)} نظر` : "بدون نظر"}
        />
        <Kpi icon={<Flag size={13} strokeWidth={1.75} aria-hidden />} label="گزارش باز" value={formatNumber(data.openReports.length)} sub={`${formatNumber(data.stats.hiddenReviews)} نظر پنهان`} />
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title"><UserRound {...I} className="admin-title-icon" style={{ display: "inline-block" }} aria-hidden />پروفایل منتوری</span></div>
        <div className="admin-info-grid">
          <InfoRow k="عنوان" v={p.headline} />
          <div className="admin-info-row">
            <span className="admin-muted">دسته‌ها</span>
            {p.categories.length === 0 ? <span>—</span> : (
              <span className="admin-badge-row" style={{ justifyContent: "flex-end" }}>
                {p.categories.map((c) => (
                  <span key={c} className="admin-badge gray" title={c === "ROUTINE" && routineRole ? `نقش در روتین: ${routineRole}` : undefined}>
                    {categoryLabel(c)}{c === "ROUTINE" && routineRole ? `؛ ${routineRole}` : ""}
                  </span>
                ))}
              </span>
            )}
          </div>
          <InfoRow k="تخصص‌ها" v={p.specialties.join("، ") || null} />
          <InfoRow k="پذیرش شاگرد جدید" v={p.acceptingStudents ? "باز" : "بسته"} />
          <InfoRow k="آخرین فعالیت" v={p.lastActiveAt ? formatDateTime(p.lastActiveAt) : null} />
          <InfoRow k="منتور از" v={formatDateShort(p.createdAt)} />
          <InfoRow k="عضویت در آریون" v={formatDateShort(u.createdAt)} />
        </div>
        {p.bio && <div className="admin-modal-text" style={{ whiteSpace: "pre-wrap", marginTop: 12, marginBottom: 0 }}>{p.bio}</div>}
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head">
          <span className="admin-chart-title"><ShieldCheck {...I} className="admin-title-icon" style={{ display: "inline-block" }} aria-hidden />احراز هویت و مدارک</span>
          {!canReview && (
            <span className="admin-muted" style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Lock size={13} strokeWidth={1.75} aria-hidden />بررسی مدارک خودت فقط با Owner انجام می‌شود
            </span>
          )}
        </div>
        <div>
          <VerificationRow
            title="احراز هویت"
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
        {categories.length === 0 && <div className="admin-section-hint" style={{ margin: "10px 0 0" }}>دسته‌ای انتخاب نشده؛ مدرک تخصصی وجود ندارد</div>}
      </div>

      {data.openReports.length > 0 && (
        <div className="admin-chart-card">
          <div className="admin-chart-head">
            <span className="admin-chart-title"><Flag {...I} className="admin-title-icon" style={{ display: "inline-block" }} aria-hidden />گزارش‌های باز علیه این کاربر</span>
            <Link href="/admin/mentors/reports" className="admin-link" style={{ fontSize: 12, fontWeight: 700 }}>رسیدگی در صف گزارش‌ها</Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>هدف</th><th>دلیل</th><th>توضیح</th><th>زمان</th></tr></thead>
              <tbody>
                {data.openReports.map((r) => (
                  <tr key={r.id}>
                    <td>{TARGET_LABELS[r.targetType] || r.targetType}</td>
                    <td>{r.reason}</td>
                    <td className="admin-muted" style={{ whiteSpace: "normal" }}>{r.details || "—"}</td>
                    <td className="admin-ltr">{formatDateTime(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* رتبه‌بندیِ شایستگی — بخشِ مستقل (components/admin/MentorRankingBreakdown.tsx) */}
      <MentorRankingBreakdown profileId={p.id} />

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title"><History {...I} className="admin-title-icon" style={{ display: "inline-block" }} aria-hidden />تاریخچه‌ی احراز</span></div>
        {data.events.length === 0 ? <EmptyState message="تغییری ثبت نشده" /> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>مورد</th><th>تغییر وضعیت</th><th>دلیل</th><th>توسط</th><th>زمان</th></tr></thead>
              <tbody>
                {data.events.map((e) => (
                  <tr key={e.id}>
                    <td>{e.kind === "IDENTITY" ? "احراز هویت" : certLabel(e.category || "")}</td>
                    <td>
                      <span className="admin-badge-row">
                        <VBadge status={e.fromStatus} />
                        <span className="admin-muted" aria-label="به">←</span>
                        <VBadge status={e.toStatus} />
                      </span>
                    </td>
                    <td className="admin-muted" style={{ whiteSpace: "normal" }}>{e.reason || "—"}</td>
                    <td>{e.byMentor ? "خود منتور" : e.actor ? displayName(e.actor) : "—"}</td>
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
          title="رفع تعلیق منتوری" danger={false} confirmLabel="رفع تعلیق"
          message="پروفایل منتوری دوباره فعال می‌شود و اگر منتشرشده باشد، در فهرست منتورها نمایش داده می‌شود."
          onClose={() => setRestoreOpen(false)}
          onConfirm={async () => {
            try {
              await adminFetch(`/api/admin/mentors/${p.id}/suspend`, { method: "POST", json: { suspend: false } });
              toast("تعلیق برداشته شد");
              load();
            } catch (e: any) { toast(e.message, "err"); }
            setRestoreOpen(false);
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
      <span style={{ textAlign: "left" }}>{v || "—"}</span>
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
    reviewedAt ? `آخرین بررسی ${formatDateShort(reviewedAt)}` : null,
    docs.length ? `${formatNumber(docs.length)} فایل` : "فایلی ارسال نشده",
  ].filter(Boolean).join("؛ ");

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
                <BadgeCheck {...IS} aria-hidden /> تأیید
              </button>
            )}
            {(status !== "NOT_PROVIDED" || docs.length > 0) && (
              <button type="button" className="admin-btn danger" onClick={() => onAction("REJECTED")}>
                <X {...IS} aria-hidden /> رد
              </button>
            )}
            <button type="button" className="admin-btn" onClick={() => onAction(status === "PENDING" ? "NOT_PROVIDED" : "PENDING")}>
              تغییر وضعیت
            </button>
          </div>
        )}
      </div>

      {status === "REJECTED" && rejectReason && (
        <div className="admin-perm-hint" style={{ marginTop: 6 }}>دلیل رد: {rejectReason}</div>
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
                  {formatSize(d.sizeBytes)}؛ {formatDateShort(d.createdAt)}
                </span>
                {canReview && (
                  <button type="button" className="admin-icon-btn" aria-label={`مشاهده‌ی ${d.fileName}`} onClick={() => onView(d)}>
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
  const title = target.kind === "IDENTITY" ? "احراز هویت" : certLabel(target.category || "");

  async function submit() {
    if (needsReason && !reason.trim()) { setError("دلیل رد الزامی است"); return; }
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/mentors/${profileId}/verification`, {
        method: "POST",
        json: { kind: target.kind, category: target.category || undefined, status, reason: reason.trim() || undefined },
      });
      toast("وضعیت ثبت شد؛ اعلان برای منتور ارسال شد");
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title={title} eyebrow="بررسی مدرک" onClose={onClose}>
      <div className="admin-modal-text" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="admin-muted">وضعیت فعلی</span>
        <VBadge status={target.current} />
      </div>
      <label className="admin-field">
        <span>وضعیت جدید</span>
        <select className="admin-input" value={status} onChange={(e) => { setStatus(e.target.value as VStatus); setError(null); }}>
          {V_STATUSES.map((s) => <option key={s} value={s}>{VERIFICATION_LABELS[s]}</option>)}
        </select>
      </label>
      <label className="admin-field" style={{ marginTop: 12 }}>
        <span>{needsReason ? "دلیل رد" : "توضیح (اختیاری)"}</span>
        <textarea
          className="admin-input" rows={3} maxLength={500} value={reason}
          placeholder={needsReason ? "مثلاً تصویر مدرک خوانا نیست" : undefined}
          onChange={(e) => { setReason(e.target.value); setError(null); }}
        />
        {needsReason && <span className="admin-perm-hint" style={{ marginTop: 0, fontWeight: 400 }}>این دلیل برای منتور نمایش داده می‌شود</span>}
      </label>
      {error && <div className="admin-form-error">{error}</div>}
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" onClick={onClose} disabled={busy}>انصراف</button>
        <button
          type="button" className={`admin-btn ${status === "REJECTED" ? "danger" : "primary"}`}
          disabled={busy || unchanged || (needsReason && !reason.trim())} onClick={submit}
          aria-busy={busy}
        >
          {busy ? <Spinner size={14} /> : "ثبت وضعیت"}
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
      toast("منتوری تعلیق شد");
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title="تعلیق منتوری" eyebrow="تأیید اقدام" onClose={onClose}>
      <div className="admin-modal-text">
        پروفایل از فهرست منتورها حذف می‌شود و پذیرش شاگرد و ساخت برنامه بسته می‌شود؛ حساب کاربری فعال می‌ماند.
      </div>
      <label className="admin-field">
        <span>دلیل تعلیق</span>
        <textarea className="admin-input" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        <span className="admin-perm-hint" style={{ marginTop: 0, fontWeight: 400 }}>این دلیل برای منتور نمایش داده می‌شود</span>
      </label>
      {error && <div className="admin-form-error">{error}</div>}
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" onClick={onClose} disabled={busy}>انصراف</button>
        <button type="button" className="admin-btn danger" disabled={busy || !reason.trim()} onClick={submit} aria-busy={busy}>
          {busy ? <Spinner size={14} /> : "تعلیق منتوری"}
        </button>
      </div>
    </AdminModal>
  );
}

// نمایشگرِ مدرک: فایل با fetch (کوکیِ سشن) گرفته و به blob URL تبدیل می‌شه —
// هیچ آدرسِ مستقیمی از فایل در DOM نمی‌مونه و بعد از بستن revoke می‌شه.
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
          throw new Error((d as any)?.error || "فایل دریافت نشد");
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
    <AdminModal title={doc.fileName} eyebrow={doc.kind === "IDENTITY" ? "مدرک هویت" : certLabel(doc.category || "")} onClose={onClose} wide>
      {error ? (
        <div className="admin-empty">{error}</div>
      ) : !url ? (
        <div className="admin-empty is-loading" role="status" aria-label="در حال دریافت فایل" />
      ) : isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={doc.fileName} style={{ display: "block", maxWidth: "100%", maxHeight: "70vh", margin: "0 auto", borderRadius: 10 }} />
      ) : isPdf ? (
        <div className="admin-empty">
          <FileText size={24} strokeWidth={1.75} aria-hidden />
          <span>فایل PDF؛ {formatSize(doc.sizeBytes)}</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="admin-btn primary">
            <ExternalLink {...IS} aria-hidden /> باز کردن در زبانه‌ی جدید
          </a>
        </div>
      ) : (
        <div className="admin-empty">
          <span>پیش‌نمایش این نوع فایل ممکن نیست</span>
          <a href={url} download={doc.fileName} className="admin-btn"><Download {...IS} aria-hidden /> دریافت فایل</a>
        </div>
      )}
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" onClick={onClose}>بستن</button>
      </div>
    </AdminModal>
  );
}
