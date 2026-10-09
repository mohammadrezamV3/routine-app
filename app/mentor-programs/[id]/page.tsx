"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveRefresh, useVisiblePolling } from "@/lib/liveSync";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CalendarCheck, CalendarDays, Check, CheckCircle2, CircleSlash, ClipboardList, Clock, Dumbbell, EyeOff, Flag,
  Hourglass, MessageSquareText, Pencil, Send, X,
} from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorChip, MentorEmpty, MentorSection } from "@/components/MentorUI";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { ProgramStatusBadge } from "@/components/ProgramStatusBadge";
import { ProgramRespondModal } from "@/components/ProgramRespondModal";
import { MentorConfirmDialog } from "@/components/MentorConfirmDialog";
import { MentorReportModal } from "@/components/MentorReportModal";
import { MentorKebabMenu, type MentorMenuAction } from "@/components/MentorKebabMenu";
import { GradientRing } from "@/components/GradientRing";
import { MentorProgressWeek } from "@/components/MentorProgressWeek";
import { MentorProgramTools } from "@/components/MentorProgramTools";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import type { Feedback, Item, ProgramDetailResponse, ProgramTransitionAction } from "@/lib/mentorTypes";
import { publicUserName } from "@/lib/mentorTypes";
import { fmtDateTime, fmtDay, networkError, readApiError } from "@/lib/mentorFormat";
import { weekdayName, faNum, isoLocal } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import { GoldenName } from "@/components/GoldenName";

const FEEDBACK_MAX = 2000;

