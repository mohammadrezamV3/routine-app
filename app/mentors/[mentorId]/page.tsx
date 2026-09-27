"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import {
  Activity, AlertCircle, Ban, Check, CircleSlash, ClipboardList, Flag, Hourglass, MessageCircle, MessageSquareText, Pencil, Send, Star,
  Trash2, UserRound, Users, X,
} from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorChip, MentorEmpty, MentorField, MentorSection } from "@/components/MentorUI";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { CategoryChip, RatingStars, VerificationBadges, categoryLabel } from "@/components/MentorBadges";
import { MentorReportModal } from "@/components/MentorReportModal";
import { MentorConfirmDialog } from "@/components/MentorConfirmDialog";
import { LockBodyScroll } from "@/components/LockBodyScroll";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import type { MentorProfileResponse, MyMentorship, Review, ReportTargetType } from "@/lib/mentorTypes";
import { fmtDate, fmtRelative, NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";

const MESSAGE_MAX = 500;
const REVIEW_MAX = 1000;
const CHIP = { size: 13, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN_SM = { size: 14, strokeWidth: 1.75, "aria-hidden": true } as const;
const SECTION = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;

export default function MentorProfilePage() {
  return (
    <MentorPageShell back={{ href: "/mentors", label: "کشف منتور" }}>
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
      if (res.status === 404) { setError({ msg: "این منتور پیدا نشد یا پروفایلش منتشر نشده است", retry: false }); return; }
      if (res.status === 403) { setError({ msg: await readApiError(res, "اجازه‌ی دیدن این پروفایل را نداری"), retry: false }); return; }
      if (!res.ok) { setError({ msg: await readApiError(res, "پروفایل دریافت نشد؛ دوباره تلاش کن"), retry: true }); return; }
      setData(await res.json());
    } catch {
      setError({ msg: NETWORK_ERROR, retry: true });
    }
  }, [mentorId]);

  useEffect(() => { load(); }, [load]);

  if (error) return <MentorErrorState message={error.msg} onRetry={error.retry ? load : undefined} />;
  if (!data) return <LoadingBlock />;

  const { mentor, reviews, myMentorship, canReview, myReview } = data;
  const isSelf = !!myId && myId === mentor.userId;
  const role = mentor.categories.includes("ROUTINE") && mentor.routineRole?.trim() ? mentor.routineRole.trim() : null;
  const hasChips = mentor.identityVerified || mentor.certifications.some((c) => c.verified) || mentor.categories.length > 0;

  return (
    <>
      <div className="trade-surface mentor-hero acc-block">
        <div className="mentor-hero-top">
          <MentorUserAvatar name={mentor.name} avatarUrl={mentor.avatarUrl} size={48} />
          <div className="mentor-hero-id">
            {role && <div className="rp-card-eyebrow">{role}</div>}
            <h1 className="mentor-hero-name">{mentor.name}</h1>
            {mentor.headline && <p className="mentor-hero-headline">{mentor.headline}</p>}
            <RatingStars value={mentor.ratingAvg} count={mentor.ratingCount} />
          </div>
          {!isSelf && (
            <button
              type="button"
              className="trade-icon-btn"
              onClick={() => setReport({ type: "USER", id: mentor.userId })}
              aria-label="گزارش این منتور"
              title="گزارش این منتور"
            >
              <Flag size={16} strokeWidth={1.75} aria-hidden />
            </button>
          )}
        </div>

        {hasChips && (
          <div className="mentor-chips" style={{ marginTop: 12 }}>
            <VerificationBadges identityVerified={mentor.identityVerified} certifications={mentor.certifications} />
            {mentor.categories.map((c) => <CategoryChip key={c} category={c} />)}
          </div>
        )}

        <div className="mentor-stats">
          <div className="mentor-stat"><b>{faNum(mentor.activeStudents)}</b><span><Users {...CHIP} /> شاگرد فعال</span></div>
          <div className="mentor-stat"><b>{faNum(mentor.totalStudents)}</b><span><UserRound {...CHIP} /> کل شاگردها</span></div>
          <div className="mentor-stat"><b>{faNum(mentor.completedPrograms)}</b><span><ClipboardList {...CHIP} /> برنامه‌ی تمام‌شده</span></div>
          <div className="mentor-stat"><b>{fmtRelative(mentor.lastActiveAt)}</b><span><Activity {...CHIP} /> آخرین فعالیت</span></div>
        </div>

        {isSelf ? (
          <div className="mentor-hero-actions">
            <MentorChip tone="neutral" icon={<UserRound {...CHIP} />}>پروفایل خودت</MentorChip>
          </div>
        ) : (
          <ConnectAction
            mentorId={mentor.userId}
            mentorName={mentor.name}
            mentorCategories={mentor.categories}
            accepting={mentor.acceptingStudents}
            mine={myMentorship}
            onChange={(m) => setData((d) => (d ? { ...d, myMentorship: m } : d))}
            onStale={load}
          />
        )}
        {mentor.memberSince && <p className="mentor-muted" style={{ marginTop: 12 }}>منتور آریون از {fmtDate(mentor.memberSince)}</p>}
      </div>

      {(mentor.bio || mentor.specialties.length > 0) && (
        <MentorSection title="درباره‌ی منتور" icon={<UserRound {...SECTION} />}>
          <div className="mentor-form">
            {mentor.bio && <p className="mentor-bio">{mentor.bio}</p>}
            {mentor.specialties.length > 0 && (
              <div className="mentor-field">
                <span className="mentor-field-label">تخصص‌ها</span>
                <div className="mentor-chips">
                  {mentor.specialties.map((s) => <span key={s} className="mentor-chip is-cat"><span>{s}</span></span>)}
                </div>
              </div>
            )}
          </div>
        </MentorSection>
      )}

      {!isSelf && (canReview || myReview) && (
        <MyReviewBox mentorId={mentor.userId} myReview={myReview} onChanged={load} />
      )}

      <MentorSection
        title="نظرها"
        icon={<MessageSquareText {...SECTION} />}
        count={reviews.length ? faNum(mentor.ratingCount || reviews.length) : undefined}
      >
        {reviews.length === 0 ? (
          <MentorEmpty>هنوز نظری ثبت نشده است</MentorEmpty>
        ) : (
          reviews.map((r) => (
            <ReviewRow key={r.id} review={r} canReport={!isSelf && r.id !== myReview?.id} onReport={() => setReport({ type: "REVIEW", id: r.id })} />
          ))
        )}
      </MentorSection>

      {report && <MentorReportModal targetType={report.type} targetId={report.id} onClose={() => setReport(null)} />}
    </>
  );
}

