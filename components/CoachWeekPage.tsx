"use client";

// صفحه‌ی گزارش هفته (خودکار از داده‌ی شاگرد؛ طرح CheckIn.dc.html). مربی: نومو + پیام تشویقی؛ شاگرد: فقط عددها.
import "./coach.css";
import "./coach-space.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { CoachNomoQuota, CoachSpace as CoachSpaceData, CoachWeekReport } from "@/lib/coachTypes";
import { addDaysIso, weekStartOf } from "@/lib/coachWeek";
import { fmtDay } from "@/lib/mentorFormat";
import { publicUserName } from "@/lib/mentorTypes";
import { isoLocal } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import { AuthGate } from "./AuthGate";
import { CoachAvatar } from "./CoachAvatar";
import { CoachEmpty } from "./CoachEmpty";
import { CoachHeader } from "./CoachHeader";
import { CoachNomoLine } from "./CoachNomoLine";
import { CoachPress } from "./CoachPress";
import { CoachSheet, CoachSheetBody } from "./CoachSheet";
import { CoachStatRow } from "./CoachStatRow";
import { CoachWeekBars } from "./CoachWeekBars";
import { CoachWeekRings } from "./CoachWeekRings";
import { coachSleepText } from "./CoachWeekCard";
import { mentorApi } from "./MentorDashKit";
import { MentorErrorState } from "./MentorPageShell";
import { SegmentedTabs } from "./SegmentedTabs";
import { SmartLink } from "./SmartLink";
import { LoadingBlock, Spinner } from "./Spinner";

const gradeText = (g: CoachWeekReport["grade"]) =>
  g === "great" ? tr("هفته‌ی خیلی خوبی بود", "A really good week")
    : g === "good" ? tr("هفته‌ی خوبی بود", "A good week")
    : g === "low" ? tr("هفته‌ی سختی بود", "A tough week")
    : tr("هنوز داده‌ای نیست", "No data yet");

export function CoachWeekPage({ role, mentorshipId, studentId }: { role: "MENTOR" | "STUDENT"; mentorshipId: string; studentId?: string }) {
  const { status } = useSession();
  if (status === "loading") return <div className="ch-page cs-page"><LoadingBlock /></div>;
  if (status === "unauthenticated") return <div className="ch-page cs-page"><AuthGate message={tr("برای استفاده از بخش مربی‌ها وارد شو", "Sign in to use the mentors section")} /></div>;
  return <WeekBody role={role} mentorshipId={mentorshipId} studentId={studentId} />;
}

