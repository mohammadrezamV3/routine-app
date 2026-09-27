"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight, BadgeCheck, Ban, Copy, ExternalLink, Eye, FileText, Flag, History, RotateCcw, ShieldCheck, UserRound, XCircle,
} from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminModal, ConfirmModal } from "@/components/admin/AdminModal";
import { UserAvatar, displayName } from "@/components/admin/UserAvatar";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { formatDateShort, formatDateTime, formatNumber } from "@/lib/adminFormat";
import { MENTOR_CATEGORY_META, VERIFICATION_LABELS, isMentorCategory } from "@/lib/mentorCategories";

type VStatus = keyof typeof VERIFICATION_LABELS;
type DocKind = "IDENTITY" | "CERTIFICATE";
type Doc = { id: string; kind: DocKind; category: string | null; fileName: string; mimeType: string; sizeBytes: number; createdAt: string };
type Credential = { id: string; category: string; status: VStatus; rejectReason: string | null; reviewedAt: string | null; updatedAt: string };
type Detail = {
  profile: {
    id: string; userId: string; headline: string | null; bio: string | null; specialties: string[]; categories: string[];
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

const V_BADGE: Record<VStatus, "green" | "red" | "amber" | "gray"> = { VERIFIED: "green", REJECTED: "red", PENDING: "amber", NOT_PROVIDED: "gray" };
const V_STATUSES: VStatus[] = ["PENDING", "VERIFIED", "REJECTED", "NOT_PROVIDED"];
const TARGET_LABELS: Record<string, string> = { USER: "کاربر", REVIEW: "نظر", MESSAGE: "پیام", PROGRAM: "برنامه" };

function categoryLabel(c: string) {
  return isMentorCategory(c) ? MENTOR_CATEGORY_META[c].label : c;
}
function certLabel(c: string) {
  return isMentorCategory(c) ? MENTOR_CATEGORY_META[c].certLabel : c;
}
function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

type VerifyTarget = { kind: DocKind; category: string | null; current: VStatus; preset: VStatus };

export default function AdminMentorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useAdminToast();
  const { can } = useAdminAccess();
  const id = params?.profileId as string;
  const [data, setData] = useState<Detail | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound" | "error">("loading");
  const [verify, setVerify] = useState<VerifyTarget | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<Doc | null>(null);

  const load = useCallback(() => {
    fetch(`/api/admin/mentors/${id}`)
      .then(async (r) => {
        if (r.status === 404) { setState("notfound"); return; }
        if (!r.ok) { setState("error"); return; }
        setData(await r.json());
        setState("ok");
      })
      .catch(() => setState("error"));
  }, [id]);
  useEffect(load, [load]);

  if (state === "notfound") return <EmptyState message="منتور پیدا نشد" />;
  if (state === "error" && !data) {
    return (
      <div className="admin-empty">
        خطا در دریافت اطلاعات
        <button type="button" className="admin-btn" style={{ marginTop: 10 }} onClick={() => { setState("loading"); load(); }}>تلاش دوباره</button>
      </div>
    );
  }
  if (!data) return <div className="admin-empty is-loading">در حال بارگذاری…</div>;

  const p = data.profile;
  const u = p.user;
  const categories = Array.from(new Set([...p.categories, ...p.credentials.map((c) => c.category)]));
  const identityDocs = p.documents.filter((d) => d.kind === "IDENTITY");

  return (
    <section>
      <button type="button" className="admin-btn" style={{ marginBottom: 16 }} onClick={() => router.back()}>
        <ArrowRight size={14} /> بازگشت
      </button>

      <div className="admin-card admin-user-hero">
        <UserAvatar user={u} size={58} />
        <div className="admin-user-hero-info">
          <div className="admin-user-hero-name">
            {displayName(u)}
            <span className={`admin-badge ${V_BADGE[p.identityStatus]}`}>هویت: {VERIFICATION_LABELS[p.identityStatus]}</span>
            {p.suspendedAt ? <span className="admin-badge red">منتوری تعلیق</span>
              : p.published ? <span className="admin-badge green">منتشرشده</span>
              : <span className="admin-badge gray">پیش‌نویس</span>}
            {u.deletedAt ? <span className="admin-badge red">حساب حذف‌شده</span> : u.isBlocked ? <span className="admin-badge red">حساب مسدود</span> : null}
          </div>
          <div className="admin-user-hero-sub admin-ltr">{u.username ? `@${u.username}` : "—"}</div>
          <button type="button" className="admin-id-chip" onClick={() => { navigator.clipboard?.writeText(p.id); toast("آیدی پروفایل کپی شد"); }}>
            <Copy size={12} /> <span className="admin-ltr">{p.id}</span>
          </button>
        </div>
        <div className="admin-head-actions">
          {can("users.view") && (
            <Link href={`/admin/users/${u.id}`} className="admin-btn"><UserRound size={14} /> حساب کاربری</Link>
          )}
          {p.suspendedAt
            ? <button type="button" className="admin-btn" onClick={() => setRestoreOpen(true)}><RotateCcw size={14} /> رفع تعلیق</button>
            : <button type="button" className="admin-btn danger" onClick={() => setSuspendOpen(true)}><Ban size={14} /> تعلیق منتوری</button>}
        </div>
      </div>

      {p.suspendedAt && (
        <div className="admin-chart-card">
          <div className="admin-chart-head"><span className="admin-chart-title"><Ban size={15} className="admin-title-icon" />منتوری تعلیق است</span></div>
          <div className="admin-info-grid">
            <InfoRow k="از" v={formatDateTime(p.suspendedAt)} />
            <InfoRow k="دلیل" v={p.suspendedReason} />
          </div>
          <div className="admin-section-hint" style={{ margin: "10px 0 0" }}>
            تعلیق فقط منتوری رو می‌بنده. برای مسدودکردنِ کلِ حساب، از صفحه‌ی «حساب کاربری» اقدام کن.
          </div>
        </div>
      )}

      <div className="admin-kpi-grid">
        <Kpi label="شاگرد فعال" value={formatNumber(data.stats.activeStudents)} />
        <Kpi label="کل شاگردها" value={formatNumber(data.stats.totalStudents)} />
        <Kpi label="برنامه‌های ارسالی" value={formatNumber(data.stats.programs)} />
        <Kpi label="برنامه‌های تکمیل‌شده" value={formatNumber(data.stats.completedPrograms)} />
        <Kpi label="امتیاز" value={data.stats.ratingCount ? `${data.stats.ratingAvg.toFixed(1)} از ${formatNumber(data.stats.ratingCount)} نظر` : "—"} />
        <Kpi label="نظرات پنهان" value={formatNumber(data.stats.hiddenReviews)} />
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title"><UserRound size={15} className="admin-title-icon" />پروفایل منتوری</span></div>
        <div className="admin-info-grid">
          <InfoRow k="عنوان" v={p.headline} />
          <InfoRow k="دسته‌ها" v={p.categories.map(categoryLabel).join("، ") || null} />
          <InfoRow k="تخصص‌ها" v={p.specialties.join("، ") || null} />
          <InfoRow k="پذیرش شاگرد" v={p.acceptingStudents ? "باز" : "بسته"} />
          <InfoRow k="آخرین فعالیت" v={p.lastActiveAt ? formatDateTime(p.lastActiveAt) : null} />
          <InfoRow k="منتور از" v={formatDateShort(p.createdAt)} />
          <InfoRow k="عضویت در اپ" v={formatDateShort(u.createdAt)} />
        </div>
        {p.bio && <div className="admin-modal-text" style={{ whiteSpace: "pre-wrap", marginTop: 12, marginBottom: 0 }}>{p.bio}</div>}
      </div>

      <VerificationCard
        title="احراز هویت"
        status={p.identityStatus}
        rejectReason={p.identityRejectReason}
        reviewedAt={p.identityReviewedAt}
        docs={identityDocs}
        onView={setViewDoc}
        onAction={(preset) => setVerify({ kind: "IDENTITY", category: null, current: p.identityStatus, preset })}
      />

      {categories.length === 0 ? (
        <div className="admin-chart-card">
          <div className="admin-chart-head"><span className="admin-chart-title"><FileText size={15} className="admin-title-icon" />مدارک تخصصی</span></div>
          <EmptyState message="هنوز دسته‌ای انتخاب نشده" />
        </div>
      ) : categories.map((c) => {
        const cred = p.credentials.find((x) => x.category === c);
        const status: VStatus = cred?.status || "NOT_PROVIDED";
        return (
          <VerificationCard
            key={c}
            title={certLabel(c)}
            status={status}
            rejectReason={cred?.rejectReason || null}
            reviewedAt={cred?.reviewedAt || null}
            docs={p.documents.filter((d) => d.kind === "CERTIFICATE" && d.category === c)}
            onView={setViewDoc}
            onAction={isMentorCategory(c) ? (preset) => setVerify({ kind: "CERTIFICATE", category: c, current: status, preset }) : undefined}
          />
        );
      })}

      <div className="admin-chart-card">
        <div className="admin-chart-head">
          <span className="admin-chart-title"><Flag size={15} className="admin-title-icon" />گزارش‌های باز علیه این کاربر</span>
          {data.openReports.length > 0 && <Link href="/admin/mentors/reports" className="admin-btn">رسیدگی در صف گزارش‌ها</Link>}
        </div>
        {data.openReports.length === 0 ? <EmptyState message="گزارش بازی نیست" /> : (
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
        )}
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title"><History size={15} className="admin-title-icon" />تاریخچه‌ی احراز</span></div>
        {data.events.length === 0 ? <EmptyState message="هنوز تغییری ثبت نشده" /> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>مورد</th><th>تغییر وضعیت</th><th>دلیل</th><th>توسط</th><th>زمان</th></tr></thead>
              <tbody>
                {data.events.map((e) => (
                  <tr key={e.id}>
                    <td>{e.kind === "IDENTITY" ? "هویت" : certLabel(e.category || "")}</td>
                    <td>
                      <span className="admin-badge-row">
                        <span className={`admin-badge ${V_BADGE[e.fromStatus]}`}>{VERIFICATION_LABELS[e.fromStatus]}</span>
                        <span className="admin-muted">←</span>
                        <span className={`admin-badge ${V_BADGE[e.toStatus]}`}>{VERIFICATION_LABELS[e.toStatus]}</span>
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
          message="پروفایل منتوری دوباره فعال می‌شه (اگه منتشرشده باشه، توی کشف منتورها دیده می‌شه)."
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

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="admin-kpi-tile"><span className="admin-kpi-label">{label}</span><span className="admin-kpi-value" style={{ fontSize: 15 }}>{value}</span></div>;
}

function InfoRow({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="admin-info-row">
      <span className="admin-muted">{k}</span>
      <span style={{ textAlign: "left" }}>{v || "—"}</span>
    </div>
  );
}

function VerificationCard({
  title, status, rejectReason, reviewedAt, docs, onView, onAction,
}: {
  title: string; status: VStatus; rejectReason: string | null; reviewedAt: string | null; docs: Doc[];
  onView: (d: Doc) => void; onAction?: (preset: VStatus) => void;
}) {
  return (
    <div className="admin-chart-card">
      <div className="admin-chart-head">
        <span className="admin-chart-title">
          <ShieldCheck size={15} className="admin-title-icon" />{title}
          <span className={`admin-badge ${V_BADGE[status]}`} style={{ marginInlineStart: 8 }}>{VERIFICATION_LABELS[status]}</span>
        </span>
        {onAction && (
          <div className="admin-head-actions">
            {status !== "VERIFIED" && (
              <button type="button" className="admin-btn primary" disabled={docs.length === 0} onClick={() => onAction("VERIFIED")}>
                <BadgeCheck size={14} /> تأیید
              </button>
            )}
            <button type="button" className="admin-btn danger" onClick={() => onAction("REJECTED")}><XCircle size={14} /> رد</button>
            <button type="button" className="admin-btn" onClick={() => onAction(status === "PENDING" ? "NOT_PROVIDED" : "PENDING")}>تغییر وضعیت</button>
          </div>
        )}
      </div>
      {(rejectReason || reviewedAt) && (
        <div className="admin-info-grid" style={{ marginBottom: 10 }}>
          {rejectReason && status === "REJECTED" && <InfoRow k="دلیل رد" v={rejectReason} />}
          {reviewedAt && <InfoRow k="آخرین بررسی" v={formatDateTime(reviewedAt)} />}
        </div>
      )}
      {docs.length === 0 ? <EmptyState message="فایلی ارسال نشده" /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>فایل</th><th>نوع</th><th>حجم</th><th>ارسال</th><th /></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td style={{ whiteSpace: "normal", wordBreak: "break-all" }}>{d.fileName}</td>
                  <td>{d.mimeType === "application/pdf" ? "PDF" : "تصویر"}</td>
                  <td className="admin-ltr">{formatSize(d.sizeBytes)}</td>
                  <td className="admin-ltr">{formatDateTime(d.createdAt)}</td>
                  <td>
                    <button type="button" className="admin-icon-btn" aria-label="مشاهده" onClick={() => onView(d)}><Eye size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    if (needsReason && !reason.trim()) { setError("برای رد، نوشتنِ دلیل الزامیه"); return; }
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/mentors/${profileId}/verification`, {
        method: "POST",
        json: { kind: target.kind, category: target.category || undefined, status, reason: reason.trim() || undefined },
      });
      toast("وضعیت ثبت شد و به منتور اطلاع داده شد");
      onDone();
    } catch (e: any) {
      setError(e.message);
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title={title} eyebrow="بررسی مدرک" onClose={onClose}>
      <div className="admin-modal-text">وضعیت فعلی: {VERIFICATION_LABELS[target.current]}</div>
      <label className="admin-field">
        <span>وضعیت جدید</span>
        <select className="admin-input" value={status} onChange={(e) => { setStatus(e.target.value as VStatus); setError(null); }}>
          {V_STATUSES.map((s) => <option key={s} value={s}>{VERIFICATION_LABELS[s]}</option>)}
        </select>
      </label>
      <label className="admin-field">
        <span>{needsReason ? "دلیل رد (الزامی — برای منتور نمایش داده می‌شه)" : "توضیح (اختیاری)"}</span>
        <textarea className="admin-input" rows={3} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} />
      </label>
      {error && <div className="admin-form-error">{error}</div>}
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" onClick={onClose} disabled={busy}>انصراف</button>
        <button
          type="button" className={`admin-btn ${status === "REJECTED" ? "danger" : "primary"}`}
          disabled={busy || unchanged || (needsReason && !reason.trim())} onClick={submit}
        >
          {busy ? "در حال ثبت…" : "ثبت وضعیت"}
        </button>
      </div>
    </AdminModal>
  );
}

function SuspendModal({ profileId, onClose, onDone }: { profileId: string; onClose: () => void; onDone: () => void }) {
  const toast = useAdminToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/mentors/${profileId}/suspend`, { method: "POST", json: { suspend: true, reason: reason.trim() } });
      toast("منتوری تعلیق شد");
      onDone();
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title="تعلیق منتوری" eyebrow="تأیید اقدام" onClose={onClose}>
      <div className="admin-modal-text">
        پروفایل از کشف منتورها حذف و پذیرشِ شاگرد و ساختِ برنامه برای این منتور بسته می‌شه. خودِ حساب کاربری فعال می‌مونه.
      </div>
      <label className="admin-field">
        <span>دلیل تعلیق (الزامی — برای منتور نمایش داده می‌شه)</span>
        <textarea className="admin-input" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      </label>
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" onClick={onClose} disabled={busy}>انصراف</button>
        <button type="button" className="admin-btn danger" disabled={busy || !reason.trim()} onClick={submit}>
          {busy ? "در حال انجام…" : "تعلیق کن"}
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
          throw new Error((d as any)?.error || "دریافت فایل ناموفق بود");
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
        <div className="admin-empty is-loading">در حال بارگذاری فایل…</div>
      ) : isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={doc.fileName} style={{ display: "block", maxWidth: "100%", maxHeight: "70vh", margin: "0 auto", borderRadius: 10 }} />
      ) : isPdf ? (
        <div className="admin-empty">
          <FileText size={22} strokeWidth={1.5} />
          <span>فایل PDF · {formatSize(doc.sizeBytes)}</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="admin-btn primary" style={{ marginTop: 10 }}>
            <ExternalLink size={14} /> باز کردن PDF در زبانه‌ی جدید
          </a>
        </div>
      ) : (
        <div className="admin-empty">این نوع فایل قابل نمایش نیست</div>
      )}
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" onClick={onClose}>بستن</button>
      </div>
    </AdminModal>
  );
}
