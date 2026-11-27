"use client";

import "./coach.css";
import { toEnDigits } from "@/lib/schedule";
import "./coach-pages.css";
import "./coach-discover.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, CheckCircle2, CircleSlash, CopyPlus, EyeOff, Flag, Pencil, ArrowUp, X } from "lucide-react";
import { useLiveRefresh, useVisiblePolling } from "@/lib/liveSync";
import { SmartLink } from "./SmartLink";
import { PageLoader } from "./PageLoader";
import { Spinner } from "./Spinner";
import { GradientRing } from "./GradientRing";
import { CoachPanelShell } from "./CoachPanelShell";
import { CoachAvatar } from "./CoachAvatar";
import { CoachEmpty } from "./CoachEmpty";
import { MentorDashError } from "./MentorDashKit";
import { MentorKebabMenu, type MentorMenuAction } from "./MentorKebabMenu";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { MentorReportModal } from "./MentorReportModal";
import { MentorProgressWeek } from "./MentorProgressWeek";
import { MentorProgramTools } from "./MentorProgramTools";
import { ProgramRespondModal } from "./ProgramRespondModal";
import { GoldenName } from "./GoldenName";
import type { Feedback, Item, ProgramDetailResponse, ProgramStatus, ProgramTransitionAction } from "@/lib/mentorTypes";
import { publicUserName } from "@/lib/mentorTypes";
import { fmtDateTime, fmtDay, networkError, readApiError } from "@/lib/mentorFormat";
import { weekdayName, faNum, isoLocal } from "@/lib/jalali";
import { tr, iso } from "@/lib/i18n";

const FEEDBACK_MAX = 2000;
/** شنبه تا جمعه (getDay جاوااسکریپت: 0 یکشنبه) */
const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];

type Head = {
  title: string;
  backHref: string;
  programId: string;
  canReport: boolean;
  canCancel: boolean;
  canComplete: boolean;
  canDuplicate: boolean;
} | null;
/** فرمان منوی سه‌نقطه به بدنه */
type MenuCmd = { kind: "report" | "cancel" | "complete"; n: number } | null;

// ───────────────────────── تاریخ محلی ─────────────────────────

function parseDay(d: string): Date { return new Date(d + "T00:00:00"); }
function addDays(d: string, n: number): string { const x = parseDay(d); x.setDate(x.getDate() + n); return isoLocal(x); }
/** شنبه‌ی همان هفته (هفته‌ی ایرانی) */
function weekStartOf(d: string): string { const x = parseDay(d); return addDays(d, -((x.getDay() + 1) % 7)); }

/** وضعیت برنامه به زبان همون کسی که صفحه رو می‌بینه */
function statusLine(status: ProgramStatus, isStudent: boolean, changeAsked: boolean): { text: string; tone: "ok" | "warn" | "neutral" } {
  switch (status) {
    case "DRAFT":
      if (changeAsked) return isStudent ? { text: tr("مربی داره اصلاحش می‌کنه", "Your mentor is revising it"), tone: "neutral" } : { text: tr("شاگرد تغییر خواسته", "Student asked for changes"), tone: "warn" };
      return { text: tr("ساخته شده، هنوز فرستاده نشده", "Created, not sent yet"), tone: "neutral" };
    case "PENDING": return isStudent ? { text: tr("منتظر جواب تو", "Waiting for your answer"), tone: "warn" } : { text: tr("منتظر جواب شاگرد", "Waiting for the student"), tone: "neutral" };
    case "ACCEPTED": return { text: tr("قبول شد، منتظر شروع", "Accepted, waiting to start"), tone: "neutral" };
    case "ACTIVE": return { text: tr("در حال اجرا", "In progress"), tone: "ok" };
    case "COMPLETED": return { text: tr("تمام شده", "Finished"), tone: "neutral" };
    case "REJECTED": return isStudent ? { text: tr("قبول نکردی", "You declined it"), tone: "neutral" } : { text: tr("شاگرد قبول نکرد", "Student declined"), tone: "warn" };
    case "CANCELLED": return { text: tr("لغو شده", "Cancelled"), tone: "neutral" };
    default: return { text: "", tone: "neutral" };
  }
}