const CHIP = { size: 13, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN_SM = { size: 14, strokeWidth: 1.75, "aria-hidden": true } as const;
const SECTION = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;

type Back = { href: string; label: string };
type Head = { title: string; back: Back; canReport: boolean; canCancel: boolean } | null;
/** فرمان منوی سه‌نقطه‌ی سر صفحه به بدنه */
type MenuCmd = { kind: "report" | "cancel"; n: number } | null;

// ───────────────────────── تاریخ محلی ─────────────────────────

function parseDay(iso: string): Date { return new Date(iso + "T00:00:00"); }
function addDays(iso: string, n: number): string { const d = parseDay(iso); d.setDate(d.getDate() + n); return isoLocal(d); }
/** شنبه‌ی همان هفته (هفته‌ی ایرانی) */
function weekStartOf(iso: string): string { const d = parseDay(iso); return addDays(iso, -((d.getDay() + 1) % 7)); }

function daysLabel(item: Item): string {
  if (item.repeat === "DAILY" || item.days.length === 7) return tr("هر روز", "Every day");
  const order = [6, 0, 1, 2, 3, 4, 5];
  return order.filter((d) => item.days.includes(d)).map((d) => weekdayName(d)).join(tr("، ", ", ")) || tr("بدون روز", "No days");
}

// عنوان (نام برنامه) و بازگشت (نام طرف مقابل) فقط بعد از بارگذاری معلوم‌اند؛
// بدنه آن‌ها را بالا می‌فرستد تا پوسته‌ی مشترک رندرشان کند.
export default function MentorProgramPage() {
  const [head, setHead] = useState<Head>(null);
  const [fallbackBack, setFallbackBack] = useState(false);
  const [cmd, setCmd] = useState<MenuCmd>(null);
  // اقدام‌های کم‌کاربرد/مخرب (گزارش، لغو) در منوی سه‌نقطه‌ی ردیف عنوان، نه دکمه‌ی آزاد پایین صفحه
  const menu: MentorMenuAction[] = [
    ...(head?.canReport ? [{ label: tr("گزارش برنامه", "Report program"), icon: <Flag {...BTN} />, onClick: () => setCmd((c) => ({ kind: "report" as const, n: (c?.n ?? 0) + 1 })) }] : []),
    ...(head?.canCancel ? [{ label: tr("لغو برنامه", "Cancel program"), icon: <CircleSlash {...BTN} />, danger: true, onClick: () => setCmd((c) => ({ kind: "cancel" as const, n: (c?.n ?? 0) + 1 })) }] : []),
  ];
  return (
    <MentorPageShell
      title={head?.title}
      back={head?.back ?? (fallbackBack ? { href: "/mentorship", label: tr("مربی‌های من", "My mentors") } : null)}
      titleAction={menu.length ? <MentorKebabMenu actions={menu} label={tr("گزینه‌های برنامه", "Program options")} /> : undefined}
      surface
    >
      <ProgramView onHead={setHead} onFailed={setFallbackBack} cmd={cmd} />
    </MentorPageShell>
  );
}

function ProgramView({ onHead, onFailed, cmd }: { onHead: (h: Head) => void; onFailed: (failed: boolean) => void; cmd: MenuCmd }) {
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
  useEffect(() => { load({ quiet: hasData }); }, [load]);
  // زنده: بازخورد/تغییر برنامه از طرف منتور یا لاگ همین کاربر از تب دیگه
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

  // سر صفحه: عنوان = نام برنامه، بازگشت = صفحه‌ی همین رابطه با نام طرف مقابل
  const headTitle = data?.program.title;
  const headRel = data?.program.mentorshipId;
  const headName = data ? publicUserName(data.program.counterpart) : null;
  const headStudent = data?.role === "STUDENT";
  const headCanCancel = !!data && ["DRAFT", "PENDING", "ACCEPTED", "ACTIVE"].includes(data.program.status);
  useEffect(() => {
    if (headTitle && headRel && headName) {
      onHead({ title: headTitle, back: { href: `/mentorship/${headRel}`, label: headName }, canReport: headStudent, canCancel: headCanCancel });
    }
  }, [headTitle, headRel, headName, headStudent, headCanCancel, onHead]);
  useEffect(() => {
    if (!cmd) return;
    if (cmd.kind === "report") setReportOpen(true);
    else setRespond("cancel");
  }, [cmd]);
  useEffect(() => { onFailed(!!error && !data); }, [error, data, onFailed]);
  useEffect(() => () => { onHead(null); onFailed(false); }, [onHead, onFailed]);

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

  if (error && !data) return <MentorErrorState message={error.msg} onRetry={error.retry ? () => load() : undefined} />;
  if (!data) return <LoadingBlock />;

  const { program, role, items, feedback } = data;
  const isStudent = role === "STUDENT";
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
  const hasActions = answering || editDraft || canActivate || program.status === "ACTIVE";

  function setDayNote(date: string, body: string | null) {
    setData((d) =>
      d && d.progressView
        ? { ...d, progressView: { ...d.progressView, days: d.progressView.days.map((x) => (x.date === date ? { ...x, note: body } : x)) } }
        : d
    );
  }

  return (
    <>
      <MentorSection>
        <div className="mentor-form" style={{ gap: 12 }}>
          <div className="mentor-chips">
            <ProgramStatusBadge status={program.status} changeRequested={!!program.sentAt || !!program.changeRequestNote} />
            <MentorChip tone="neutral" icon={isWorkout ? <Dumbbell {...CHIP} /> : <CalendarCheck {...CHIP} />}>
              {isWorkout ? tr("برنامه‌ی تمرینی", "Workout program") : tr("برنامه‌ی روتین", "Routine program")}
            </MentorChip>
            {program.version > 1 && <MentorChip tone="neutral">{tr("ویرایش‌شده", "Edited")}</MentorChip>}
            {program.status === "ACCEPTED" && (
              canActivate
                ? <MentorChip tone="ok" icon={<CheckCircle2 {...CHIP} />}>{tr("آماده‌ی شروع", "Ready to start")}</MentorChip>
                : <MentorChip tone="info" icon={<Clock {...CHIP} />}>{program.startDate ? tr(`شروع از ${fmtDay(program.startDate)}`, `Starts ${fmtDay(program.startDate)}`) : tr("منتظر تاریخ شروع", "Waiting for a start date")}</MentorChip>
            )}
            {isStudent && program.status === "DRAFT" && program.changeRequestNote && (
              <MentorChip tone="info" icon={<Hourglass {...CHIP} />}>{tr("در حال اصلاح توسط مربی", "Being revised by the mentor")}</MentorChip>
            )}
          </div>

          <div className="mentor-row-sub">
            <span>
              <MentorUserAvatar name={otherName} avatarUrl={other.avatarUrl} size={20} />
              {isStudent ? tr("مربی", "Mentor") : tr("شاگرد", "Student")}{tr(": ", ": ")}<GoldenName golden={other.golden} staff={other.staff}>{otherName}</GoldenName>
            </span>
            {program.startDate && <span><CalendarDays {...CHIP} /> {tr("شروع", "Start")} {fmtDay(program.startDate)}</span>}
            {program.endDate && <span><CalendarDays {...CHIP} /> {tr("پایان", "End")} {fmtDay(program.endDate)}</span>}
            <span><ClipboardList {...CHIP} /> {faNum(items.length)} {isWorkout ? tr("حرکت", items.length === 1 ? "exercise" : "exercises") : tr("کار", items.length === 1 ? "task" : "tasks")}</span>
          </div>

          {program.description && <p className="mentor-bio">{program.description}</p>}

          {mentorNote && (
            <div className="mentor-note-box" style={{ marginTop: 0 }}>
              <b>{tr("یادداشت مربی", "Mentor's note")}</b>
              <div>{mentorNote}</div>
            </div>
          )}

          {program.status === "DRAFT" && program.changeRequestNote && (
            <div className="mentor-note-box" style={{ marginTop: 0 }}>
              <b>{isStudent ? tr("درخواست تغییر تو", "Your change request") : tr("درخواست تغییر شاگرد", "Student's change request")}</b>
              <div>{program.changeRequestNote}</div>
            </div>
          )}
          {program.status === "REJECTED" && program.rejectReason && (
            <div className="mentor-note-box" style={{ marginTop: 0 }}>
              <b>{tr("دلیل رد", "Reason for declining")}</b>
              <div>{program.rejectReason}</div>
            </div>
          )}

          {showProgress && program.progress.hidden && (
            <div className="mentor-chips">
              <MentorChip tone="neutral" icon={<EyeOff {...CHIP} />}>{tr("این بخش رو شاگرد خصوصی نگه داشته", "The student has kept this private")}</MentorChip>
            </div>
          )}
          {showProgress && !program.progress.hidden && (
            <div className="mv2-pg-prog">
              <span className="mv2-pg-prog-ring" role="img" aria-label={tr(`پیشرفت ${faNum(Math.round(program.progress.rate))} درصد`, `Progress ${faNum(Math.round(program.progress.rate))} percent`)}>
                <GradientRing value={Math.max(0, Math.min(100, program.progress.rate)) / 100} size={84} stroke={7}>
                  <b className="mv2-pg-prog-num">{faNum(Math.round(program.progress.rate))}{tr("٪", "%")}</b>
                </GradientRing>
              </span>
              <ul className="mv2-pg-prog-legend">
                <li><CheckCircle2 {...CHIP} /> {tr("انجام شده", "Done")} {faNum(program.progress.completed)}</li>
                {/* نیمه‌کاره فقط از ثبت‌های دستی قدیمی می‌آید */}
                {program.progress.partial > 0 && <li>{tr("نیمه‌کاره", "Partial")} {faNum(program.progress.partial)}</li>}
                <li><X {...CHIP} /> {tr("انجام نشده", "Not done")} {faNum(program.progress.missed)}</li>
              </ul>
            </div>
          )}

          {hasActions && (
            <>
              {actionError && !confirmComplete && <div className="form-inline-error" role="alert" style={{ marginTop: 0 }}>{actionError}</div>}
              <div className="mentor-btn-group is-end">
                {answering && (
                  <>
                    <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => setRespond("reject")} disabled={!!busy}>
                      <X {...BTN} /> {tr("نه", "No")}
                    </button>
                    <button type="button" className="account-outline-btn mentor-btn" onClick={() => setRespond("request_changes")} disabled={!!busy}>
                      <Pencil {...BTN} /> {tr("تغییر بخواه", "Ask for changes")}
                    </button>
                    <button type="button" className="trade-primary-btn mentor-btn" onClick={() => transition("accept")} disabled={!!busy}>
                      {busy === "accept" ? <Spinner size={14} /> : <><Check {...BTN} /> {tr("قبول", "Accept")}</>}
                    </button>
                  </>
                )}
                {editDraft && (
                  <Link href={`/mentor/programs/${program.id}/edit`} className="trade-primary-btn mentor-btn">
                    <Pencil {...BTN} /> {tr("ویرایش و فرستادن", "Edit and send")}
                  </Link>
                )}
                {program.status === "ACTIVE" && (
                  <button type="button" className="account-outline-btn mentor-btn" onClick={() => { setActionError(null); setConfirmComplete(true); }} disabled={!!busy}>
                    <CheckCircle2 {...BTN} /> {tr("تموم کردن برنامه", "Finish program")}
                  </button>
                )}
                {canActivate && (
                  <button type="button" className="trade-primary-btn mentor-btn" onClick={() => transition("activate")} disabled={!!busy}>
                    {busy === "activate" ? <Spinner size={14} /> : tr("شروع برنامه", "Start program")}
                  </button>
                )}
              </div>
            </>
          )}
          {!hasActions && actionError && <div className="form-inline-error" role="alert" style={{ marginTop: 0 }}>{actionError}</div>}
        </div>
      </MentorSection>

      {/* ابزارهای منتور روی برنامه (قالب، کپی، CSV) — فقط سمت منتور */}
      {!isStudent && <MentorProgramTools programId={program.id} title={program.title} studentId={program.counterpart.id} />}

      {trackable ? (
        <MentorSection
          title={isStudent ? tr("پیشرفت تو", "Your progress") : tr("پیشرفت شاگرد", "Student's progress")}
          icon={<CalendarDays {...SECTION} />}
          desc={isStudent
            ? tr("وضعیت هر آیتم از تیک‌های «روتین من» خوانده می‌شود؛ ثبت دستی لازم نیست.", "The status of each item is read from your ticks in My Routine; no manual logging needed.")
            : tr("وضعیت هر آیتم از تیک‌های شاگرد در روتینش خوانده می‌شود، نه گزارش دستی.", "The status of each item is read from the student's ticks in their routine, not from manual reports.")}
        >
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
            <MentorEmpty>{tr("پیشرفت از روز شروع برنامه نمایش داده می‌شود", "Progress is shown from the program's start day")}</MentorEmpty>
          )}
        </MentorSection>
      ) : (
        <MentorSection title={tr("کارهای برنامه", "Program tasks")} icon={<ClipboardList {...SECTION} />} count={sortedItems.length ? faNum(sortedItems.length) : undefined}>
          {sortedItems.length === 0 ? (
            <MentorEmpty>{tr("این برنامه کاری نداره", "This program has no tasks")}</MentorEmpty>
          ) : (
            sortedItems.map((it) => (
              <div key={it.id} className="mentor-item">
                <div className="mentor-item-head"><div className="mentor-item-title">{it.title}</div></div>
                <ItemMeta item={it} isWorkout={isWorkout} showDays />
                {it.details && <p className="mentor-item-details">{it.details}</p>}
              </div>
            ))
          )}
        </MentorSection>
      )}

      <FeedbackBlock
        programId={program.id}
        role={role}
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

