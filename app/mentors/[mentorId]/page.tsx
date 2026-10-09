"use client";

import { useCallback, useEffect, useState } from "react";
import { TickButton } from "@/components/TickButton";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Activity, AlertCircle, Ban, CalendarDays, Check, CircleSlash, ClipboardList, Clock, Flag, Hourglass, MessageCircle, MessageSquareText, Pencil,
  Send, Star, Trash2, UserRound, Users, X,
} from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorChip, MentorEmpty, MentorField, MentorPage, MentorSection } from "@/components/MentorUI";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { CertificateMark, MentorTag, RatingInline, RatingStars, categoryLabel } from "@/components/MentorBadges";
import { MentorReportModal } from "@/components/MentorReportModal";
import { MentorConfirmDialog } from "@/components/MentorConfirmDialog";
import { MentorSheet } from "@/components/MentorMotion";
import { SavedMentorsProvider, MentorSaveButton } from "@/components/MentorSaved";
import { MentorPlatformNotice } from "@/components/MentorPlatformNotice";
import { MentorTermsAcceptance, isMentorTermsError, mentorTermsPayload, useMentorTermsStatus } from "@/components/MentorTermsAcceptance";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import type { MentorProfileResponse, MyMentorship, Review, ReportTargetType } from "@/lib/mentorTypes";
import { fmtDate, fmtRelative, networkError, readApiError } from "@/lib/mentorFormat";
import { tr } from "@/lib/i18n";
import { faNum } from "@/lib/jalali";
import { INTAKE_ANSWER_MAX, availabilityShort, responseTimeLabel } from "@/lib/mentorAvailability";
import type { AvailabilityState, MyWaitlist } from "@/lib/mentorTypes";
import { MentorWaitlistAction } from "@/components/MentorWaitlistAction";
import { fetchMentorProfile } from "@/lib/mentorProfileCache";
import { GoldenName } from "@/components/GoldenName";