// ─────────────────────────────────────────────────────────────

/** جزئیات برنامه برای هر دو نقش (docs/coach-v3.md): بالا نام برنامه با برگشت به فضای همکاری */
export function CoachProgramDetail() {
  const router = useRouter();
  const [head, setHead] = useState<Head>(null);
  const [cmd, setCmd] = useState<MenuCmd>(null);
  const send = (kind: "report" | "cancel" | "complete") => setCmd((c) => ({ kind, n: (c?.n ?? 0) + 1 }));

  // اقدام‌های کم‌کاربرد و مخرب فقط در منوی سه‌نقطه
  const menu: MentorMenuAction[] = head ? [
    ...(head.canDuplicate ? [{ label: tr("کپی برنامه", "Duplicate program"), icon: <CopyPlus size={16} aria-hidden="true" />, onClick: () => router.push(`/mentor/programs/${head.programId}/duplicate`) }] : []),
    ...(head.canComplete ? [{ label: tr("تموم کردن برنامه", "Finish program"), icon: <CheckCircle2 size={16} aria-hidden="true" />, onClick: () => send("complete") }] : []),
    ...(head.canReport ? [{ label: tr("گزارش برنامه", "Report program"), icon: <Flag size={16} aria-hidden="true" />, onClick: () => send("report") }] : []),
    ...(head.canCancel ? [{ label: tr("لغو برنامه", "Cancel program"), icon: <CircleSlash size={16} aria-hidden="true" />, danger: true, onClick: () => send("cancel") }] : []),
  ] : [];

  return (
    <CoachPanelShell
      title={head?.title ?? tr("برنامه", "Program")}
      back={{ href: head?.backHref ?? "/mentorship" }}
      nav={false}
      action={menu.length ? <MentorKebabMenu actions={menu} className="btn btn-ghost btn-icon" iconSize={20} label={tr("بیشتر", "More")} /> : undefined}
    >
      <ProgramView onHead={setHead} cmd={cmd} />
    </CoachPanelShell>
  );
}