// ───────────────────────── آیتم‌ها ─────────────────────────

function ItemMeta({ item, isWorkout, showDays }: { item: Item; isWorkout: boolean; showDays?: boolean }) {
  return (
    <div className="mentor-item-meta">
      {showDays && <span><CalendarDays {...CHIP} /> {daysLabel(item)}</span>}
      {item.startTime && <span><Clock {...CHIP} /> <span className="mono" dir="ltr">{faNum(item.startTime)}</span></span>}
      {item.durationMin != null && <span>{faNum(item.durationMin)} {tr("دقیقه", "min")}</span>}
      {isWorkout && item.sets != null && <span><Dumbbell {...CHIP} /> {faNum(item.sets)} {tr("ست", item.sets === 1 ? "set" : "sets")}{item.reps ? ` × ${faNum(item.reps)}` : ""}</span>}
      {isWorkout && item.weightKg != null && <span>{faNum(item.weightKg)} {tr("کیلوگرم", "kg")}</span>}
      {isWorkout && item.restSec != null && <span>{tr(`استراحت ${faNum(item.restSec)} ثانیه`, `Rest ${faNum(item.restSec)} sec`)}</span>}
    </div>
  );
}

// ───────────────────────── بازخورد ─────────────────────────

function FeedbackBlock({
  programId, role, feedback, canWrite, target, onClearTarget, onSent,
}: {
  programId: string; role: "MENTOR" | "STUDENT"; feedback: Feedback[]; canWrite: boolean;
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
    if (!b) { setError(tr("متن بازخورد خالی است", "The feedback is empty")); return; }
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
    <MentorSection title={tr("بازخوردها", "Feedback")} icon={<MessageSquareText {...SECTION} />} count={sorted.length ? faNum(sorted.length) : undefined}>
      {sorted.length === 0 ? (
        <MentorEmpty>{tr("هنوز بازخوردی ننوشته‌ای", "You haven't written any feedback yet")}</MentorEmpty>
      ) : (
        sorted.map((f) => (
          <div key={f.id} className="mentor-feedback">
            <div className="mentor-feedback-head">
              <span>{fmtDateTime(f.createdAt)}</span>
              {f.itemTitle ? <span className="mentor-feedback-ref">{f.logId ? tr("اجرای ", "Session of ") : ""}«{f.itemTitle}»</span> : <span>{tr("کل برنامه", "Whole program")}</span>}
              {role === "STUDENT" && !f.readAt && <span className="mentor-feedback-new">{tr("تازه", "New")}</span>}
              {role === "MENTOR" && <span>{f.readAt ? tr("دیده شد", "Seen") : tr("دیده نشده", "Not seen")}</span>}
            </div>
            <p className="mentor-feedback-body">{f.body}</p>
          </div>
        ))
      )}

      {canWrite && (
        <div className="mentor-field" style={{ marginTop: 12 }}>
          <div className="mentor-btn-group">
            <label className="mentor-field-label" htmlFor="mentor-feedback-body">{tr(`بازخورد به ${target ? target.label : "کل برنامه"}`, `Feedback on ${target ? target.label : "the whole program"}`)}</label>
            {target && <button type="button" className="mentor-text-btn" onClick={onClearTarget}>{tr("تغییر به کل برنامه", "Switch to the whole program")}</button>}
          </div>
          <form className="routine-ai-composer" style={{ borderTop: "none", paddingTop: 0 }} onSubmit={(e) => { e.preventDefault(); send(); }}>
            <textarea
              id="mentor-feedback-body"
              ref={inputRef}
              className="routine-ai-input"
              rows={1}
              value={body}
              maxLength={FEEDBACK_MAX + 50}
              onChange={(e) => { setBody(e.target.value); setError(null); }}
              placeholder={tr("مثلا «ست آخر را با وزنه‌ی کمتر انجام بده»", "For example: \"Do the last set with a lighter weight\"")}
            />
            <button type="submit" className={`routine-ai-action${body.trim() ? " has-text" : ""}`} disabled={busy || !body.trim()} aria-label={tr("ارسال بازخورد", "Send feedback")}>
              <span className="routine-ai-action-icon" aria-hidden="true">{busy ? <Spinner size={16} /> : <Send size={16} strokeWidth={1.75} />}</span>
            </button>
          </form>
          {error && <p className="mentor-field-error" role="alert">{error}</p>}
        </div>
      )}
    </MentorSection>
  );
}
