"use client";

import "./coach.css";
import "./coach-pages.css";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { ChevronLeft, UserPlus } from "lucide-react";
import { SmartLink } from "./SmartLink";
import { PageLoader } from "./PageLoader";
import { GradientRing } from "./GradientRing";
import { CoachPanelShell } from "./CoachPanelShell";
import { CoachAvatar } from "./CoachAvatar";
import { CoachNomoLine } from "./CoachNomoLine";
import { CoachEmpty } from "./CoachEmpty";
import { CoachSheet } from "./CoachSheet";
import { MentorDashError, mentorApi } from "./MentorDashKit";
import { MentorAvailabilityQuick } from "./MentorAvailabilityQuick";
import { Spinner } from "./Spinner";
import { useLiveRefresh, useVisiblePolling } from "@/lib/liveSync";
import { jMonthName, toJalali, weekdayName } from "@/lib/jalali";
import { publicUserName } from "@/lib/mentorTypes";
import type { MentorshipRow, MentorshipsResponse } from "@/lib/mentorTypes";
import type { CoachInboxItem, CoachToday } from "@/lib/coachTypes";
import { tr } from "@/lib/i18n";

const RequestSheet = dynamic(() => import("./MentorTodayRequest").then((m) => m.MentorTodayRequestSheet), { ssr: false });

/** یک جمله‌ی انسانی برای دلیل حضور در «منتظر تو» */
function reasonText(it: CoachInboxItem): { text: string; warn: boolean } {
  const r = it.reason;
  switch (r.kind) {
    case "request": return { text: tr("می‌خواد شاگردت بشه", "Wants to be your student"), warn: false };
    case "unread": return { text: tr(`${r.count} پیام تازه فرستاده`, `Sent ${r.count} new ${r.count === 1 ? "message" : "messages"}`), warn: false };
    case "idle": return { text: tr(`${r.days} روزه خبری نیست`, `No news for ${r.days} ${r.days === 1 ? "day" : "days"}`), warn: true };
    case "change_request": return { text: tr(`برای «${r.programTitle}» تغییر خواسته`, `Asked for changes to "${r.programTitle}"`), warn: true };
    case "week_ready": return { text: tr("گزارش هفته‌ش آماده‌ست", "Their weekly report is ready"), warn: false };
    case "goal_done": return { text: tr(`هدف «${r.title}» تموم شد`, `Finished the goal "${r.title}"`), warn: false };
  }
}

function itemHref(it: CoachInboxItem): string {
  const base = `/mentor/students/${it.user.id}`;
  return it.reason.kind === "week_ready" ? `${base}/week?w=${it.reason.weekStart}` : base;
}

function availabilityInfo(a: "OPEN" | "CLOSED" | "AWAY" | "FULL"): { label: string; ok: boolean } {
  switch (a) {
    case "OPEN": return { label: tr("پذیرش باز", "Accepting"), ok: true };
    case "CLOSED": return { label: tr("پذیرش بسته", "Not accepting"), ok: false };
    case "AWAY": return { label: tr("در دسترس نیستم", "Away"), ok: false };
    case "FULL": return { label: tr("ظرفیت پره", "Full"), ok: false };
  }
}

function useTodayLabel(): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const d = new Date();
    const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    setLabel(`${weekdayName(d.getDay())} ${j[2]} ${jMonthName(j[1] - 1)}`);
  }, []);
  return label;
}