const MESSAGE_MAX = 500;
const REVIEW_MAX = 1000;
const CHIP = { size: 13, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN_SM = { size: 14, strokeWidth: 1.75, "aria-hidden": true } as const;
const SECTION = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;

export default function MentorProfilePage() {
  return (
    <MentorPageShell back={{ href: "/mentors", label: tr("مربی‌ها", "Mentors") }}>
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
      const res = await fetchMentorProfile(mentorId);
      if (res.status === 404) { setError({ msg: tr("این مربی پیدا نشد یا پروفایلش منتشر نشده است", "This mentor wasn't found or their profile isn't published"), retry: false }); return; }
      if (res.status === 403) { setError({ msg: await readApiError(res, tr("اجازه‌ی دیدن این پروفایل را نداری", "You don't have permission to view this profile")), retry: false }); return; }
      if (!res.ok) { setError({ msg: await readApiError(res, tr("پروفایل دریافت نشد؛ دوباره تلاش کن", "Couldn't load the profile. Try again")), retry: true }); return; }
      setData(await res.json());
    } catch {
      setError({ msg: networkError(), retry: true });
    }
  }, [mentorId]);

  useEffect(() => { load(); }, [load]);

  if (error) return <MentorErrorState message={error.msg} onRetry={error.retry ? load : undefined} />;
  if (!data) return <LoadingBlock />;

  const { mentor, reviews, myMentorship, canReview, myReview } = data;
  const isSelf = !!myId && myId === mentor.userId;
  const role = mentor.categories.includes("ROUTINE") && mentor.routineRole?.trim() ? mentor.routineRole.trim() : null;
  const responseLabel = responseTimeLabel(mentor.responseTimeHours);
  const hasAbout = !!mentor.bio || mentor.specialties.length > 0;

  return (
    <SavedMentorsProvider initialSaved={isSelf ? undefined : { userId: mentor.userId, saved: !!data.saved }}>
      <MentorPage className="mentor-profile">
        {/* سر: هویت، اکشن‌های کوچک (نشانک، گزارش) در انتهای ردیف */}
        <div className="mentor-hero">
          <div className="mentor-hero-top">
            <MentorUserAvatar name={mentor.name} avatarUrl={mentor.avatarUrl} size={56} />
            <div className="mentor-hero-id">
              {role && <div className="rp-card-eyebrow">{role}</div>}
              <div className="mentor-hero-title">
                <h1 className="mentor-hero-name"><GoldenName golden={mentor.golden} staff={mentor.staff}>{mentor.name}</GoldenName></h1>
                <CertificateMark certifications={mentor.certifications} size={16} />
              </div>
              {mentor.headline && <p className="mentor-hero-headline">{mentor.headline}</p>}
              <div className="mentor-hero-meta">
                <RatingInline value={mentor.ratingAvg} count={mentor.ratingCount} withWord />
                {mentor.memberSince && <span>{tr("تاریخ عضویت:", "Member since:")} {fmtDate(mentor.memberSince)}</span>}
              </div>
            </div>
            {!isSelf && (
              <div className="mentor-hero-tools">
                <MentorSaveButton mentor={{ userId: mentor.userId, name: mentor.name }} />
                <button
                  type="button"
                  className="trade-icon-btn mentor-report-flag"
                  onClick={() => setReport({ type: "USER", id: mentor.userId })}
                  aria-label={tr("گزارش این مربی", "Report this mentor")}
                  title={tr("گزارش این مربی", "Report this mentor")}
                >
                  <Flag size={15} strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            )}
          </div>

          {mentor.categories.length > 0 && (
            <div className="mentor-tags">
              {mentor.categories.map((c) => <MentorTag key={c}>{categoryLabel(c)}</MentorTag>)}
            </div>
          )}

          <dl className="mentor-hero-stats">
            <div><dt><Users {...CHIP} /> {tr("شاگرد فعال", "Active students")}</dt><dd>{faNum(mentor.activeStudents)}</dd></div>
            <div><dt><UserRound {...CHIP} /> {tr("کل شاگردها", "Total students")}</dt><dd>{faNum(mentor.totalStudents)}</dd></div>
            <div><dt><ClipboardList {...CHIP} /> {tr("برنامه‌ی تمام‌شده", "Completed programs")}</dt><dd>{faNum(mentor.completedPrograms)}</dd></div>
            <div><dt><Activity {...CHIP} /> {tr("آخرین فعالیت", "Last active")}</dt><dd className="is-text">{fmtRelative(mentor.lastActiveAt)}</dd></div>
          </dl>

          {/* عدم حضور فقط یک‌بار، در یک بلوک فشرده (تاریخ بازگشت + پیام) */}
          {mentor.awayUntil && (
            <div className="mentor-away" role="note">
              <CalendarDays size={16} strokeWidth={1.75} aria-hidden />
              <div className="mentor-away-body">
                <span className="mentor-away-title">{tr(`در دسترس نیست تا ${fmtDate(mentor.awayUntil)}`, `Unavailable until ${fmtDate(mentor.awayUntil)}`)}</span>
                {mentor.awayMessage && <span className="mentor-away-text">{mentor.awayMessage}</span>}
              </div>
            </div>
          )}
          {responseLabel && !mentor.awayUntil && (
            <p className="mentor-hero-note"><Clock {...CHIP} /> {responseLabel}</p>
          )}

          {!isSelf && (
            <ConnectAction
              mentorId={mentor.userId}
              mentorName={mentor.name}
              mentorCategories={mentor.categories}
              accepting={mentor.acceptingStudents}
              availability={mentor.availability ?? (mentor.acceptingStudents ? "OPEN" : "CLOSED")}
              awayUntil={mentor.awayUntil ?? null}
              intakeQuestions={mentor.intakeQuestions ?? []}
              mine={myMentorship}
              onChange={(m) => setData((d) => (d ? { ...d, myMentorship: m } : d))}
              waitlist={data.waitlist ?? null}
              waitlistCount={data.waitlistCount ?? 0}
              onWaitlist={(w) => setData((d) => (d ? { ...d, waitlist: w } : d))}
              onStale={load}
            />
          )}
        </div>

        {hasAbout && (
          <MentorSection title={tr("درباره‌ی مربی", "About the mentor")} icon={<UserRound {...SECTION} />}>
            {mentor.bio && <p className="mentor-bio">{mentor.bio}</p>}
            {mentor.specialties.length > 0 && (
              <div className="mentor-tags">
                {mentor.specialties.map((s) => <MentorTag key={s}>{s}</MentorTag>)}
              </div>
            )}
          </MentorSection>
        )}

        {!isSelf && (canReview || myReview) && (
          <MyReviewBox mentorId={mentor.userId} myReview={myReview} onChanged={load} />
        )}

        <MentorSection
          title={tr("نظرها", "Reviews")}
          icon={<MessageSquareText {...SECTION} />}
          count={reviews.length ? faNum(mentor.ratingCount || reviews.length) : undefined}
        >
          {reviews.length === 0 ? (
            <MentorEmpty>{tr("هنوز نظری ثبت نشده است", "No reviews yet")}</MentorEmpty>
          ) : (
            reviews.map((r) => (
              <ReviewRow key={r.id} review={r} canReport={!isSelf && r.id !== myReview?.id} onReport={() => setReport({ type: "REVIEW", id: r.id })} />
            ))
          )}
        </MentorSection>
      </MentorPage>

      <MentorPlatformNotice />
      {report && <MentorReportModal targetType={report.type} targetId={report.id} onClose={() => setReport(null)} />}
    </SavedMentorsProvider>
  );
}