function ProgramView({ onHead, cmd }: { onHead: (h: Head) => void; cmd: MenuCmd }) {
  const { id } = useParams<{ id: string }>();
  const today = useMemo(() => isoLocal(new Date()), []);
  const [weekStart, setWeekStart] = useState(() => weekStartOf(isoLocal(new Date())));
  const [selected, setSelected] = useState(() => isoLocal(new Date()));
  const [data, setData] = useState<ProgramDetailResponse | null>(null);
  const [error, setError] = useState<{ msg: string; retry: boolean } | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [respond, setRespond] = useState<"reject" | "request_changes" | "cancel" | null>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<{ itemId?: string; logId?: string; label: string } | null>(null);
  const markedRead = useRef(false);
  const jumpedToEnd = useRef(false);
  const reqId = useRef(0);

  const weekEnd = addDays(weekStart, 6);

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    const rid = ++reqId.current;
    if (opts?.quiet) setWeekLoading(true); else setError(null);
    try {
      const res = await fetch(`/api/mentor-programs/${id}?from=${weekStart}&to=${weekEnd}`, { cache: "no-store" });
      if (rid !== reqId.current) return;
      if (!res.ok) {
        const notFound = res.status === 404 || res.status === 403;
        const msg = notFound ? tr("این برنامه پیدا نشد یا به آن دسترسی نداری", "This program wasn't found or you don't have access to it") : await readApiError(res, tr("برنامه باز نشد؛ دوباره تلاش کن", "Couldn't open the program. Try again"));
        // بارگذاری آرام (هفته/بعد از اقدام) صفحه را خراب نمی‌کند؛ خطا کنار دکمه‌ها دیده می‌شود
        if (opts?.quiet) setActionError(msg); else setError({ msg, retry: !notFound });
        return;
      }
      const d: ProgramDetailResponse = await res.json();
      if (rid !== reqId.current) return;
      setData(d);
      setError(null);
    } catch {
      if (rid !== reqId.current) return;
      if (opts?.quiet) setActionError(networkError()); else setError({ msg: networkError(), retry: true });
    } finally {
      if (rid === reqId.current) setWeekLoading(false);
    }
  }, [id, weekStart, weekEnd]);

  // بار اول کل صفحه، بعد از آن (عوض‌شدن هفته) فقط نشانگر کوچک بالای روزها
  const hasData = !!data;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load({ quiet: hasData }); }, [load]);
  // زنده: بازخورد/تغییر برنامه از طرف مربی یا تیک همین کاربر از تب دیگه
  useLiveRefresh(["mentor:program", "customOccurrences"], () => { load({ quiet: true }); });
  useVisiblePolling(() => { load({ quiet: true }); }, 30_000);

  // برنامه‌ای که پیش از این هفته تمام شده، از آخرین هفته‌ی خودش باز می‌شود (نه هفته‌ی خالی جاری)
  useEffect(() => {
    const end = data?.progressView?.to;
    if (!end || jumpedToEnd.current) return;
    jumpedToEnd.current = true;
    if (end < weekStart) {
      setWeekStart(weekStartOf(end));
      setSelected(end);
    }
  }, [data, weekStart]);

  // باز شدن صفحه توسط شاگرد = دیدن بازخوردها؛ فقط یک بار و فقط اگر نخوانده‌ای هست
  useEffect(() => {
    if (!data || data.role !== "STUDENT" || markedRead.current) return;
    if (!data.feedback.some((f) => !f.readAt)) return;
    markedRead.current = true;
    fetch(`/api/mentor-programs/${id}/feedback/read`, { method: "POST" }).catch(() => { markedRead.current = false; });
  }, [data, id]);

  // سر صفحه: عنوان = نام برنامه؛ برگشت = فضای همکاری (مربی: صفحه‌ی شاگرد، شاگرد: فضای همکاری)
  const prog = data?.program;
  const role = data?.role;
  const pTitle = prog?.title;
  const pId = prog?.id;
  const pRel = prog?.mentorshipId;
  const pOther = prog?.counterpart.id;
  const status = prog?.status;
  useEffect(() => {
    if (!pId || !pTitle || !role || !status) return;
    const isStudent = role === "STUDENT";
    onHead({
      title: pTitle,
      backHref: isStudent ? `/mentorship/${pRel}` : `/mentor/students/${pOther}`,
      programId: pId,
      canReport: isStudent,
      canCancel: ["DRAFT", "PENDING", "ACCEPTED", "ACTIVE"].includes(status),
      canComplete: !isStudent && status === "ACTIVE",
      canDuplicate: !isStudent,
    });
  }, [pId, pTitle, pRel, pOther, role, status, onHead]);
  useEffect(() => {
    if (!cmd) return;
    if (cmd.kind === "report") setReportOpen(true);
    else if (cmd.kind === "complete") { setActionError(null); setConfirmComplete(true); }
    else setRespond("cancel");
  }, [cmd]);
  useEffect(() => () => { onHead(null); }, [onHead]);

  async function transition(action: ProgramTransitionAction) {
    setBusy(action);
    setActionError(null);
    try {
      const res = await fetch(`/api/mentor-programs/${id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) { setActionError(await readApiError(res)); if (res.status === 409) load({ quiet: true }); return; }
      setConfirmComplete(false);
      await load({ quiet: true });
    } catch {
      setActionError(networkError());
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) return <MentorDashError message={error.msg} onRetry={error.retry ? () => load() : undefined} />;
  if (!data) return <PageLoader />;

  const { program, items, feedback } = data;
  const isStudent = data.role === "STUDENT";
  const other = program.counterpart;
  const otherName = publicUserName(other);
  const isWorkout = program.type === "WORKOUT";
  const trackable = program.status === "ACTIVE" || program.status === "COMPLETED" || (!isStudent && program.status === "CANCELLED");
  const canActivate = program.status === "ACCEPTED" && (!program.startDate || program.startDate <= today);
  const sortedItems = [...items].sort((a, b) => a.order - b.order || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  const showProgress = program.status === "ACTIVE" || program.status === "COMPLETED";
  const mentorNote = program.note?.trim() || null;
  const answering = isStudent && program.status === "PENDING";
  const editDraft = !isStudent && program.status === "DRAFT";
  const st = statusLine(program.status, isStudent, !!program.changeRequestNote);
  const waitStart = program.status === "ACCEPTED" && !canActivate
    ? (program.startDate ? tr(`شروع از ${fmtDay(program.startDate)}`, `Starts ${fmtDay(program.startDate)}`) : tr("منتظر تاریخ شروع", "Waiting for a start date"))
    : null;
  const meta = [
    program.startDate ? tr(`شروع ${fmtDay(program.startDate)}`, `Start ${fmtDay(program.startDate)}`) : null,
    program.endDate ? tr(`پایان ${fmtDay(program.endDate)}`, `End ${fmtDay(program.endDate)}`) : null,
    `${faNum(items.length)} ${isWorkout ? tr("حرکت", items.length === 1 ? "exercise" : "exercises") : tr("کار", items.length === 1 ? "task" : "tasks")}`,
  ].filter(Boolean).join(" · ");

  function setDayNote(date: string, body: string | null) {
    setData((d) =>
      d && d.progressView
        ? { ...d, progressView: { ...d.progressView, days: d.progressView.days.map((x) => (x.date === date ? { ...x, note: body } : x)) } }
        : d,
    );
  }

  return (
    <>
      {/* ── سربرگ برنامه ── */}
      <section className="ch-card ch-card-lg ch-stack">
        <div className="ch-row-main">
          <span className="ch-eyebrow">{isWorkout ? tr("برنامه‌ی تمرینی", "Workout program") : tr("برنامه‌ی روتین", "Routine program")}</span>
          <p className={`chpd-status${st.tone === "warn" ? " is-warn" : st.tone === "ok" ? " is-ok" : ""}`}>
            {st.text}{waitStart ? ` · ${waitStart}` : ""}
          </p>
        </div>
        <div className="chpd-who">
          <CoachAvatar user={other} size={36} />
          <span className="ch-row-main">
            <span className="ch-row-title">{isStudent ? tr("مربی", "Mentor") : tr("شاگرد", "Student")}: <GoldenName golden={other.golden} staff={other.staff}>{otherName}</GoldenName></span>
            <span className="ch-row-sub">{meta}</span>
          </span>
        </div>

        {program.description && <p className="chpf-bio">{program.description}</p>}
        {mentorNote && <div className="chpd-fb"><b className="ch-row-sub">{tr("یادداشت مربی", "Mentor's note")}</b><p>{mentorNote}</p></div>}
        {program.status === "DRAFT" && program.changeRequestNote && (
          <div className="chpd-fb"><b className="ch-row-sub">{isStudent ? tr("تغییری که خواستی", "The change you asked for") : tr("تغییری که شاگرد خواسته", "The change the student asked for")}</b><p>{program.changeRequestNote}</p></div>
        )}
        {program.status === "REJECTED" && program.rejectReason && (
          <div className="chpd-fb"><b className="ch-row-sub">{tr("دلیل", "Reason")}</b><p>{program.rejectReason}</p></div>
        )}

        {showProgress && program.progress.hidden && (
          <p className="chpd-hidden"><EyeOff size={14} aria-hidden="true" /> {tr("شاگرد این بخش رو خصوصی نگه داشته", "The student has kept this private")}</p>
        )}
        {showProgress && !program.progress.hidden && (
          <div className="ch-goal-card">
            <span role="img" aria-label={tr(`پیشرفت ${faNum(Math.round(program.progress.rate))} درصد`, `Progress ${faNum(Math.round(program.progress.rate))} percent`)}>
              <GradientRing value={Math.max(0, Math.min(100, program.progress.rate)) / 100} size={84} stroke={7}>
                <b className="ch-goal-ring-num">{faNum(Math.round(program.progress.rate))}%</b>
              </GradientRing>
            </span>
            <div className="ch-goal-body">
              <p className="ch-goal-line">{tr(`${faNum(program.progress.completed)} انجام شده`, `${faNum(program.progress.completed)} done`)}</p>
              {program.progress.partial > 0 && <p className="ch-goal-line">{tr(`${faNum(program.progress.partial)} نیمه‌کاره`, `${faNum(program.progress.partial)} partial`)}</p>}
              <p className="ch-goal-line">{tr(`${faNum(program.progress.missed)} انجام نشده`, `${faNum(program.progress.missed)} not done`)}</p>
            </div>
          </div>
        )}

        {actionError && !confirmComplete && <p className="chpf-error" role="alert">{actionError}</p>}
        {(answering || editDraft || canActivate) && (
          <div className="chpd-actions">
            {answering && (
              <>
                <button type="button" className="btn btn-ghost" onClick={() => setRespond("reject")} disabled={!!busy}>{tr("نه", "No")}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setRespond("request_changes")} disabled={!!busy}>{tr("تغییر بخواه", "Ask for changes")}</button>
                <button type="button" className={`btn btn-primary${busy === "accept" ? " is-loading" : ""}`} onClick={() => transition("accept")} disabled={!!busy}>
                  {busy === "accept" ? <Spinner size={16} /> : <><Check size={16} aria-hidden="true" /> {tr("قبول", "Accept")}</>}
                </button>
              </>
            )}
            {editDraft && (
              <SmartLink href={`/mentor/programs/${program.id}/edit`} className="btn btn-primary"><Pencil size={16} aria-hidden="true" /> {tr("ویرایش و فرستادن", "Edit and send")}</SmartLink>
            )}
            {canActivate && (
              <button type="button" className={`btn btn-primary${busy === "activate" ? " is-loading" : ""}`} onClick={() => transition("activate")} disabled={!!busy}>
                {busy === "activate" ? <Spinner size={16} /> : tr("شروع برنامه", "Start program")}
              </button>
            )}
          </div>
        )}
      </section>

      {/* ابزارهای مربی روی برنامه (قالب، CSV) */}
      {!isStudent && <MentorProgramTools programId={program.id} title={program.title} studentId={program.counterpart.id} />}

      {trackable ? (
        <section className="ch-stack">
          <h2 className="ch-section-title">{isStudent ? tr("پیشرفت تو", "Your progress") : tr("پیشرفت شاگرد", "Student's progress")}</h2>
          <div className="ch-card">
            {data.progressView ? (
              <MentorProgressWeek
                programId={program.id}
                view={data.progressView}
                items={sortedItems}
                isWorkout={isWorkout}
                isStudent={isStudent}
                noteEditable={program.status === "ACTIVE"}
                weekStart={weekStart}
                weekEnd={weekEnd}
                today={today}
                loading={weekLoading}
                selected={selected}
                onSelect={setSelected}
                onPrev={() => { const s = addDays(weekStart, -7); setWeekStart(s); setSelected(weekStartOf(today) === s ? today : s); }}
                onNext={() => { const s = addDays(weekStart, 7); setWeekStart(s); setSelected(weekStartOf(today) === s ? today : s); }}
                onToday={() => { setWeekStart(weekStartOf(today)); setSelected(today); }}
                onNoteSaved={setDayNote}
                canFeedback={program.status !== "DRAFT"}
                onFeedback={(t) => setFeedbackTarget(t)}
              />
            ) : (
              <CoachEmpty text={tr("پیشرفت از روز شروع برنامه نمایش داده می‌شه", "Progress shows from the program's start day")} />
            )}
          </div>
        </section>
      ) : (
        <ItemsByDay items={sortedItems} isWorkout={isWorkout} />
      )}

      <FeedbackBlock
        programId={program.id}
        isStudent={isStudent}
        feedback={feedback}
        canWrite={!isStudent && program.status !== "DRAFT"}
        target={feedbackTarget}
        onClearTarget={() => setFeedbackTarget(null)}
        onSent={(f) => { setData((d) => (d ? { ...d, feedback: [...d.feedback, f] } : d)); setFeedbackTarget(null); }}
      />

      {respond && (
        <ProgramRespondModal
          programId={program.id}
          action={respond}
          onClose={() => setRespond(null)}
          onDone={() => { setRespond(null); load({ quiet: true }); }}
        />
      )}
      {confirmComplete && (
        <MentorConfirmDialog
          message={tr("برنامه تموم بشه؟", "Finish this program?")}
          hint={tr("پیگیری خودکار متوقف می‌شه و کارها از روتین شاگرد برداشته می‌شن.", "Automatic tracking stops and the tasks are removed from the student's routine.")}
          confirmLabel={tr("تموم کردن برنامه", "Finish program")}
          danger={false}
          busy={busy === "complete"}
          error={actionError}
          onConfirm={() => transition("complete")}
          onCancel={() => { setConfirmComplete(false); setActionError(null); }}
        />
      )}
      {reportOpen && <MentorReportModal targetType="PROGRAM" targetId={program.id} onClose={() => setReportOpen(false)} />}
    </>
  );
}

// ───────────────────────── کارها به تفکیک روز ─────────────────────────

function itemSub(it: Item, isWorkout: boolean): string {
  const parts: string[] = [];
  if (it.durationMin != null) parts.push(tr(`${faNum(it.durationMin)} دقیقه`, `${faNum(it.durationMin)} min`));
  if (isWorkout && it.sets != null) parts.push(`${faNum(it.sets)} ${tr("ست", it.sets === 1 ? "set" : "sets")}${it.reps ? ` × ${faNum(it.reps)}` : ""}`);
  if (isWorkout && it.weightKg != null) parts.push(tr(`${faNum(it.weightKg)} کیلو`, `${faNum(it.weightKg)} kg`));
  if (isWorkout && it.restSec != null) parts.push(tr(`استراحت ${faNum(it.restSec)} ثانیه`, `Rest ${faNum(it.restSec)} sec`));
  return parts.join(" · ");
}

function ItemsByDay({ items, isWorkout }: { items: Item[]; isWorkout: boolean }) {
  if (items.length === 0) return <CoachEmpty text={tr("این برنامه کاری نداره", "This program has no tasks")} />;
  const everyDay = (i: Item) => i.repeat === "DAILY" || i.days.length === 7;
  const groups: { key: string; title: string; list: Item[] }[] = [];
  const daily = items.filter(everyDay);
  if (daily.length) groups.push({ key: "all", title: tr("هر روز", "Every day"), list: daily });
  for (const d of WEEK_ORDER) {
    const list = items.filter((i) => !everyDay(i) && i.days.includes(d));
    if (list.length) groups.push({ key: String(d), title: weekdayName(d), list });
  }
  return (
    <section className="ch-stack">
      <h2 className="ch-section-title">{isWorkout ? tr("حرکت‌ها", "Exercises") : tr("کارها", "Tasks")}</h2>
      {groups.map((g) => (
        <div key={g.key} className="chpd-day">
          <h3 className="chpd-day-title">{g.title}</h3>
          {g.list.map((it) => {
            const sub = itemSub(it, isWorkout);
            return (
              <div key={`${g.key}-${it.id}`} className="ch-card chpd-item">
                <span className="chpd-item-main">
                  <span className="chpd-item-title">{toEnDigits(it.title)}</span>
                  {sub && <span className="chpd-item-sub">{sub}</span>}
                  {it.details && <span className="chpd-item-sub">{it.details}</span>}
                </span>
                {it.startTime && <span className="chpd-item-time" dir="ltr">{faNum(it.startTime)}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}

// ───────────────────────── بازخورد ─────────────────────────

function FeedbackBlock({
  programId, isStudent, feedback, canWrite, target, onClearTarget, onSent,
}: {
  programId: string; isStudent: boolean; feedback: Feedback[]; canWrite: boolean;
  target: { itemId?: string; logId?: string; label: string } | null; onClearTarget: () => void; onSent: (f: Feedback) => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sorted = [...feedback].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  useEffect(() => { if (target) inputRef.current?.focus(); }, [target]);

  async function send() {
    const b = body.trim();
    if (!b) { setError(tr("متن بازخورد خالیه", "The feedback is empty")); return; }
    if (b.length > FEEDBACK_MAX) { setError(tr(`بازخورد حداکثر ${faNum(FEEDBACK_MAX)} حرف باشه`, `Feedback can be up to ${faNum(FEEDBACK_MAX)} characters`)); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mentor-programs/${programId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: b, itemId: target?.itemId, logId: target?.logId }),
      });
      if (!res.ok) { setError(await readApiError(res, tr("بازخورد فرستاده نشد؛ دوباره تلاش کن", "Couldn't send the feedback. Try again"))); return; }
      const d: { feedback: Feedback } = await res.json();
      setBody("");
      onSent(d.feedback);
    } catch {
      setError(networkError());
    } finally {
      setBusy(false);
    }
  }

  if (!canWrite && sorted.length === 0) return null;

  return (
    <section className="ch-stack">
      <h2 className="ch-section-title">{tr("بازخوردها", "Feedback")}</h2>
      {sorted.length === 0 ? (
        <p className="chpd-hidden">{tr("هنوز بازخوردی ننوشتی", "You haven't written any feedback yet")}</p>
      ) : (
        sorted.map((f) => (
          <div key={f.id} className="ch-card chpd-fb">
            <time dateTime={f.createdAt}>
              {fmtDateTime(f.createdAt)}
              {" · "}
              {f.itemTitle ? `${f.logId ? tr("اجرای ", "Session of ") : ""}«${f.itemTitle}»` : tr("کل برنامه", "Whole program")}
              {isStudent && !f.readAt ? ` · ${tr("تازه", "New")}` : ""}
              {!isStudent ? ` · ${f.readAt ? tr("دیده شد", "Seen") : tr("دیده نشده", "Not seen")}` : ""}
            </time>
            <p>{f.body}</p>
          </div>
        ))
      )}

      {canWrite && (
        <form className="ch-card ch-stack" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <div className="chpf-field">
            <label htmlFor="chpd-feedback-body">{tr(`بازخورد به ${target ? target.label : "کل برنامه"}`, `Feedback on ${target ? iso(target.label) : "the whole program"}`)}</label>
            <textarea
              id="chpd-feedback-body" ref={inputRef} className="wsearch-newform-name trade-glass-field" rows={2} value={body} maxLength={FEEDBACK_MAX + 50}
              onChange={(e) => { setBody(e.target.value); setError(null); }}
              placeholder={tr("مثلا «ست آخر را با وزنه‌ی کمتر انجام بده»", "For example: \"Do the last set with a lighter weight\"")}
            />
          </div>
          {error && <p className="chpf-error" role="alert">{error}</p>}
          <div className="chpd-actions">
            {target && <button type="button" className="btn btn-ghost" onClick={onClearTarget}><X size={16} aria-hidden="true" /> {tr("کل برنامه", "Whole program")}</button>}
            <button type="submit" className={`btn btn-primary${busy ? " is-loading" : ""}`} disabled={busy || !body.trim()}>
              {busy ? <Spinner size={16} /> : <><ArrowUp size={16} aria-hidden="true" /> {tr("فرستادن", "Send")}</>}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