function Onboarding() {
  const steps = [
    { n: 1, title: tr("پروفایلت رو بساز", "Create your profile"), sub: tr("اسم، تخصص و چند خط درباره‌ی خودت", "Your name, specialty and a few lines about you") },
    { n: 2, title: tr("شرایط رو قبول کن", "Accept the terms"), sub: tr("یک بار و کوتاه", "Once, and it is short") },
    { n: 3, title: tr("منتشر کن", "Publish"), sub: tr("تا شاگردها پیدات کنن", "So students can find you") },
  ];
  return (
    <div className="ch-stack">
      <CoachEmpty text={tr("با سه قدم کوتاه مربی می‌شی", "Three short steps and you are a coach")} />
      <ol className="chp-steps">
        {steps.map((s) => (
          <li key={s.n} className={`chp-step ${s.n === 1 ? "is-current" : "is-locked"}`}>
            <SmartLink href="/mentor/settings?open=profile" className="ch-row">
              <span className="chp-step-n">{s.n}</span>
              <span className="ch-row-main">
                <span className="ch-row-title">{s.title}</span>
                <span className="ch-row-sub">{s.sub}</span>
              </span>
              <ChevronLeft size={18} className="ch-chev dir-flip" aria-hidden="true" />
            </SmartLink>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function CoachTodayPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<CoachToday | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availOpen, setAvailOpen] = useState(false);
  const [reqRow, setReqRow] = useState<MentorshipRow | null>(null);
  const [reqBusy, setReqBusy] = useState<string | null>(null);
  const dateLabel = useTodayLabel();

  const load = useCallback(async (silent = false) => {
    if (!silent) setError(null);
    const r = await mentorApi<CoachToday>("/api/mentor/today");
    if (!r.ok) { if (!silent) setError(r.error); return; }
    setData(r.data);
  }, []);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh("mentor", () => { load(true); });
  useVisiblePolling(() => { load(true); }, 30_000);

  async function openRequest(mentorshipId: string) {
    if (reqBusy) return;
    setReqBusy(mentorshipId);
    const r = await mentorApi<MentorshipsResponse>("/api/mentorships?role=mentor");
    setReqBusy(null);
    if (!r.ok) { setError(r.error); return; }
    const row = (r.data.mentorships || []).find((m) => m.id === mentorshipId);
    if (row) setReqRow(row); else load(true);
  }

  const first = (session?.user?.name || "").trim().split(/\s+/)[0];
  const greet = (
    <span className="chp-greet">
      {dateLabel && <span className="chp-date">{dateLabel}</span>}
      <span>{first ? tr(`سلام ${first}`, `Hello ${first}`) : tr("سلام", "Hello")}</span>
    </span>
  );

  const profile = data?.profile ?? null;
  const av = profile ? availabilityInfo(profile.availability) : null;
  const pill = profile && av && (
    <button type="button" className={`ch-pill ${av.ok ? "is-ok" : "is-warn"}`} onClick={() => setAvailOpen(true)} aria-haspopup="dialog" aria-label={tr(`وضعیت پذیرش: ${av.label}`, `Availability: ${av.label}`)}>
      <span className="chp-avail-dot" aria-hidden="true" />
      {av.label}
    </button>
  );

  let body: React.ReactNode;
  if (error && !data) body = <MentorDashError message={error} onRetry={() => load()} />;
  else if (!data) body = <PageLoader />;
  else if (!data.profile) body = <Onboarding />;
  else {
    const { counts, hint, inbox, students } = data;
    body = (
      <>
        {error && <MentorDashError message={error} onRetry={() => load()} />}
        {!profile!.published && (
          <SmartLink href="/mentor/settings" className="ch-row">
            <span className="ch-row-main">
              <span className="ch-row-title">{tr("صفحه‌ت هنوز منتشر نشده", "Your page is not published yet")}</span>
              <span className="ch-row-sub">{tr("منتشرش کن تا شاگردها پیدات کنن", "Publish it so students can find you")}</span>
            </span>
            <ChevronLeft size={18} className="ch-chev dir-flip" aria-hidden="true" />
          </SmartLink>
        )}
        {counts.students === 0 ? (
          <CoachEmpty
            icon={<UserPlus size={28} aria-hidden="true" />}
            text={tr("هنوز شاگردی نداری. یکی رو دعوت کن یا منتظر درخواست بمون.", "No students yet. Invite one or wait for a request.")}
            action={<SmartLink href="/mentor/students?invite=1" className="btn btn-primary">{tr("دعوت شاگرد", "Invite a student")}</SmartLink>}
          />
        ) : (
          <div className="chp-cols">
            <section className="ch-card ch-card-lg chp-hero chp-a-hero" aria-label={tr("امروز", "Today")}>
              <GradientRing value={counts.students ? counts.doneToday / counts.students : 0} size={108} stroke={10}>
                <span className="chp-ring-num">{counts.doneToday}/{counts.students}</span>
              </GradientRing>
              <div className="chp-hero-body">
                <p className="chp-hero-line">{tr(`${counts.doneToday} نفر امروزشون رو کامل کردن`, `${counts.doneToday} ${counts.doneToday === 1 ? "person" : "people"} completed today`)}</p>
                <div className="chp-hero-nums">
                  <span className="chp-num"><b>{counts.students}</b><span>{tr("شاگرد", "Students")}</span></span>
                  <span className="chp-num"><b className={counts.waiting ? "is-warn" : undefined}>{counts.waiting}</b><span>{tr("منتظر تو", "Waiting for you")}</span></span>
                </div>
              </div>
            </section>

            {hint && <CoachNomoLine className="chp-a-nomo" text={<><b>{tr("نومو:", "Nomo:")}</b> {hint}</>} />}

            <section className="chp-col chp-a-inbox">
              <h2 className="ch-section-title">{tr("منتظر تو", "Waiting for you")}</h2>
              {inbox.length === 0 ? (
                <CoachEmpty text={tr("چیزی منتظرت نیست. دمت گرم!", "Nothing is waiting for you. Nice work!")} />
              ) : (
                <ul className="ch-list">
                  {inbox.map((it) => {
                    const why = reasonText(it);
                    const inner = (
                      <>
                        <CoachAvatar user={it.user} size={44} />
                        <span className="ch-row-main">
                          <span className="ch-row-title">{publicUserName(it.user)}</span>
                          <span className={`ch-row-sub${why.warn ? " chp-tone-warn" : ""}`}>{why.text}</span>
                        </span>
                        {reqBusy === it.reason.mentorshipId ? <Spinner size={16} label={null} /> : <ChevronLeft size={18} className="ch-chev dir-flip" aria-hidden="true" />}
                      </>
                    );
                    return (
                      <li key={it.id}>
                        {it.reason.kind === "request" ? (
                          <button type="button" className="ch-row" onClick={() => openRequest(it.reason.mentorshipId)} disabled={!!reqBusy}>{inner}</button>
                        ) : (
                          <SmartLink href={itemHref(it)} className="ch-row">{inner}</SmartLink>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {students.length > 0 && (
              <section className="chp-col chp-a-strip">
                <h2 className="ch-section-title">{tr("امروز شاگردها", "Students today")}</h2>
                <ul className="chp-strip">
                  {students.map((s) => (
                    <li key={s.mentorshipId}>
                      <SmartLink href={`/mentor/students/${s.user.id}`}>
                        <CoachAvatar user={s.user} size={48} ring={s.todayRate} />
                        <span className="chp-strip-name">{s.user.name || s.user.username || publicUserName(s.user)}</span>
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <CoachPanelShell title={greet} action={pill} wide badges={{ today: data?.counts.waiting || undefined }}>
      {body}
      <CoachSheet open={availOpen} onClose={() => setAvailOpen(false)} title={tr("وضعیت پذیرش", "Accepting students")} size="sm">
        {availOpen && <MentorAvailabilityQuick bare onChange={() => load(true)} />}
      </CoachSheet>
      {reqRow && <RequestSheet row={reqRow} onClose={() => setReqRow(null)} suspended={!!profile?.suspended} onChanged={() => load(true)} />}
    </CoachPanelShell>
  );
}