function WeekBody({ role, mentorshipId, studentId }: { role: "MENTOR" | "STUDENT"; mentorshipId: string; studentId?: string }) {
  const router = useRouter();
  const isMentor = role === "MENTOR";
  const spaceHref = isMentor ? `/mentor/students/${studentId ?? ""}` : `/mentorship/${mentorshipId}`;
  const [week, setWeek] = useState<string | null | undefined>(undefined); // undefined = هنوز آدرس خونده نشده، null = هفته‌ی جاری
  const [report, setReport] = useState<CoachWeekReport | null>(null);
  const [space, setSpace] = useState<CoachSpaceData | null>(null);
  const [error, setError] = useState<{ msg: string; status: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<"routine" | "sleep">("routine");
  const [summary, setSummary] = useState<string | null>(null);
  const [sumBusy, setSumBusy] = useState(false);
  const [sumError, setSumError] = useState<string | null>(null);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const seenRef = useRef<string | null>(null);

  useEffect(() => {
    const w = new URLSearchParams(window.location.search).get("w");
    setWeek(w && /^\d{4}-\d{2}-\d{2}$/.test(w) ? w : null);
  }, []);

  useEffect(() => {
    let dead = false;
    mentorApi<CoachSpaceData>(`/api/mentorships/${encodeURIComponent(mentorshipId)}/space`).then((r) => { if (!dead && r.ok) setSpace(r.data); });
    return () => { dead = true; };
  }, [mentorshipId]);

  const load = useCallback(async (w: string | null) => {
    setLoading(true);
    const q = w ? `?week=${encodeURIComponent(w)}` : "";
    const r = await mentorApi<{ report: CoachWeekReport }>(`/api/mentorships/${encodeURIComponent(mentorshipId)}/weeks${q}`);
    setLoading(false);
    if (!r.ok) { setError({ msg: r.error, status: r.status }); return; }
    setError(null);
    setReport(r.data.report);
    setSummary(r.data.report.summary);
  }, [mentorshipId]);

  useEffect(() => { if (week !== undefined) load(week); }, [week, load]);

  // مربی که یک هفته‌ی تموم‌شده رو می‌بینه، «دیده شد» ثبت می‌شه (یک بار برای هر هفته)
  useEffect(() => {
    if (!isMentor || !report || report.seenAt || !report.complete || seenRef.current === report.weekStart) return;
    seenRef.current = report.weekStart;
    mentorApi<unknown>(`/api/mentorships/${encodeURIComponent(mentorshipId)}/weeks/seen`, { method: "POST", body: { weekStart: report.weekStart } });
  }, [isMentor, report, mentorshipId]);

  function go(delta: number) {
    if (!report) return;
    const next = addDaysIso(report.weekStart, delta * 7);
    setWeek(next);
    const url = new URL(window.location.href);
    url.searchParams.set("w", next);
    window.history.replaceState(null, "", url.toString());
  }

  async function makeSummary() {
    if (!report || sumBusy) return;
    setSumBusy(true);
    setSumError(null);
    const r = await mentorApi<{ summary: string; quota: CoachNomoQuota }>("/api/mentor/nomo/week", { method: "POST", body: { mentorshipId, weekStart: report.weekStart } });
    setSumBusy(false);
    if (!r.ok) { setSumError(r.error); return; }
    setSummary(r.data.summary);
  }

  const peer = space?.counterpart;
  const name = peer ? publicUserName(peer) : "";
  const editProgram = space?.events.slice().reverse().find((e) => e.kind === "program" && ["ACTIVE", "ACCEPTED", "PENDING", "DRAFT"].includes(e.status));
  const todayWeek = weekStartOf(isoLocal(new Date()));
  const canPrev = !!report && report.weekIndex > 1;
  const canNext = !!report && report.weekStart < todayWeek;

  const nav = report && (
    <div className="cs-week-nav">
      <button type="button" className="btn btn-ghost btn-icon btn-round" onClick={() => go(-1)} disabled={!canPrev || loading} aria-label={tr("هفته‌ی قبل", "Previous week")}>
        <ChevronRight size={18} className="dir-flip" aria-hidden="true" />
      </button>
      <button type="button" className="btn btn-ghost btn-icon btn-round" onClick={() => go(1)} disabled={!canNext || loading} aria-label={tr("هفته‌ی بعد", "Next week")}>
        <ChevronLeft size={18} className="dir-flip" aria-hidden="true" />
      </button>
    </div>
  );

  const header = (
    <CoachHeader
      back={{ href: spaceHref, label: name || tr("برگشت", "Back") }}
      leading={peer ? <CoachAvatar user={peer} size={40} /> : undefined}
      title={report ? tr(`گزارش هفته‌ی ${report.weekIndex}`, `Week ${report.weekIndex} report`) : tr("گزارش هفته", "Week report")}
      action={nav}
    />
  );

  if (error && !report) {
    return (
      <div className="ch-page cs-page">
        <span className="ch-halo" aria-hidden="true" />
        {header}
        {error.status === 404 ? <CoachEmpty text={tr("گزارشی برای این هفته نیست", "There's no report for this week")} action={<SmartLink href={spaceHref} className="btn btn-primary">{tr("برگشت", "Back")}</SmartLink>} /> : <MentorErrorState message={error.msg} onRetry={() => load(week ?? null)} />}
      </div>
    );
  }
  if (!report) return <div className="ch-page cs-page"><span className="ch-halo" aria-hidden="true" />{header}<LoadingBlock /></div>;

  const r = report;
  const workoutPct = r.workoutsDone != null && r.workoutsPlanned ? (r.workoutsDone / r.workoutsPlanned) * 100 : r.workoutsDone != null && r.workoutsPlanned === 0 ? 100 : null;
  const sleepPct = r.sleepAvgMinutes != null ? Math.min(100, (r.sleepAvgMinutes / 480) * 100) : null;
  const hasSleepDays = r.days.some((d) => d.sleepMinutes != null);
  const lines = (summary ?? "").split("\n").map((l) => l.replace(/^[\s\-•*]+/, "").trim()).filter(Boolean).slice(0, 3);
  const dash = "—";

  return (
    <div className="ch-page cs-page cs-week">
      <span className="ch-halo" aria-hidden="true" />
      {header}

      <section className="ch-card ch-card-lg cs-week-hero" aria-busy={loading || undefined}>
        <span className="ch-eyebrow">{fmtDay(r.weekStart)} {tr("تا", "to")} {fmtDay(r.weekEnd)}</span>
        <h2 className="cs-week-grade">{gradeText(r.grade)}{!r.complete && <small>{tr(" · هنوز تموم نشده", " · still going")}</small>}</h2>
        <CoachWeekRings
          routine={r.routineRate}
          workout={workoutPct}
          sleep={sleepPct}
          size={150}
          center={<span className="cs-week-center">{r.routineRate == null ? dash : `${Math.round(r.routineRate)}%`}</span>}
        />
        <CoachStatRow
          stats={[
            { value: r.routineRate == null ? dash : `${Math.round(r.routineRate)}%`, label: tr("روتین", "Routine"), tone: r.grade === "low" ? "warn" : "ok" },
            { value: r.workoutsDone == null ? dash : r.workoutsPlanned ? `${r.workoutsDone}/${r.workoutsPlanned}` : `${r.workoutsDone}`, label: tr("تمرین", "Workouts") },
            { value: r.sleepAvgMinutes == null ? dash : coachSleepText(r.sleepAvgMinutes), label: tr("خواب", "Sleep") },
            { value: r.streak == null ? dash : `${r.streak}`, label: tr("روز پشت هم", "Days in a row"), tone: "accent" },
          ]}
        />
      </section>

      <section className="ch-card cs-week-bars" aria-label={tr("هفت روز", "Seven days")}>
        {hasSleepDays && (
          <SegmentedTabs<"routine" | "sleep">
            ariaLabel={tr("نمودار", "Chart")}
            options={[{ value: "routine", label: tr("روتین", "Routine") }, { value: "sleep", label: tr("خواب", "Sleep") }]}
            active={metric}
            onChange={setMetric}
          />
        )}
        <CoachWeekBars days={r.days} metric={hasSleepDays ? metric : "routine"} todayIso={isoLocal(new Date())} />
      </section>

      {isMentor && (
        <section className="cs-week-nomo" aria-label={tr("نومو", "Nomo")}>
          {lines.length > 0 ? (
            lines.map((l, i) => <CoachNomoLine key={i} text={l} />)
          ) : (
            <CoachNomoLine
              loading={sumBusy}
              text={sumError ?? tr("نومو می‌تونه این هفته رو در سه خط خلاصه کنه", "Nomo can sum this week up in three lines")}
              action={!sumBusy && <button type="button" className="btn btn-tonal btn-sm" onClick={makeSummary}>{tr("خلاصه‌ی نومو", "Nomo summary")}</button>}
            />
          )}
        </section>
      )}

      <div className="cs-week-actions">
        {isMentor ? (
          <>
            {editProgram && editProgram.kind === "program" && (
              <SmartLink href={`/mentor/programs/${editProgram.programId}/edit`} className="btn btn-ghost">{tr("ویرایش برنامه", "Edit program")}</SmartLink>
            )}
            <button type="button" className="btn btn-primary" onClick={() => setNudgeOpen(true)}>
              <Sparkles size={15} fill="currentColor" strokeWidth={1.5} aria-hidden="true" /> {tr("یک پیام تشویقی بده", "Send an encouraging message")}
            </button>
          </>
        ) : (
          <SmartLink href={spaceHref} className="btn btn-primary">{name ? tr(`پیام به ${name}`, `Message ${name}`) : tr("گفت‌وگو", "Chat")}</SmartLink>
        )}
      </div>

      {isMentor && nudgeOpen && (
        <NudgeSheet mentorshipId={mentorshipId} onClose={() => setNudgeOpen(false)} onPick={(t) => router.push(`${spaceHref}?draft=${encodeURIComponent(t)}`)} />
      )}
    </div>
  );
}

/** پیشنهادهای نومو برای پیام تشویقی؛ زدن هر کدوم به فضا برمی‌گردونه با پیش‌نویس آماده */
function NudgeSheet({ mentorshipId, onClose, onPick }: { mentorshipId: string; onClose: () => void; onPick: (text: string) => void }) {
  const [list, setList] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    let dead = false;
    mentorApi<{ suggestions: string[] }>("/api/mentor/nomo/nudge", { method: "POST", body: { mentorshipId } }).then((r) => {
      if (dead) return;
      if (r.ok) setList(r.data.suggestions || []);
      else setError(r.error);
    });
    return () => { dead = true; };
  }, [mentorshipId]);
  return (
    <CoachSheet open={open} onClose={() => { setOpen(false); setTimeout(onClose, 180); }} title={tr("پیشنهاد نومو", "Nomo suggestions")} size="sm">
      <CoachSheetBody>
        {error ? (
          <div className="form-inline-error" role="alert">{error}</div>
        ) : !list ? (
          <div className="cs-replies-loading"><Spinner size={20} /></div>
        ) : list.length === 0 ? (
          <p className="cs-muted">{tr("پیشنهادی ساخته نشد", "No suggestion this time")}</p>
        ) : (
          <ul className="ch-list">
            {list.map((s, i) => (
              <li key={i}>
                <CoachPress className="ch-card cs-nudge-option" onPress={() => onPick(s)}>{s}</CoachPress>
              </li>
            ))}
          </ul>
        )}
      </CoachSheetBody>
    </CoachSheet>
  );
}