function ReviewRow({ review, canReport, onReport }: { review: Review; canReport: boolean; onReport: () => void }) {
  return (
    <div className="mentor-review">
      <MentorUserAvatar name={review.student.name} avatarUrl={review.student.avatarUrl} size={36} />
      <div className="mentor-review-body">
        <div className="mentor-review-head">
          <span className="mentor-review-name"><GoldenName golden={review.student.golden} staff={review.student.staff}>{review.student.name || tr("شاگرد", "Student")}</GoldenName></span>
          <RatingStars value={review.rating} />
          <span className="mentor-review-date">{fmtDate(review.createdAt)}</span>
        </div>
        {review.body && <p className="mentor-review-text">{review.body}</p>}
      </div>
      {canReport && (
        <button type="button" className="trade-icon-btn mentor-review-flag" onClick={onReport} aria-label={tr("گزارش این نظر", "Report this review")} title={tr("گزارش این نظر", "Report this review")}>
          <Flag {...BTN_SM} />
        </button>
      )}
    </div>
  );
}

/** اکشن اتصال — حالتش از myMentorship می‌آید. خطا بالای دکمه‌ها. */
function ConnectAction({
  mentorId, mentorName, mentorCategories, accepting, availability, awayUntil, intakeQuestions, mine, onChange, waitlist, waitlistCount, onWaitlist, onStale,
}: {
  mentorId: string;
  mentorName: string;
  mentorCategories: string[];
  accepting: boolean;
  availability: AvailabilityState;
  awayUntil: string | null;
  intakeQuestions: string[];
  mine: MyMentorship | null;
  onChange: (m: MyMentorship | null) => void;
  /** صف انتظار (components/MentorWaitlistAction.tsx) */
  waitlist: MyWaitlist | null;
  waitlistCount: number;
  onWaitlist: (w: MyWaitlist | null) => void;
  onStale: () => void;
}) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  // پذیرش دعوت منتور هم پذیرش «شرایط منتورها» را لازم دارد (lib/mentorTerms.ts)
  const invited = mine?.status === "PENDING" && mine.initiatedBy === "MENTOR";
  const terms = useMentorTermsStatus();
  const needTerms = invited && !terms.loading && !terms.studentAccepted;
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

  async function patch(action: "accept" | "reject" | "cancel") {
    if (!mine) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/mentorships/${mine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(action === "accept" ? mentorTermsPayload(needTerms && termsAccepted) : {}) }),
      });
      if (res.status === 400 && action === "accept") {
        const j = await res.json().catch(() => null);
        if (isMentorTermsError(j)) { setTermsAccepted(false); setTermsError(j.error); terms.refresh(); return; }
        setError(typeof j?.error === "string" ? j.error : networkError());
        return;
      }
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
      setError(networkError());
    } finally {
      setBusy(null);
    }
  }

  let body: React.ReactNode;
  let waitlistBody = false;
  if (mine?.status === "ACTIVE") {
    body = (
      <Link href={`/mentorship/${mine.id}`} className="trade-primary-btn mentor-btn">
        <MessageCircle {...BTN} /> {tr("باز کردن گفت‌وگو", "Open chat")}
      </Link>
    );
  } else if (mine?.status === "PENDING" && mine.initiatedBy === "STUDENT") {
    body = (
      <>
        <MentorChip tone="info" icon={<Hourglass {...CHIP} />}>{tr("منتظر پاسخ مربی", "Waiting for the mentor's reply")}</MentorChip>
        <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => { setError(null); setConfirmCancel(true); }} disabled={!!busy}>
          <X {...BTN_SM} /> {tr("لغو درخواست", "Cancel request")}
        </button>
      </>
    );
  } else if (mine?.status === "PENDING" && mine.initiatedBy === "MENTOR") {
    body = (
      <>
        <MentorChip tone="warn" icon={<AlertCircle {...CHIP} />} title={tr("این مربی تو را به‌عنوان شاگرد دعوت کرده است", "This mentor has invited you to be their student")}>{tr("منتظر پاسخ تو", "Waiting for your reply")}</MentorChip>
        {needTerms && (
          <div style={{ width: "100%" }}>
            <MentorTermsAcceptance
              role="student"
              checked={termsAccepted}
              onChange={(v) => { setTermsAccepted(v); setTermsError(null); }}
              error={termsError}
              disabled={!!busy}
            />
          </div>
        )}
        <div className="mentor-btn-group" style={{ width: "100%" }}>
          <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => patch("reject")} disabled={!!busy}>
            {busy === "reject" ? <Spinner size={14} /> : <><X {...BTN} /> {tr("رد دعوت", "Decline invite")}</>}
          </button>
          <button type="button" className="trade-primary-btn mentor-btn" onClick={() => patch("accept")} disabled={!!busy || terms.loading || (needTerms && !termsAccepted)}>
            {busy === "accept" ? <Spinner size={14} /> : <><Check {...BTN} /> {tr("پذیرفتن دعوت", "Accept invite")}</>}
          </button>
        </div>
      </>
    );
  } else if (mine?.status === "BLOCKED") {
    body = <MentorChip tone="danger" icon={<Ban {...CHIP} />}>{tr("ارتباط با این مربی ممکن نیست", "You can't contact this mentor")}</MentorChip>;
  } else if (availability === "AWAY") {
    // عدم حضور بالاتر یک‌بار در بلوک «در دسترس نیست تا …» آمده؛ این‌جا تکرار نمی‌شود
    body = null;
  } else if (availability === "FULL" || waitlist?.status === "OFFERED") {
    // ظرفیت تکمیل → صف انتظار؛ نوبت رسیده همان فرم درخواست عادی را باز می‌کند
    waitlistBody = true;
    body = (
      <MentorWaitlistAction
        mentorId={mentorId}
        mentorName={mentorName}
        waitlist={waitlist}
        waitlistCount={waitlistCount}
        onChange={onWaitlist}
        onRequest={() => setRequestOpen(true)}
        onStale={onStale}
      />
    );
  } else if (availability !== "OPEN") {
    // بسته — سرور هم همین را اعمال می‌کند
    body = (
      <MentorChip tone="neutral" icon={<CircleSlash {...CHIP} />}>
        {availabilityShort(availability, awayUntil)}
      </MentorChip>
    );
  } else if (!accepting) {
    body = <MentorChip tone="neutral" icon={<CircleSlash {...CHIP} />}>{tr("شاگرد جدید نمی‌پذیرد", "Not accepting students")}</MentorChip>;
  } else {
    body = (
      <button type="button" className="trade-primary-btn mentor-btn" onClick={() => setRequestOpen(true)}>
        <Send {...BTN} className="dir-flip" /> {mine && (mine.status === "ENDED" || mine.status === "REJECTED") ? tr("ارسال دوباره‌ی درخواست", "Send request again") : tr("ارسال درخواست", "Send request")}
      </button>
    );
  }

  return (
    <>
      {error && !confirmCancel && <div className="form-inline-error" role="alert">{error}</div>}
      {/* MentorWaitlistAction خطا و ردیف دکمه‌هایش را خودش می‌چیند */}
      {waitlistBody ? body : body && <div className="mentor-hero-actions">{body}</div>}
      {(
        <RequestModal
          open={requestOpen}
          mentorId={mentorId}
          mentorName={mentorName}
          mentorCategories={mentorCategories}
          intakeQuestions={intakeQuestions}
          onClose={() => setRequestOpen(false)}
          onDone={(m) => { setRequestOpen(false); onChange(m); }}
          onStale={onStale}
        />
      )}
      {confirmCancel && (
        <MentorConfirmDialog
          message={tr(`درخواست به ${mentorName} لغو شود؟`, `Cancel your request to ${mentorName}?`)}
          hint={tr("بعدا می‌توانی دوباره درخواست بدهی.", "You can send a request again later.")}
          confirmLabel={tr("لغو درخواست", "Cancel request")}
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
  open, mentorId, mentorName, mentorCategories, intakeQuestions, onClose, onDone, onStale,
}: {
  open: boolean;
  mentorId: string;
  mentorName: string;
  mentorCategories: string[];
  intakeQuestions: string[];
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
  // جواب به سؤال‌های پذیرش منتور — همه لازم، به همان ترتیب
  const [answers, setAnswers] = useState<string[]>(() => intakeQuestions.map(() => ""));
  const [answerErrs, setAnswerErrs] = useState<(string | null)[]>([]);
  const len = message.trim().length;
  const tooLong = len > MESSAGE_MAX;
  // پذیرش «شرایط استفاده از بخش منتورها» (lib/mentorTerms.ts) — فقط اگر نسخه‌ی جاری را نپذیرفته
  const terms = useMentorTermsStatus();
  const needTerms = !terms.loading && !terms.studentAccepted;
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

  async function submit() {
    if (mentorCategories.length > 0 && cats.length === 0) { setCatsError(tr("حداقل یک حوزه انتخاب کن", "Choose at least one area")); return; }
    if (needTerms && !termsAccepted) { setTermsError(tr("برای ارسال درخواست، شرایط را بپذیر", "Accept the terms to send your request")); return; }
    if (tooLong) return;
    const aErrs = intakeQuestions.map((_, i) => {
      const a = (answers[i] ?? "").trim();
      if (!a) return tr("جواب این سؤال را بنویس", "Answer this question");
      if (a.length > INTAKE_ANSWER_MAX) return tr(`حداکثر ${faNum(INTAKE_ANSWER_MAX)} نویسه`, `Up to ${faNum(INTAKE_ANSWER_MAX)} characters`);
      return null;
    });
    setAnswerErrs(aErrs);
    if (aErrs.some(Boolean)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mentorships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId,
          message: message.trim() || undefined,
          ...(mentorCategories.length ? { categories: cats } : {}),
          ...(intakeQuestions.length ? { intakeAnswers: answers.map((a) => a.trim()) } : {}),
          ...mentorTermsPayload(needTerms && termsAccepted),
        }),
      });
      if (res.status === 400) {
        const j = await res.json().catch(() => null);
        if (isMentorTermsError(j)) { setTermsAccepted(false); setTermsError(j.error); terms.refresh(); return; }
        setError(typeof j?.error === "string" ? j.error : tr("درخواست ارسال نشد؛ دوباره تلاش کن", "Couldn't send the request. Try again"));
        return;
      }
      // ۴۰۹: درخواست باز/رابطه‌ی فعال، یا پذیرش بسته/ظرفیت پر/عدم حضور — پیام سرور دقیق‌تر است
      if (res.status === 409) { setError(await readApiError(res, tr("با این مربی درخواست باز یا رابطه‌ی فعال داری", "You already have an open request or an active mentorship with this mentor"))); onStale(); return; }
      if (!res.ok) { setError(await readApiError(res, tr("درخواست ارسال نشد؛ دوباره تلاش کن", "Couldn't send the request. Try again"))); return; }
      const d = await res.json().catch(() => null);
      const m = d?.mentorship;
      if (m?.id) onDone({ id: m.id, status: m.status ?? "PENDING", initiatedBy: m.initiatedBy ?? "STUDENT" });
      else { onClose(); onStale(); }
    } catch {
      setError(networkError());
    } finally {
      setBusy(false);
    }
  }

  return (
    <MentorSheet open={open} onClose={onClose} title={tr(`درخواست مربی‌گری از ${mentorName}`, `Mentorship request to ${mentorName}`)} dismissible={!busy}>
      <div className="mentor-form">
        <p className="mentor-muted">{tr("مربی تا وقتی در بخش دسترسی‌ها اجازه ندهی، هیچ بخشی از برنامه‌هایت را نمی‌بیند.", "Your mentor can't see any part of your programs until you allow it in the access settings.")}</p>
        {mentorCategories.length > 1 && (
          <MentorField label={tr("حوزه‌ی همکاری", "Area of work")} error={catsError}>
            <div role="group" aria-label={tr("حوزه‌ی همکاری", "Area of work")}>
              {mentorCategories.map((c) => (
                <label key={c} className="mentor-check">
                  <TickButton
                    shape="square" size={22}
                    checked={cats.includes(c)}
                    onToggle={() => { setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c])); setCatsError(null); }}
                  />
                  <span className="mentor-check-label">{categoryLabel(c)}</span>
                </label>
              ))}
            </div>
          </MentorField>
        )}
        {intakeQuestions.map((q, i) => (
          <MentorField key={i} label={q} htmlFor={`mentor-req-q${i}`} error={answerErrs[i]}>
            <textarea
              id={`mentor-req-q${i}`}
              className="wsearch-newform-name trade-glass-field"
              rows={2}
              value={answers[i] ?? ""}
              maxLength={INTAKE_ANSWER_MAX + 20}
              onChange={(e) => {
                const v = e.target.value;
                setAnswers((xs) => xs.map((x, j) => (j === i ? v : x)));
                setAnswerErrs((xs) => xs.map((x, j) => (j === i ? null : x)));
                setError(null);
              }}
            />
          </MentorField>
        ))}
        <MentorField
          label={tr("پیام", "Message")}
          htmlFor="mentor-req-msg"
          optional
          error={tooLong ? tr(`پیام حداکثر ${faNum(MESSAGE_MAX)} نویسه است`, `Messages can be up to ${faNum(MESSAGE_MAX)} characters`) : null}
          hint={tr(`${faNum(len)} از ${faNum(MESSAGE_MAX)} نویسه`, `${faNum(len)} of ${faNum(MESSAGE_MAX)} characters`)}
        >
          <textarea
            id="mentor-req-msg"
            className="wsearch-newform-name trade-glass-field"
            rows={4}
            value={message}
            maxLength={MESSAGE_MAX + 50}
            onChange={(e) => { setMessage(e.target.value); setError(null); }}
            placeholder={tr("مثلا «برای کنکور تجربی برنامه‌ی هفتگی می‌خواهم»", "For example: \"I'd like a weekly plan for my entrance exam\"")}
            aria-invalid={tooLong}
          />
        </MentorField>
        {needTerms && (
          <MentorTermsAcceptance
            role="student"
            checked={termsAccepted}
            onChange={(v) => { setTermsAccepted(v); setTermsError(null); }}
            error={termsError}
            disabled={busy}
          />
        )}
      </div>
      {error && <div className="form-inline-error" role="alert">{error}</div>}
      <div className="trade-modal-actions">
        <button type="button" className="account-outline-btn mentor-btn" onClick={onClose} disabled={busy}>{tr("انصراف", "Cancel")}</button>
        <button type="button" className="trade-primary-btn mentor-btn" onClick={submit} disabled={busy || tooLong || terms.loading}>
          {busy ? <Spinner size={14} /> : tr("ارسال درخواست", "Send request")}
        </button>
      </div>
    </MentorSheet>
  );
}