function ReviewRow({ review, canReport, onReport }: { review: Review; canReport: boolean; onReport: () => void }) {
  return (
    <div className="mentor-review">
      <MentorUserAvatar name={review.student.name} avatarUrl={review.student.avatarUrl} size={36} />
      <div className="mentor-review-body">
        <div className="mentor-review-head">
          <span className="mentor-review-name">{review.student.name || "شاگرد"}</span>
          <RatingStars value={review.rating} />
          <span className="mentor-review-date">{fmtDate(review.createdAt)}</span>
          {canReport && (
            <button type="button" className="trade-icon-btn" style={{ marginInlineStart: "auto" }} onClick={onReport} aria-label="گزارش این نظر" title="گزارش این نظر">
              <Flag {...BTN_SM} />
            </button>
          )}
        </div>
        {review.body && <p className="mentor-review-text">{review.body}</p>}
      </div>
    </div>
  );
}

/** اکشنِ اتصال — حالتش از myMentorship می‌آید. خطا بالای دکمه‌ها. */
function ConnectAction({
  mentorId, mentorName, mentorCategories, accepting, mine, onChange, onStale,
}: {
  mentorId: string;
  mentorName: string;
  mentorCategories: string[];
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
      <Link href={`/mentorship/${mine.id}`} className="trade-primary-btn mentor-btn">
        <MessageCircle {...BTN} /> باز کردن گفت‌وگو
      </Link>
    );
  } else if (mine?.status === "PENDING" && mine.initiatedBy === "STUDENT") {
    body = (
      <>
        <MentorChip tone="info" icon={<Hourglass {...CHIP} />}>منتظر پاسخ منتور</MentorChip>
        <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => { setError(null); setConfirmCancel(true); }} disabled={!!busy}>
          <X {...BTN_SM} /> لغو درخواست
        </button>
      </>
    );
  } else if (mine?.status === "PENDING" && mine.initiatedBy === "MENTOR") {
    body = (
      <>
        <MentorChip tone="warn" icon={<AlertCircle {...CHIP} />} title="این منتور تو را به‌عنوان شاگرد دعوت کرده است">منتظر پاسخ تو</MentorChip>
        <div className="mentor-btn-group" style={{ width: "100%" }}>
          <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => patch("reject")} disabled={!!busy}>
            {busy === "reject" ? <Spinner size={14} /> : <><X {...BTN} /> رد دعوت</>}
          </button>
          <button type="button" className="trade-primary-btn mentor-btn" onClick={() => patch("accept")} disabled={!!busy}>
            {busy === "accept" ? <Spinner size={14} /> : <><Check {...BTN} /> پذیرفتن دعوت</>}
          </button>
        </div>
      </>
    );
  } else if (mine?.status === "BLOCKED") {
    body = <MentorChip tone="danger" icon={<Ban {...CHIP} />}>ارتباط با این منتور ممکن نیست</MentorChip>;
  } else if (!accepting) {
    body = <MentorChip tone="neutral" icon={<CircleSlash {...CHIP} />}>شاگرد جدید نمی‌پذیرد</MentorChip>;
  } else {
    body = (
      <button type="button" className="trade-primary-btn mentor-btn" onClick={() => setRequestOpen(true)}>
        <Send {...BTN} /> {mine && (mine.status === "ENDED" || mine.status === "REJECTED") ? "ارسال دوباره‌ی درخواست" : "ارسال درخواست"}
      </button>
    );
  }

  return (
    <>
      {error && !confirmCancel && <div className="form-inline-error" role="alert">{error}</div>}
      <div className="mentor-hero-actions">{body}</div>
      {requestOpen && (
        <RequestModal
          mentorId={mentorId}
          mentorName={mentorName}
          mentorCategories={mentorCategories}
          onClose={() => setRequestOpen(false)}
          onDone={(m) => { setRequestOpen(false); onChange(m); }}
          onStale={onStale}
        />
      )}
      {confirmCancel && (
        <MentorConfirmDialog
          message={`درخواست به ${mentorName} لغو شود؟`}
          hint="بعداً می‌توانی دوباره درخواست بدهی."
          confirmLabel="لغو درخواست"
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
  mentorId, mentorName, mentorCategories, onClose, onDone, onStale,
}: {
  mentorId: string;
  mentorName: string;
  mentorCategories: string[];
  onClose: () => void;
  onDone: (m: MyMentorship) => void;
  onStale: () => void;
}) {
  const [message, setMessage] = useState("");
  // حوزه‌ی منتوری (مثلا فقط «روتین») — پیش‌فرض همه‌ی حوزه‌های منتور
  const [cats, setCats] = useState<string[]>(mentorCategories);
  const [busy, setBusy] = useState(false);
  const [catsError, setCatsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const len = message.trim().length;
  const tooLong = len > MESSAGE_MAX;

  async function submit() {
    if (mentorCategories.length > 0 && cats.length === 0) { setCatsError("حداقل یک حوزه انتخاب کن"); return; }
    if (tooLong) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mentorships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorId, message: message.trim() || undefined, ...(mentorCategories.length ? { categories: cats } : {}) }),
      });
      if (res.status === 409) { setError("با این منتور درخواست باز یا رابطه‌ی فعال داری"); onStale(); return; }
      if (!res.ok) { setError(await readApiError(res, "درخواست ارسال نشد؛ دوباره تلاش کن")); return; }
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
      <div className="modal-panel open mentor-modal" role="dialog" aria-modal="true" aria-label={`درخواست منتوری از ${mentorName}`} style={{ zIndex: 91, maxWidth: 440 }}>
        <div className="modal-head">
          <div className="modal-title">درخواست منتوری از {mentorName}</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن" disabled={busy}>
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div className="mentor-form">
          <p className="mentor-muted">منتور تا وقتی در بخش دسترسی‌ها اجازه ندهی، هیچ بخشی از برنامه‌هایت را نمی‌بیند.</p>
          {mentorCategories.length > 1 && (
            <MentorField label="حوزه‌ی همکاری" error={catsError}>
              <div role="group" aria-label="حوزه‌ی همکاری">
                {mentorCategories.map((c) => (
                  <label key={c} className="mentor-check">
                    <input
                      type="checkbox"
                      checked={cats.includes(c)}
                      onChange={() => { setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c])); setCatsError(null); }}
                    />
                    <span className="mentor-check-label">{categoryLabel(c)}</span>
                  </label>
                ))}
              </div>
            </MentorField>
          )}
          <MentorField
            label="پیام"
            htmlFor="mentor-req-msg"
            optional
            error={tooLong ? `پیام حداکثر ${faNum(MESSAGE_MAX)} نویسه است` : null}
            hint={`${faNum(len)} از ${faNum(MESSAGE_MAX)} نویسه`}
          >
            <textarea
              id="mentor-req-msg"
              className="wsearch-newform-name trade-glass-field"
              rows={4}
              value={message}
              maxLength={MESSAGE_MAX + 50}
              onChange={(e) => { setMessage(e.target.value); setError(null); }}
              placeholder="مثلاً «برای کنکور تجربی برنامه‌ی هفتگی می‌خواهم»"
              aria-invalid={tooLong}
            />
          </MentorField>
        </div>
        {error && <div className="form-inline-error" role="alert">{error}</div>}
        <div className="trade-modal-actions">
          <button type="button" className="account-outline-btn mentor-btn" onClick={onClose} disabled={busy}>انصراف</button>
          <button type="button" className="trade-primary-btn mentor-btn" onClick={submit} disabled={busy || tooLong}>
            {busy ? <Spinner size={14} /> : "ارسال درخواست"}
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
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const len = body.trim().length;
  const tooLong = len > REVIEW_MAX;

  useEffect(() => {
    setEditing(!myReview);
    setRating(myReview?.rating ?? 0);
    setBody(myReview?.body ?? "");
  }, [myReview]);

  async function save() {
    if (rating < 1 || rating > 5) { setRatingError("امتیاز را انتخاب کن"); return; }
    if (tooLong) return;
    setBusy("save");
    setError(null);
    try {
      const res = await fetch(`/api/mentors/${mentorId}/reviews`, {
        method: myReview ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body: body.trim() || undefined }),
      });
      if (res.status === 409) { setError("برای این منتور قبلاً نظر ثبت کرده‌ای"); onChanged(); return; }
      if (!res.ok) { setError(await readApiError(res, "نظر ثبت نشد؛ دوباره تلاش کن")); return; }
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
      if (!res.ok && res.status !== 404) { setError(await readApiError(res, "نظر حذف نشد؛ دوباره تلاش کن")); return; }
      setConfirmDelete(false);
      onChanged();
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(null);
    }
  }

  return (
    <MentorSection
      title={myReview ? "نظر تو" : "ثبت نظر"}
      icon={<Star {...SECTION} />}
      desc={myReview ? undefined : "نظر پس از ثبت برای همه دیده می‌شود و در امتیاز منتور حساب می‌شود."}
    >
      {!editing && myReview ? (
        <>
          <ReviewRow review={myReview} canReport={false} onReport={() => {}} />
          <div className="mentor-btn-group is-end">
            <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => { setError(null); setConfirmDelete(true); }}>
              <Trash2 {...BTN_SM} /> حذف نظر
            </button>
            <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => setEditing(true)}>
              <Pencil {...BTN_SM} /> ویرایش نظر
            </button>
          </div>
        </>
      ) : (
        <form className="mentor-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <MentorField label="امتیاز" error={ratingError}>
            <div className="mentor-star-input" role="radiogroup" aria-label="امتیاز">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={rating === i}
                  aria-label={`${faNum(i)} ستاره`}
                  className={i <= rating ? "on" : undefined}
                  onClick={() => { setRating(i); setRatingError(null); }}
                >
                  <Star size={24} strokeWidth={1.75} fill={i <= rating ? "currentColor" : "none"} aria-hidden />
                </button>
              ))}
            </div>
          </MentorField>
          <MentorField
            label="نظر تو"
            htmlFor="mentor-review-body"
            optional
            error={tooLong ? `نظر حداکثر ${faNum(REVIEW_MAX)} نویسه است` : null}
          >
            <textarea
              id="mentor-review-body"
              className="wsearch-newform-name trade-glass-field"
              rows={3}
              value={body}
              maxLength={REVIEW_MAX + 50}
              onChange={(e) => setBody(e.target.value)}
              placeholder="مثلاً «برنامه‌ها دقیق و قابل اجرا بود»"
              aria-invalid={tooLong}
            />
          </MentorField>
          {error && !confirmDelete && <div className="form-inline-error" role="alert">{error}</div>}
          <div className="mentor-form-actions" style={{ marginTop: 0 }}>
            {myReview && (
              <button
                type="button"
                className="account-outline-btn muted mentor-btn"
                onClick={() => { setEditing(false); setError(null); setRatingError(null); setRating(myReview.rating); setBody(myReview.body ?? ""); }}
                disabled={!!busy}
              >
                انصراف
              </button>
            )}
            <button type="submit" className="trade-primary-btn mentor-btn" disabled={!!busy || tooLong}>
              {busy === "save" ? <Spinner size={14} /> : myReview ? "ذخیره‌ی نظر" : "ثبت نظر"}
            </button>
          </div>
        </form>
      )}
      {!editing && error && !confirmDelete && <div className="form-inline-error" role="alert">{error}</div>}
      {confirmDelete && (
        <MentorConfirmDialog
          message="نظرت حذف شود؟"
          hint="امتیاز منتور بدون این نظر دوباره حساب می‌شود."
          confirmLabel="حذف نظر"
          busy={busy === "delete"}
          error={error}
          onConfirm={remove}
          onCancel={() => { setConfirmDelete(false); setError(null); }}
        />
      )}
    </MentorSection>
  );
}
