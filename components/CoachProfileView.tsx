"use client";

import "./coach.css";
import "./coach-discover.css";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { Bookmark, Check, ChevronRight, Copy, Flag, Pencil, X } from "lucide-react";
import { SmartLink } from "./SmartLink";
import { AuthGate } from "./AuthGate";
import { PageLoader } from "./PageLoader";
import { Spinner } from "./Spinner";
import { CoachAvatar } from "./CoachAvatar";
import { CoachVerifiedMark } from "./CoachDiscoverCard";
import { CoachStars } from "./CoachProfileReview";
import { GoldenName } from "./GoldenName";
import { MentorKebabMenu, type MentorMenuAction } from "./MentorKebabMenu";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { MentorReportModal } from "./MentorReportModal";
import { MentorPlatformNotice } from "./MentorPlatformNotice";
import { MentorDashError } from "./MentorDashKit";
import { MentorWaitlistAction } from "./MentorWaitlistAction";
import { SavedMentorsProvider, useSavedMentors } from "./MentorSaved";
import { MentorTermsAcceptance, isMentorTermsError, mentorTermsPayload, useMentorTermsStatus } from "./MentorTermsAcceptance";
import { categoryLabel } from "./MentorBadges";
import { fetchMentorProfile } from "@/lib/mentorProfileCache";
import { availabilityShort } from "@/lib/mentorAvailability";
import { fmtDate, networkError, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";
import type { MentorProfileResponse, MyMentorship, MyWaitlist, ReportTargetType, Review } from "@/lib/mentorTypes";
import { tr, iso } from "@/lib/i18n";

// شیت‌ها فقط با باز شدن لود می‌شن
const RequestSheet = dynamic(() => import("./CoachRequestSheet").then((m) => m.CoachRequestSheet), { ssr: false });
const ReviewSheet = dynamic(() => import("./CoachProfileReview").then((m) => m.CoachProfileReviewSheet), { ssr: false });

/**
 * صفحه‌ی مربی (مشترک بین /mentors/[mentorId] و /c/[username]): هاله، آواتار بزرگ، نام + تیک، عنوان،
 * سه عدد، درباره، تخصص‌ها، «چطور کار می‌کنیم»، نظرها و دکمه‌ی اصلی چسبان «شروع با {نام}».
 * initial = داده‌ی سمت سرور (برای مهمان و سئو)؛ کاربر واردشده همیشه داده‌ی شخصی تازه می‌گیره.
 */
export function CoachProfileView({ mentorId, initial, username, path }: { mentorId: string; initial?: MentorProfileResponse | null; username?: string | null; path: string }) {
  return (
    <SavedMentorsProvider initialSaved={initial ? { userId: mentorId, saved: !!initial.saved } : undefined}>
      <Profile mentorId={mentorId} initial={initial ?? null} username={username ?? null} path={path} />
    </SavedMentorsProvider>
  );
}

function SaveButton({ mentorId, name }: { mentorId: string; name: string }) {
  const saved = useSavedMentors();
  if (!saved) return null;
  const on = saved.isSaved(mentorId);
  return (
    <button
      type="button" className="btn btn-ghost btn-icon chd-save" aria-pressed={on}
      aria-label={on ? tr(`برداشتن ${name} از ذخیره‌ها`, `Remove ${iso(name)} from saved`) : tr(`ذخیره‌ی ${name}`, `Save ${iso(name)}`)}
      onClick={() => saved.toggle({ userId: mentorId, name } as never)}
    >
      <Bookmark size={20} fill={on ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}

function Profile({ mentorId, initial, username, path }: { mentorId: string; initial: MentorProfileResponse | null; username: string | null; path: string }) {
  const { data: session, status } = useSession();
  const myId = (session?.user as { id?: string } | undefined)?.id;
  const authed = status === "authenticated";
  const [data, setData] = useState<MentorProfileResponse | null>(initial);
  const [personal, setPersonal] = useState(false);
  const [error, setError] = useState<{ msg: string; retry: boolean } | null>(null);
  const [report, setReport] = useState<{ type: ReportTargetType; id: string } | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [host, setHost] = useState("");
  useEffect(() => { setHost(window.location.host); }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchMentorProfile(mentorId);
      if (res.status === 404) { setError({ msg: tr("این مربی پیدا نشد یا صفحه‌اش منتشر نشده", "This mentor wasn't found or their page isn't published"), retry: false }); return; }
      if (res.status === 403) { setError({ msg: await readApiError(res, tr("اجازه‌ی دیدن این صفحه را نداری", "You don't have permission to view this page")), retry: false }); return; }
      if (!res.ok) { setError({ msg: await readApiError(res, tr("صفحه‌ی مربی دریافت نشد؛ دوباره تلاش کن", "Couldn't load this page. Try again")), retry: true }); return; }
      setData(await res.json());
      setPersonal(true);
    } catch {
      setError({ msg: networkError(), retry: true });
    }
  }, [mentorId]);
  useEffect(() => { if (authed) load(); }, [authed, load]);

  const mentor = data?.mentor ?? null;
  const mine = data?.myMentorship ?? null;
  const isSelf = !!myId && !!mentor && myId === mentor.userId;
  const availability = mentor ? (mentor.availability ?? (mentor.acceptingStudents ? "OPEN" : "CLOSED")) : "OPEN";
  const canRequest = !!mentor && !isSelf && (!mine || mine.status === "ENDED" || mine.status === "REJECTED") && availability === "OPEN" && mentor.acceptingStudents;

  // ?start=1 (بعد از ثبت‌نام از لینک کوتاه): شیت درخواست خودکار باز می‌شه
  const startDone = useRef(false);
  useEffect(() => {
    if (startDone.current || !authed || !personal || !mentor) return;
    let want = false;
    try { want = new URLSearchParams(window.location.search).get("start") === "1"; } catch { /* بدون پارامتر */ }
    if (!want) return;
    startDone.current = true;
    try { window.history.replaceState(null, "", window.location.pathname); } catch { /* مهم نیست */ }
    if (canRequest) setRequestOpen(true);
  }, [authed, personal, mentor, canRequest]);

  const setMine = (m: MyMentorship | null) => setData((d) => (d ? { ...d, myMentorship: m } : d));
  const setWaitlist = (w: MyWaitlist | null) => setData((d) => (d ? { ...d, waitlist: w } : d));

  async function patch(action: "accept" | "reject" | "cancel", acceptTerms = false) {
    if (!mine) return false;
    setBusy(action);
    setActionError(null);
    try {
      const res = await fetch(`/api/mentorships/${mine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(action === "accept" ? mentorTermsPayload(acceptTerms) : {}) }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        if (res.status === 400 && isMentorTermsError(j)) { setActionError(j.error); return false; }
        setActionError(typeof j?.error === "string" ? j.error : networkError());
        if (res.status === 409 || res.status === 404) load();
        return false;
      }
      const d = await res.json().catch(() => null);
      const next = d?.mentorship?.status as MyMentorship["status"] | undefined;
      setMine({ ...mine, status: next ?? (action === "accept" ? "ACTIVE" : action === "reject" ? "REJECTED" : "ENDED") });
      return true;
    } catch {
      setActionError(networkError());
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (!data || !mentor) {
    if (status === "loading") return <div className="ch-page"><PageLoader /></div>;
    if (!authed) return <div className="ch-page"><AuthGate message={tr("برای دیدن صفحه‌ی مربی وارد شو", "Sign in to see this mentor's page")} /></div>;
    if (error) return <div className="ch-page"><MentorDashError message={error.msg} onRetry={error.retry ? load : undefined} /></div>;
    return <div className="ch-page"><PageLoader /></div>;
  }

  const first = (mentor.name || "").trim().split(/\s+/)[0] || mentor.name;
  const user = { id: mentor.userId, name: mentor.name, lastName: null, username, avatarUrl: mentor.avatarUrl, golden: mentor.golden };
  const role = mentor.categories.includes("ROUTINE") && mentor.routineRole?.trim() ? mentor.routineRole.trim() : null;
  const headline = [role, mentor.headline].filter(Boolean).join(" · ");
  const hasRating = mentor.ratingCount > 0 && mentor.ratingAvg > 0;
  const reviews = data.reviews;
  const shortUrl = username && host ? `${host}/c/${username}` : null;

  async function copyLink() {
    if (!username) return;
    try { await navigator.clipboard.writeText(`${window.location.origin}/c/${username}`); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* کلیپ‌بورد در دسترس نیست */ }
  }

  // ── منوی سه‌نقطه ──
  const menu: MentorMenuAction[] = [];
  if (mine?.status === "PENDING" && mine.initiatedBy === "STUDENT") {
    menu.push({ label: tr("لغو درخواست", "Cancel request"), icon: <X size={16} aria-hidden="true" />, danger: true, onClick: () => { setActionError(null); setConfirmCancel(true); } });
  }
  if (authed && !isSelf) menu.push({ label: tr("گزارش این مربی", "Report this mentor"), icon: <Flag size={16} aria-hidden="true" />, onClick: () => setReport({ type: "USER", id: mentor.userId }) });

  return (
    <div className="ch-page">
      <div className="ch-halo" aria-hidden="true" />
      <div className="chpf-top">
        {authed && <SmartLink href="/mentors" className="ch-back" aria-label={tr("برگشت", "Back")}><ChevronRight size={20} className="dir-flip" aria-hidden="true" /></SmartLink>}
        <span className="chpf-top-space" />
        {authed && !isSelf && <SaveButton mentorId={mentor.userId} name={mentor.name} />}
        {menu.length > 0 && <MentorKebabMenu actions={menu} className="btn btn-ghost btn-icon" iconSize={20} label={tr("بیشتر", "More")} />}
      </div>

      <section className="chpf-hero">
        <span className="chpf-avatar"><CoachAvatar user={user} size={104} /></span>
        <h1 className="chpf-name">
          <GoldenName golden={mentor.golden} staff={mentor.staff}>{mentor.name}</GoldenName>
          {mentor.identityVerified && <CoachVerifiedMark size={20} />}
        </h1>
        {headline && <p className="chpf-headline">{headline}</p>}
      </section>

      <div className="chpf-stats">
        <div className="chpf-stat"><b>{hasRating ? faNum(mentor.ratingAvg.toFixed(1)) : "-"}</b><span>{tr(`${faNum(mentor.ratingCount)} نظر`, `${faNum(mentor.ratingCount)} ${mentor.ratingCount === 1 ? "review" : "reviews"}`)}</span></div>
        <div className="chpf-stat"><b>{faNum(mentor.activeStudents)}</b><span>{tr("شاگرد", "Students")}</span></div>
        {mentor.responseTimeHours ? (
          <div className="chpf-stat"><b>{tr(`${faNum(mentor.responseTimeHours)} ساعت`, `${faNum(mentor.responseTimeHours)} h`)}</b><span>{tr("زمان پاسخ", "Reply time")}</span></div>
        ) : (
          <div className="chpf-stat"><b>{faNum(mentor.completedPrograms)}</b><span>{tr("برنامه‌ی تمام‌شده", "Programs done")}</span></div>
        )}
      </div>

      {mentor.awayUntil && (
        <div className="chpf-away" role="note">
          <span>
            {tr(`تا ${fmtDate(mentor.awayUntil)} در دسترس نیست`, `Away until ${fmtDate(mentor.awayUntil)}`)}
            {mentor.awayMessage ? ` - ${mentor.awayMessage}` : ""}
          </span>
        </div>
      )}

      {mentor.bio && (
        <section className="ch-card">
          <p className="chpf-bio">{mentor.bio}</p>
        </section>
      )}

      {(mentor.categories.length > 0 || mentor.specialties.length > 0) && (
        <ul className="chpf-chips" aria-label={tr("تخصص‌ها", "Specialties")}>
          {mentor.categories.map((c) => <li key={`c-${c}`} className="chpf-chip">{categoryLabel(c)}</li>)}
          {mentor.specialties.map((s) => <li key={`s-${s}`} className="chpf-chip">{s}</li>)}
        </ul>
      )}

      <section>
        <h2 className="ch-section-title">{tr("چطور کار می‌کنیم", "How we work")}</h2>
        <ol className="chpf-steps ch-card">
          <li><span className="chpf-step-n">1</span><span>{tr("با هم یک هدف می‌ذاریم", "We set a goal together")}</span></li>
          <li><span className="chpf-step-n">2</span><span>{tr("برنامه میاد توی روتینت", "The plan lands in your routine")}</span></li>
          <li><span className="chpf-step-n">3</span><span>{tr("هر هفته پیشرفتت رو می‌بینم", "I check your progress every week")}</span></li>
        </ol>
      </section>

      <section>
        <h2 className="ch-section-title">{tr("نظرها", "Reviews")}</h2>
        <div className="ch-card">
          {authed && !isSelf && (data.canReview || data.myReview) && (
            <div className="ch-stack" style={{ paddingBlockEnd: reviews.length ? 8 : 0 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setReviewOpen(true)}>
                {data.myReview ? <><Pencil size={16} aria-hidden="true" /> {tr("ویرایش نظر من", "Edit my review")}</> : tr("نظر بده", "Write a review")}
              </button>
            </div>
          )}
          {reviews.length === 0 ? (
            <p className="ch-row-sub" style={{ margin: 0, textAlign: "center", padding: "8px 0" }}>{tr("هنوز نظری ثبت نشده", "No reviews yet")}</p>
          ) : (
            <div className="chpf-reviews">
              {reviews.map((r) => <ReviewRow key={r.id} review={r} canReport={authed && !isSelf && r.id !== data.myReview?.id} onReport={() => setReport({ type: "REVIEW", id: r.id })} />)}
            </div>
          )}
        </div>
      </section>

      <MentorPlatformNotice />

      {/* ── دکمه‌ی اصلی چسبان ── */}
      <div className="chpf-cta">
        {actionError && !confirmCancel && <p className="chpf-error" role="alert">{actionError}</p>}
        <Cta
          authed={authed} isSelf={isSelf} mine={mine} first={first} path={path}
          mentorId={mentor.userId} mentorName={mentor.name}
          availability={availability} accepting={mentor.acceptingStudents} awayUntil={mentor.awayUntil ?? null}
          waitlist={data.waitlist ?? null} waitlistCount={data.waitlistCount ?? 0}
          busy={busy} onOpen={() => setRequestOpen(true)} onPatch={patch} onWaitlist={setWaitlist} onStale={load}
        />
        {shortUrl && (
          <div className="chpf-link">
            <span>{shortUrl}</span>
            <button type="button" className="btn btn-ghost btn-icon" onClick={copyLink} aria-label={copied ? tr("کپی شد", "Copied") : tr("کپی لینک", "Copy link")}>
              {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            </button>
          </div>
        )}
      </div>

      {requestOpen && (
        <RequestSheet
          open mentorId={mentor.userId} mentorName={first} mentorCategories={mentor.categories} intakeQuestions={mentor.intakeQuestions ?? []}
          onClose={() => setRequestOpen(false)} onDone={(m) => { setRequestOpen(false); setMine(m); }} onStale={load}
        />
      )}
      {reviewOpen && (
        <ReviewSheet open mentorId={mentor.userId} myReview={data.myReview} onClose={() => setReviewOpen(false)} onChanged={load} />
      )}
      {confirmCancel && (
        <MentorConfirmDialog
          message={tr(`درخواست به ${first} لغو شود؟`, `Cancel your request to ${iso(first)}?`)}
          hint={tr("بعدا می‌تونی دوباره درخواست بدی.", "You can send a request again later.")}
          confirmLabel={tr("لغو درخواست", "Cancel request")}
          busy={busy === "cancel"} error={actionError}
          onConfirm={async () => { if (await patch("cancel")) setConfirmCancel(false); }}
          onCancel={() => { setConfirmCancel(false); setActionError(null); }}
        />
      )}
      {report && <MentorReportModal targetType={report.type} targetId={report.id} onClose={() => setReport(null)} />}
    </div>
  );
}

function ReviewRow({ review, canReport, onReport }: { review: Review; canReport: boolean; onReport: () => void }) {
  const rUser = { id: review.id, name: review.student.name, lastName: null, username: null, avatarUrl: review.student.avatarUrl, golden: review.student.golden };
  return (
    <div className="chpf-review">
      <CoachAvatar user={rUser} size={36} />
      <div className="chpf-review-body">
        <div className="chpf-review-head">
          <GoldenName golden={review.student.golden} staff={review.student.staff}>{review.student.name || tr("شاگرد", "Student")}</GoldenName>
          <CoachStars value={review.rating} />
          <span className="chpf-review-date">{fmtDate(review.createdAt)}</span>
        </div>
        {review.body && <p className="chpf-review-text">{review.body}</p>}
      </div>
      {canReport && (
        <button type="button" className="btn btn-ghost btn-icon" onClick={onReport} aria-label={tr("گزارش این نظر", "Report this review")}>
          <Flag size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** دکمه‌ی اصلی صفحه؛ حالتش از رابطه‌ی من با مربی و وضعیت پذیرش میاد */
function Cta({
  authed, isSelf, mine, first, path, mentorId, mentorName, availability, accepting, awayUntil, waitlist, waitlistCount, busy, onOpen, onPatch, onWaitlist, onStale,
}: {
  authed: boolean; isSelf: boolean; mine: MyMentorship | null; first: string; path: string; mentorId: string; mentorName: string;
  availability: "OPEN" | "CLOSED" | "FULL" | "AWAY"; accepting: boolean; awayUntil: string | null;
  waitlist: MyWaitlist | null; waitlistCount: number; busy: string | null;
  onOpen: () => void; onPatch: (a: "accept" | "reject", acceptTerms?: boolean) => Promise<boolean>; onWaitlist: (w: MyWaitlist | null) => void; onStale: () => void;
}) {
  const terms = useMentorTermsStatus();
  const [termsOk, setTermsOk] = useState(false);
  const label = tr(`شروع با ${first}`, `Start with ${iso(first)}`);

  if (!authed) {
    const back = encodeURIComponent(`${path}?start=1`);
    return (
      <>
        <SmartLink href={`/auth/signup?callbackUrl=${back}`} className="btn btn-primary btn-lg">{label}</SmartLink>
        <SmartLink href={`/auth/login?callbackUrl=${back}`} className="btn btn-ghost btn-sm">{tr("حساب داری؟ وارد شو", "Have an account? Log in")}</SmartLink>
      </>
    );
  }
  if (isSelf) return <SmartLink href="/mentor/settings" className="btn btn-primary btn-lg"><Pencil size={18} aria-hidden="true" /> {tr("ویرایش صفحه‌ی من", "Edit my page")}</SmartLink>;
  if (mine?.status === "ACTIVE") return <SmartLink href={`/mentorship/${mine.id}`} className="btn btn-primary btn-lg">{tr("رفتن به گفت‌وگو", "Go to chat")}</SmartLink>;
  if (mine?.status === "PENDING" && mine.initiatedBy === "STUDENT") {
    return <button type="button" className="btn btn-primary btn-lg" disabled>{tr("درخواستت فرستاده شد", "Your request was sent")}</button>;
  }
  if (mine?.status === "PENDING") {
    const needTerms = !terms.loading && !terms.studentAccepted;
    return (
      <>
        <p className="chpf-cta-note">{tr(`${first} تو را دعوت کرده`, `${iso(first)} invited you`)}</p>
        {needTerms && <MentorTermsAcceptance role="student" checked={termsOk} onChange={setTermsOk} disabled={!!busy} />}
        <button type="button" className={`btn btn-primary btn-lg${busy === "accept" ? " is-loading" : ""}`} disabled={!!busy || terms.loading || (needTerms && !termsOk)} onClick={() => onPatch("accept", needTerms && termsOk)}>
          {busy === "accept" ? <Spinner size={16} /> : tr("پذیرفتن دعوت", "Accept invite")}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => onPatch("reject")}>{busy === "reject" ? <Spinner size={14} /> : tr("رد دعوت", "Decline")}</button>
      </>
    );
  }
  if (mine?.status === "BLOCKED") return <p className="chpf-cta-note">{tr("ارتباط با این مربی ممکن نیست", "You can't contact this mentor")}</p>;
  if (availability === "AWAY") return <p className="chpf-cta-note">{availabilityShort("AWAY", awayUntil)}</p>;
  if (availability === "FULL" || waitlist?.status === "OFFERED") {
    return <MentorWaitlistAction mentorId={mentorId} mentorName={mentorName} waitlist={waitlist} waitlistCount={waitlistCount} onChange={onWaitlist} onRequest={onOpen} onStale={onStale} />;
  }
  if (availability !== "OPEN" || !accepting) return <p className="chpf-cta-note">{tr("فعلا شاگرد نمی‌پذیرد", "Not taking students right now")}</p>;
  return <button type="button" className="btn btn-primary btn-lg" onClick={onOpen}>{label}</button>;
}