/** نوشتن/ویرایش/حذف نظر خودم */
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
    if (rating < 1 || rating > 5) { setRatingError(tr("امتیاز را انتخاب کن", "Choose a rating")); return; }
    if (tooLong) return;
    setBusy("save");
    setError(null);
    try {
      const res = await fetch(`/api/mentors/${mentorId}/reviews`, {
        method: myReview ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body: body.trim() || undefined }),
      });
      if (res.status === 409) { setError(tr("برای این مربی قبلا نظر ثبت کرده‌ای", "You've already reviewed this mentor")); onChanged(); return; }
      if (!res.ok) { setError(await readApiError(res, tr("نظر ثبت نشد؛ دوباره تلاش کن", "Couldn't save your review. Try again"))); return; }
      setEditing(false);
      onChanged();
    } catch {
      setError(networkError());
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/mentors/${mentorId}/reviews`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) { setError(await readApiError(res, tr("نظر حذف نشد؛ دوباره تلاش کن", "Couldn't delete your review. Try again"))); return; }
      setConfirmDelete(false);
      onChanged();
    } catch {
      setError(networkError());
    } finally {
      setBusy(null);
    }
  }

  return (
    <MentorSection
      title={myReview ? tr("نظر تو", "Your review") : tr("ثبت نظر", "Write a review")}
      icon={<Star {...SECTION} />}
      desc={myReview ? undefined : tr("نظر پس از ثبت برای همه دیده می‌شود و در امتیاز مربی حساب می‌شود.", "Your review is visible to everyone once posted and counts toward the mentor's rating.")}
    >
      {!editing && myReview ? (
        <>
          <ReviewRow review={myReview} canReport={false} onReport={() => {}} />
          <div className="mentor-btn-group is-end">
            <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => { setError(null); setConfirmDelete(true); }}>
              <Trash2 {...BTN_SM} /> {tr("حذف نظر", "Delete review")}
            </button>
            <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => setEditing(true)}>
              <Pencil {...BTN_SM} /> {tr("ویرایش نظر", "Edit review")}
            </button>
          </div>
        </>
      ) : (
        <form className="mentor-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <MentorField label={tr("امتیاز", "Rating")} error={ratingError}>
            <div className="mentor-star-input" role="radiogroup" aria-label={tr("امتیاز", "Rating")}>
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={rating === i}
                  aria-label={tr(`${faNum(i)} ستاره`, `${faNum(i)} ${i === 1 ? "star" : "stars"}`)}
                  className={i <= rating ? "on" : undefined}
                  onClick={() => { setRating(i); setRatingError(null); }}
                >
                  <Star size={24} strokeWidth={1.75} fill={i <= rating ? "currentColor" : "none"} aria-hidden />
                </button>
              ))}
            </div>
          </MentorField>
          <MentorField
            label={tr("نظر تو", "Your review")}
            htmlFor="mentor-review-body"
            optional
            error={tooLong ? tr(`نظر حداکثر ${faNum(REVIEW_MAX)} نویسه است`, `Reviews can be up to ${faNum(REVIEW_MAX)} characters`) : null}
          >
            <textarea
              id="mentor-review-body"
              className="wsearch-newform-name trade-glass-field"
              rows={3}
              value={body}
              maxLength={REVIEW_MAX + 50}
              onChange={(e) => setBody(e.target.value)}
              placeholder={tr("مثلا «برنامه‌ها دقیق و قابل اجرا بود»", "For example: \"The programs were precise and doable\"")}
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
                {tr("انصراف", "Cancel")}
              </button>
            )}
            <button type="submit" className="trade-primary-btn mentor-btn" disabled={!!busy || tooLong}>
              {busy === "save" ? <Spinner size={14} /> : myReview ? tr("ذخیره‌ی نظر", "Save review") : tr("ثبت نظر", "Post review")}
            </button>
          </div>
        </form>
      )}
      {!editing && error && !confirmDelete && <div className="form-inline-error" role="alert">{error}</div>}
      {confirmDelete && (
        <MentorConfirmDialog
          message={tr("نظرت حذف شود؟", "Delete your review?")}
          hint={tr("امتیاز مربی بدون این نظر دوباره حساب می‌شود.", "The mentor's rating will be recalculated without this review.")}
          confirmLabel={tr("حذف نظر", "Delete review")}
          busy={busy === "delete"}
          error={error}
          onConfirm={remove}
          onCancel={() => { setConfirmDelete(false); setError(null); }}
        />
      )}
    </MentorSection>
  );
}
