"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { Flag, Loader2, MessageSquareText, Pencil, Send, Star, Trash2, UserX, X } from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { RatingStars, VerificationBadges, categoryLabel } from "@/components/MentorBadges";
import { MentorReportModal } from "@/components/MentorReportModal";
import { MentorConfirmDialog } from "@/components/MentorConfirmDialog";
import { LockBodyScroll } from "@/components/LockBodyScroll";
import { LoadingBlock } from "@/components/Spinner";
import { AccountBlock } from "@/components/AccountUI";
import type { MentorProfileResponse, MyMentorship, Review, ReportTargetType } from "@/lib/mentorTypes";
import { fmtDate, fmtRelative, NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";

const MESSAGE_MAX = 500;
const REVIEW_MAX = 1000;

export default function MentorProfilePage() {
  return (
    <MentorPageShell back={{ href: "/mentors", label: "منتورها" }}>
      <MentorProfile />
    </MentorPageShell>
  );
}

function MentorProfile() {
  const { mentorId } = useParams<{ mentorId: string }>();
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id as string | undefined;
  const [data, setData] = useState<MentorProfileResponse | null>(null);
  const [error, setError] = useState<{ msg: string; retry: boolean } | null>(null);
  const [report, setReport] = useState<{ type: ReportTargetType; id: string } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/mentors/${mentorId}`, { cache: "no-store" });
      if (res.status === 404) { setError({ msg: "این منتور پیدا نشد یا پروفایلش منتشر نشده است.", retry: false }); return; }
      if (res.status === 403) { setError({ msg: await readApiError(res, "به این بخش دسترسی نداری."), retry: false }); return; }
      if (!res.ok) { setError({ msg: await readApiError(res, "پروفایل بارگذاری نشد"), retry: true }); return; }
      setData(await res.json());
    } catch {
      setError({ msg: NETWORK_ERROR, retry: true });
    }
  }, [mentorId]);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <>
        <MentorErrorState message={error.msg} onRetry={error.retry ? load : undefined} />
        {!error.retry && (
          <div className="mentor-more"><Link href="/mentors" className="mentor-link">بازگشت به لیستِ منتورها</Link></div>
        )}
      </>
    );
  }
  if (!data) return <LoadingBlock />;

  const { mentor, reviews, myMentorship, canReview, myReview } = data;
  const isSelf = !!myId && myId === mentor.userId;

  return (
    <>
      <div className="trade-surface mentor-hero">
        <div className="mentor-hero-top">
          <MentorUserAvatar name={mentor.name} avatarUrl={mentor.avatarUrl} size={68} />
          <div className="mentor-hero-id">
            <h1 className="mentor-hero-name">{mentor.name}</h1>
            {mentor.headline && <p className="mentor-hero-headline">{mentor.headline}</p>}
            <div style={{ marginTop: 6 }}><RatingStars value={mentor.ratingAvg} count={mentor.ratingCount} /></div>
          </div>
          {!isSelf && (
            <button type="button" className="trade-icon-btn" onClick={() => setReport({ type: "USER", id: mentor.userId })} aria-label="گزارشِ این منتور" title="گزارشِ این منتور">
              <Flag size={16} />
            </button>
          )}
        </div>

        <VerificationBadges identityVerified={mentor.identityVerified} certifications={mentor.certifications} />
        {mentor.categories.length > 0 && (
          <div className="mentor-chip-list" style={{ marginTop: 8 }}>
            {mentor.categories.map((c) => <span key={c} className="mentor-badge is-cat">{categoryLabel(c)}</span>)}
          </div>
        )}

        <div className="mentor-stats">
          <div className="mentor-stat"><b>{faNum(mentor.activeStudents)}</b><span>شاگردِ فعال</span></div>
          <div className="mentor-stat"><b>{faNum(mentor.totalStudents)}</b><span>کلِ شاگردها</span></div>
          <div className="mentor-stat"><b>{faNum(mentor.completedPrograms)}</b><span>برنامه‌ی تکمیل‌شده</span></div>
          <div className="mentor-stat"><b style={{ fontSize: 12.5 }}>{fmtRelative(mentor.lastActiveAt)}</b><span>آخرین فعالیت</span></div>
        </div>

        <div className="mentor-hero-actions">
          {isSelf ? (
            <Link href="/mentor/profile" className="mentor-link">
              <Pencil size={14} /> ویرایشِ پروفایلِ منتوری
            </Link>
          ) : (
            <ConnectAction
              mentorId={mentor.userId}
              mentorName={mentor.name}
              accepting={mentor.acceptingStudents}
              mine={myMentorship}
              onChange={(m) => setData((d) => (d ? { ...d, myMentorship: m } : d))}
              onStale={load}
            />
          )}
        </div>
        {mentor.memberSince && <div className="mentor-muted" style={{ marginTop: 10, fontSize: 11 }}>منتورِ آریون از {fmtDate(mentor.memberSince)}</div>}
      </div>

      {(mentor.bio || mentor.specialties.length > 0) && (
        <div style={{ marginTop: 16 }}>
          <AccountBlock title="درباره‌ی منتور">
            {mentor.bio && <p className="mentor-bio">{mentor.bio}</p>}
            {mentor.specialties.length > 0 && (
              <>
                <div className="exercise-form-label" style={{ marginTop: mentor.bio ? 14 : 4 }}>تخصص‌ها</div>
                <div className="mentor-chip-list">
                  {mentor.specialties.map((s) => <span key={s} className="mentor-badge is-cat">{s}</span>)}
                </div>
              </>
            )}
          </AccountBlock>
        </div>
      )}

      {!isSelf && (canReview || myReview) && (
        <MyReviewBox mentorId={mentor.userId} myReview={myReview} onChanged={load} />
      )}

      <AccountBlock title={`نظرها${reviews.length ? ` (${faNum(mentor.ratingCount || reviews.length)})` : ""}`} icon={<MessageSquareText size={15} />}>
        {reviews.length === 0 ? (
          <p className="mentor-muted" style={{ margin: 0 }}>هنوز نظری برای این منتور ثبت نشده.</p>
        ) : (
          reviews.map((r) => (
            <ReviewRow key={r.id} review={r} canReport={!isSelf && r.id !== myReview?.id} onReport={() => setReport({ type: "REVIEW", id: r.id })} />
          ))
        )}
      </AccountBlock>

      {report && <MentorReportModal targetType={report.type} targetId={report.id} onClose={() => setReport(null)} />}
    </>
  );
}

function ReviewRow({ review, canReport, onReport }: { review: Review; canReport: boolean; onReport: () => void }) {
  return (
    <div className="mentor-review">
      <MentorUserAvatar name={review.student.name} avatarUrl={review.student.avatarUrl} size={34} />
      <div className="mentor-review-body">
        <div className="mentor-review-head">
          <span className="mentor-review-name">{review.student.name || "شاگرد"}</span>
          <RatingStars value={review.rating} />
          <span className="mentor-review-date">{fmtDate(review.createdAt)}</span>
          {canReport && (
            <button type="button" className="trade-ghost-btn" style={{ marginInlineStart: "auto", padding: "3px 6px" }} onClick={onReport} aria-label="گزارشِ این نظر">
              <Flag size={12} />
            </button>
          )}
        </div>
        {review.body && <p className="mentor-review-text">{review.body}</p>}
      </div>
    </div>
  );
}

/** دکمه‌ی اتصال — حالتش از myMentorship می‌آید */
function ConnectAction({
  mentorId, mentorName, accepting, mine, onChange, onStale,
}: {
  mentorId: string;
  mentorName: string;
  accepting: boolean;
  mine: MyMentorship | null;
  onChange: (m: MyMentorship | null) => void;
  onStale: () => void;
}) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function patch(action: "accept" | "reject" | "cancel") {
    if (!mine) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/mentorships/${mine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        setError(await readApiError(res));
        if (res.status === 409 || res.status === 404) onStale();
        return;
      }
      const d = await res.json().catch(() => null);
      const next = d?.mentorship?.status as MyMentorship["status"] | undefined;
      const status = next ?? (action === "accept" ? "ACTIVE" : action === "reject" ? "REJECTED" : "ENDED");
      onChange({ ...mine, status });
      setConfirmCancel(false);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(null);
    }
  }

  let body: React.ReactNode;
  if (mine?.status === "ACTIVE") {
    body = (
      <Link href={`/mentorship/${mine.id}`} className="trade-primary-btn" style={{ textDecoration: "none" }}>
        <MessageSquareText size={15} /> گفت‌وگو و برنامه‌ها
      </Link>
    );
  } else if (mine?.status === "PENDING" && mine.initiatedBy === "STUDENT") {
    body = (
      <>
        <span className="mentor-status is-pending">درخواستت در انتظارِ پاسخِ منتور است</span>
        <button type="button" className="account-outline-btn muted" onClick={() => setConfirmCancel(true)} disabled={!!busy}>
          لغوِ درخواست
        </button>
      </>
    );
  } else if (mine?.status === "PENDING" && mine.initiatedBy === "MENTOR") {
    body = (
      <>
        <span className="mentor-muted" style={{ width: "100%" }}>این منتور تو را به‌عنوانِ شاگرد دعوت کرده است.</span>
        <button type="button" className="trade-primary-btn" onClick={() => patch("accept")} disabled={!!busy}>
          {busy === "accept" ? <Loader2 size={15} className="trade-spin" /> : "پذیرفتنِ دعوت"}
        </button>
        <button type="button" className="account-outline-btn muted" onClick={() => patch("reject")} disabled={!!busy}>
          {busy === "reject" ? <Loader2 size={15} className="trade-spin" /> : "رد"}
        </button>
      </>
    );
  } else if (mine?.status === "BLOCKED") {
    body = <span className="mentor-muted"><UserX size={14} style={{ display: "inline", verticalAlign: "-2px" }} /> امکانِ ارتباط با این منتور وجود ندارد.</span>;
  } else if (!accepting) {
    body = <span className="mentor-muted">این منتور فعلا شاگردِ جدید نمی‌پذیرد.</span>;
  } else {
    body = (
      <button type="button" className="trade-primary-btn" onClick={() => setRequestOpen(true)}>
        <Send size={15} /> {mine && (mine.status === "ENDED" || mine.status === "REJECTED") ? "درخواستِ دوباره" : "درخواستِ منتوری"}
      </button>
    );
  }

  return (
    <>
      {body}
      {error && !confirmCancel && <div className="trade-form-error" style={{ width: "100%", marginTop: 4 }}>{error}</div>}
      {requestOpen && (
        <RequestModal
          mentorId={mentorId}
          mentorName={mentorName}
          onClose={() => setRequestOpen(false)}
          onDone={(m) => { setRequestOpen(false); onChange(m); }}
          onStale={onStale}
        />
      )}
      {confirmCancel && (
        <MentorConfirmDialog
          message="درخواستِ منتوری لغو شود؟"
          confirmLabel="لغوِ درخواست"
          busy={busy === "cancel"}
          error={error}
          onConfirm={() => patch("cancel")}
          onCancel={() => { setConfirmCancel(false); setError(null); }}
        />
      )}
    </>
  );
}

function RequestModal({
  mentorId, mentorName, onClose, onDone, onStale,
}: {
  mentorId: string;
  mentorName: string;
  onClose: () => void;
  onDone: (m: MyMentorship) => void;
  onStale: () => void;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (message.trim().length > MESSAGE_MAX) { setError(`پیام حداکثر ${faNum(MESSAGE_MAX)} کاراکتر است`); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mentorships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorId, message: message.trim() || undefined }),
      });
      if (res.status === 409) { setError("قبلا با این منتور درخواست یا رابطه‌ی فعالی داری."); onStale(); return; }
      if (!res.ok) { setError(await readApiError(res, "ارسالِ درخواست انجام نشد")); return; }
      const d = await res.json().catch(() => null);
      const m = d?.mentorship;
      if (m?.id) onDone({ id: m.id, status: m.status ?? "PENDING", initiatedBy: m.initiatedBy ?? "STUDENT" });
      else { onClose(); onStale(); }
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={() => !busy && onClose()} style={{ zIndex: 90 }} />
      <div className="modal-panel open" role="dialog" aria-modal="true" style={{ zIndex: 91, maxWidth: 440 }}>
        <div className="modal-head">
          <div className="modal-title">درخواستِ منتوری از {mentorName}</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن" disabled={busy}><X size={16} /></button>
        </div>
        <p className="mentor-muted" style={{ margin: "0 0 4px" }}>
          بعد از پذیرفتنِ درخواست، منتور فقط همان بخش‌هایی از برنامه‌ات را می‌بیند که خودت در «دسترسی‌ها» اجازه بدهی — به‌طورِ پیش‌فرض هیچ‌کدام.
        </p>
        <label className="exercise-form-label" htmlFor="mentor-req-msg">پیام (اختیاری)</label>
        <textarea
          id="mentor-req-msg"
          className="wsearch-newform-name trade-glass-field"
          rows={4}
          value={message}
          maxLength={MESSAGE_MAX + 50}
          onChange={(e) => { setMessage(e.target.value); setError(null); }}
          placeholder="هدفت چیست و از منتور چه انتظاری داری؟"
        />
        <div className="mentor-muted" style={{ fontSize: 10.5, textAlign: "left", color: message.trim().length > MESSAGE_MAX ? "#E05252" : undefined }}>
          {faNum(message.trim().length)}/{faNum(MESSAGE_MAX)}
        </div>
        {error && <div className="trade-form-error">{error}</div>}
        <div className="trade-modal-actions">
          <button type="button" className="account-outline-btn" onClick={onClose} disabled={busy}>انصراف</button>
          <button type="button" className="trade-primary-btn" onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={15} className="trade-spin" /> : "ارسالِ درخواست"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

/** نوشتن/ویرایش/حذفِ نظرِ خودم */
function MyReviewBox({ mentorId, myReview, onChanged }: { mentorId: string; myReview: Review | null; onChanged: () => void }) {
  const [editing, setEditing] = useState(!myReview);
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [body, setBody] = useState(myReview?.body ?? "");
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setEditing(!myReview);
    setRating(myReview?.rating ?? 0);
    setBody(myReview?.body ?? "");
  }, [myReview]);

  async function save() {
    if (rating < 1 || rating > 5) { setError("امتیاز را با ستاره‌ها انتخاب کن"); return; }
    if (body.trim().length > REVIEW_MAX) { setError(`متنِ نظر حداکثر ${faNum(REVIEW_MAX)} کاراکتر است`); return; }
    setBusy("save");
    setError(null);
    try {
      const res = await fetch(`/api/mentors/${mentorId}/reviews`, {
        method: myReview ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body: body.trim() || undefined }),
      });
      if (res.status === 409) { setError("قبلا برای این منتور نظر ثبت کرده‌ای."); onChanged(); return; }
      if (!res.ok) { setError(await readApiError(res, "ثبتِ نظر انجام نشد")); return; }
      setEditing(false);
      onChanged();
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/mentors/${mentorId}/reviews`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) { setError(await readApiError(res, "حذفِ نظر انجام نشد")); return; }
      setConfirmDelete(false);
      onChanged();
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(null);
    }
  }

  return (
    <AccountBlock title={myReview ? "نظرِ تو" : "نظرت را بنویس"} icon={<Star size={15} />} desc={myReview ? undefined : "نظرت بعد از ثبت برای همه دیده می‌شود و در امتیازِ منتور حساب می‌شود."}>
      {!editing && myReview ? (
        <>
          <ReviewRow review={myReview} canReport={false} onReport={() => {}} />
          <div className="mentor-hero-actions" style={{ marginTop: 6 }}>
            <button type="button" className="account-outline-btn" onClick={() => setEditing(true)}><Pencil size={14} /> ویرایش</button>
            <button type="button" className="trade-danger-btn" style={{ padding: "8px 14px", borderRadius: 12, fontSize: 12 }} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> حذف
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mentor-star-input" role="radiogroup" aria-label="امتیاز">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={rating === i}
                aria-label={`${faNum(i)} ستاره`}
                className={i <= rating ? "on" : undefined}
                onClick={() => { setRating(i); setError(null); }}
              >
                <Star size={24} fill={i <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <label className="exercise-form-label" htmlFor="mentor-review-body">متن (اختیاری)</label>
          <textarea
            id="mentor-review-body"
            className="wsearch-newform-name trade-glass-field"
            rows={3}
            value={body}
            maxLength={REVIEW_MAX + 50}
            onChange={(e) => setBody(e.target.value)}
            placeholder="تجربه‌ات از کار با این منتور"
          />
          {error && <div className="trade-form-error">{error}</div>}
          <div className="trade-modal-actions">
            {myReview && <button type="button" className="account-outline-btn" onClick={() => { setEditing(false); setError(null); setRating(myReview.rating); setBody(myReview.body ?? ""); }} disabled={!!busy}>انصراف</button>}
            <button type="button" className="trade-primary-btn" onClick={save} disabled={!!busy}>
              {busy === "save" ? <Loader2 size={15} className="trade-spin" /> : myReview ? "ذخیره‌ی تغییرات" : "ثبتِ نظر"}
            </button>
          </div>
        </>
      )}
      {confirmDelete && (
        <MentorConfirmDialog
          message="نظرت حذف شود؟"
          confirmLabel="حذف"
          busy={busy === "delete"}
          error={error}
          onConfirm={remove}
          onCancel={() => { setConfirmDelete(false); setError(null); }}
        />
      )}
    </AccountBlock>
  );
}
