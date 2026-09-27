"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CalendarCheck, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleSlash, ClipboardList, Clock, Dumbbell, Flag,
  Hourglass, MessageSquareText, Pencil, Send, X,
} from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorChip, MentorEmpty, MentorSection } from "@/components/MentorUI";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { ProgramStatusBadge } from "@/components/ProgramStatusBadge";
import { ProgramRespondModal } from "@/components/ProgramRespondModal";
import { MentorConfirmDialog } from "@/components/MentorConfirmDialog";
import { MentorReportModal } from "@/components/MentorReportModal";
import { NumberInput } from "@/components/NumberInput";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import type { Feedback, Item, Log, ProgramDetailResponse, ProgramLogStatus, ProgramTransitionAction } from "@/lib/mentorTypes";
import { dayKey, publicUserName } from "@/lib/mentorTypes";
import { fmtDateTime, fmtDay, fmtWeekday, NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { FA_WEEKDAY, FA_WEEKDAY_SHORT, faNum, isoLocal, toJalali } from "@/lib/jalali";

const LOG_LABELS: Record<ProgramLogStatus, string> = { COMPLETED: "انجام شد", PARTIAL: "نیمه‌کاره", MISSED: "انجام نشد" };
const NOTE_MAX = 500;
const FEEDBACK_MAX = 2000;

const CHIP = { size: 13, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN_SM = { size: 14, strokeWidth: 1.75, "aria-hidden": true } as const;
const SECTION = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;

type Back = { href: string; label: string };
type Head = { title: string; back: Back } | null;

// ───────────────────────── تاریخِ محلی ─────────────────────────

function parseDay(iso: string): Date { return new Date(iso + "T00:00:00"); }
function addDays(iso: string, n: number): string { const d = parseDay(iso); d.setDate(d.getDate() + n); return isoLocal(d); }
/** شنبه‌ی همان هفته (هفته‌ی ایرانی) */
function weekStartOf(iso: string): string { const d = parseDay(iso); return addDays(iso, -((d.getDay() + 1) % 7)); }

function itemRuns(item: Item, day: string): boolean {
  if (item.repeat === "DAILY") return true;
  return item.days.includes(parseDay(day).getDay());
}

function daysLabel(item: Item): string {
  if (item.repeat === "DAILY" || item.days.length === 7) return "هر روز";
  const order = [6, 0, 1, 2, 3, 4, 5];
  return order.filter((d) => item.days.includes(d)).map((d) => FA_WEEKDAY[d]).join("، ") || "بدون روز";
}

function jDay(iso: string): string {
  const d = parseDay(iso);
  return faNum(toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())[2]);
}

// عنوان (نام برنامه) و بازگشت (نامِ طرفِ مقابل) فقط بعد از بارگذاری معلوم‌اند؛
// بدنه آن‌ها را بالا می‌فرستد تا پوسته‌ی مشترک رندرشان کند.
export default function MentorProgramPage() {
  const [head, setHead] = useState<Head>(null);
  const [fallbackBack, setFallbackBack] = useState(false);
  return (
    <MentorPageShell
      title={head?.title}
      back={head?.back ?? (fallbackBack ? { href: "/mentorship", label: "منتورهای من" } : null)}
    >
      <ProgramView onHead={setHead} onFailed={setFallbackBack} />
    </MentorPageShell>
  );
}

function ProgramView({ onHead, onFailed }: { onHead: (h: Head) => void; onFailed: (failed: boolean) => void }) {
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
        const msg = notFound ? "این برنامه پیدا نشد یا به آن دسترسی نداری" : await readApiError(res, "برنامه دریافت نشد؛ دوباره تلاش کن");
        // بارگذاریِ آرام (هفته/بعد از اقدام) صفحه را خراب نمی‌کند؛ خطا کنارِ دکمه‌ها دیده می‌شود
        if (opts?.quiet) setActionError(msg); else setError({ msg, retry: !notFound });
        return;
      }
      const d: ProgramDetailResponse = await res.json();
      if (rid !== reqId.current) return;
      setData(d);
      setError(null);
    } catch {
      if (rid !== reqId.current) return;
      if (opts?.quiet) setActionError(NETWORK_ERROR); else setError({ msg: NETWORK_ERROR, retry: true });
    } finally {
      if (rid === reqId.current) setWeekLoading(false);
    }
  }, [id, weekStart, weekEnd]);

  // بارِ اول کل صفحه، بعد از آن (عوض‌شدنِ هفته) فقط نشانگرِ کوچکِ بالای روزها
  const hasData = !!data;
  useEffect(() => { load({ quiet: hasData }); }, [load]);

  // باز شدنِ صفحه توسطِ شاگرد = دیدنِ بازخوردها؛ فقط یک بار و فقط اگر نخوانده‌ای هست
  useEffect(() => {
    if (!data || data.role !== "STUDENT" || markedRead.current) return;
    if (!data.feedback.some((f) => !f.readAt)) return;
    markedRead.current = true;
    fetch(`/api/mentor-programs/${id}/feedback/read`, { method: "POST" }).catch(() => { markedRead.current = false; });
  }, [data, id]);

  // سرِ صفحه: عنوان = نامِ برنامه، بازگشت = صفحه‌ی همین رابطه با نامِ طرفِ مقابل
  const headTitle = data?.program.title;
  const headRel = data?.program.mentorshipId;
  const headName = data ? publicUserName(data.program.counterpart) : null;
  useEffect(() => {
    if (headTitle && headRel && headName) onHead({ title: headTitle, back: { href: `/mentorship/${headRel}`, label: headName } });
  }, [headTitle, headRel, headName, onHead]);
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
      setActionError(NETWORK_ERROR);
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) return <MentorErrorState message={error.msg} onRetry={error.retry ? () => load() : undefined} />;
  if (!data) return <LoadingBlock />;

  const { program, role, items, logs, feedback } = data;
  const isStudent = role === "STUDENT";
  const other = program.counterpart;
  const otherName = publicUserName(other);
  const isWorkout = program.type === "WORKOUT";
  const rangeStart = program.startDate ?? dayKey(program.activatedAt);
  const rangeEnd = program.endDate;
  const inRange = (d: string) => (!rangeStart || d >= rangeStart) && (!rangeEnd || d <= rangeEnd);
  const trackable = program.status === "ACTIVE" || program.status === "COMPLETED" || (!isStudent && program.status === "CANCELLED");
  const canCancel = ["DRAFT", "PENDING", "ACCEPTED", "ACTIVE"].includes(program.status);
  const canActivate = program.status === "ACCEPTED" && (!program.startDate || program.startDate <= today);
  const sortedItems = [...items].sort((a, b) => a.order - b.order || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  const dayItems = sortedItems.filter((it) => itemRuns(it, selected));
  const logFor = (itemId: string, day: string) => logs.find((l) => l.itemId === itemId && dayKey(l.date) === day) ?? null;
  const showProgress = program.status === "ACTIVE" || program.status === "COMPLETED";
  const mentorNote = program.note?.trim() || null;
  const answering = isStudent && program.status === "PENDING";
  const editDraft = !isStudent && program.status === "DRAFT";
  const hasActions = answering || editDraft || canActivate || program.status === "ACTIVE";

  function setLog(l: Log) {
    setData((d) => (d ? { ...d, logs: [...d.logs.filter((x) => !(x.itemId === l.itemId && dayKey(x.date) === dayKey(l.date))), l] } : d));
  }

  return (
    <>
      <MentorSection>
        <div className="mentor-form" style={{ gap: 12 }}>
          <div className="mentor-chips">
            <ProgramStatusBadge status={program.status} />
            <MentorChip tone="neutral" icon={isWorkout ? <Dumbbell {...CHIP} /> : <CalendarCheck {...CHIP} />}>
              {isWorkout ? "برنامه‌ی تمرینی" : "برنامه‌ی روتین"}
            </MentorChip>
            {program.version > 1 && <MentorChip tone="neutral">نسخه‌ی {faNum(program.version)}</MentorChip>}
            {program.status === "ACCEPTED" && (
              canActivate
                ? <MentorChip tone="ok" icon={<CheckCircle2 {...CHIP} />}>آماده‌ی شروع</MentorChip>
                : <MentorChip tone="info" icon={<Clock {...CHIP} />}>{program.startDate ? `شروع از ${fmtDay(program.startDate)}` : "منتظر تاریخ شروع"}</MentorChip>
            )}
            {isStudent && program.status === "DRAFT" && program.changeRequestNote && (
              <MentorChip tone="info" icon={<Hourglass {...CHIP} />}>در حال اصلاح توسط منتور</MentorChip>
            )}
          </div>

          <div className="mentor-row-sub">
            <span>
              <MentorUserAvatar name={otherName} avatarUrl={other.avatarUrl} size={20} />
              {isStudent ? "منتور" : "شاگرد"}: {otherName}
            </span>
            {program.startDate && <span><CalendarDays {...CHIP} /> شروع {fmtDay(program.startDate)}</span>}
            {program.endDate && <span><CalendarDays {...CHIP} /> پایان {fmtDay(program.endDate)}</span>}
            <span><ClipboardList {...CHIP} /> {faNum(items.length)} آیتم</span>
          </div>

          {program.description && <p className="mentor-bio">{program.description}</p>}

          {mentorNote && (
            <div className="mentor-note-box" style={{ marginTop: 0 }}>
              <b>یادداشت منتور</b>
              <div>{mentorNote}</div>
            </div>
          )}

          {program.status === "DRAFT" && program.changeRequestNote && (
            <div className="mentor-note-box" style={{ marginTop: 0 }}>
              <b>{isStudent ? "درخواست تغییر تو" : "درخواست تغییر شاگرد"}</b>
              <div>{program.changeRequestNote}</div>
            </div>
          )}
          {program.status === "REJECTED" && program.rejectReason && (
            <div className="mentor-note-box" style={{ marginTop: 0 }}>
              <b>دلیل رد</b>
              <div>{program.rejectReason}</div>
            </div>
          )}

          {showProgress && (
            <div>
              <div className="mentor-progress" style={{ marginTop: 0 }}>
                <div className="rp-bar" role="progressbar" aria-valuenow={Math.round(program.progress.rate)} aria-valuemin={0} aria-valuemax={100} aria-label="پایبندی">
                  <span style={{ width: `${Math.max(0, Math.min(100, program.progress.rate))}%` }} />
                </div>
                <span className="mentor-progress-value">{faNum(program.progress.rate)}٪</span>
              </div>
              <div className="mentor-progress-legend">
                <span>انجام‌شده {faNum(program.progress.completed)}</span>
                <span>نیمه‌کاره {faNum(program.progress.partial)}</span>
                <span>انجام‌نشده {faNum(program.progress.missed)}</span>
              </div>
            </div>
          )}

          {hasActions && (
            <>
              {actionError && !confirmComplete && <div className="form-inline-error" role="alert" style={{ marginTop: 0 }}>{actionError}</div>}
              <div className="mentor-btn-group is-end">
                {answering && (
                  <>
                    <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => setRespond("reject")} disabled={!!busy}>
                      <X {...BTN} /> رد برنامه
                    </button>
                    <button type="button" className="account-outline-btn mentor-btn" onClick={() => setRespond("request_changes")} disabled={!!busy}>
                      <Pencil {...BTN} /> درخواست تغییر
                    </button>
                    <button type="button" className="trade-primary-btn mentor-btn" onClick={() => transition("accept")} disabled={!!busy}>
                      {busy === "accept" ? <Spinner size={14} /> : <><Check {...BTN} /> پذیرفتن برنامه</>}
                    </button>
                  </>
                )}
                {editDraft && (
                  <Link href={`/mentor/programs/${program.id}/edit`} className="trade-primary-btn mentor-btn">
                    <Pencil {...BTN} /> ویرایش پیش‌نویس
                  </Link>
                )}
                {program.status === "ACTIVE" && (
                  <button type="button" className="account-outline-btn mentor-btn" onClick={() => { setActionError(null); setConfirmComplete(true); }} disabled={!!busy}>
                    <CheckCircle2 {...BTN} /> اتمام برنامه
                  </button>
                )}
                {canActivate && (
                  <button type="button" className="trade-primary-btn mentor-btn" onClick={() => transition("activate")} disabled={!!busy}>
                    {busy === "activate" ? <Spinner size={14} /> : "شروع برنامه"}
                  </button>
                )}
              </div>
            </>
          )}
          {!hasActions && actionError && <div className="form-inline-error" role="alert" style={{ marginTop: 0 }}>{actionError}</div>}
        </div>
      </MentorSection>

      {trackable ? (
        <MentorSection
          title={isStudent ? "ثبت اجرا" : "پایش اجرا"}
          icon={<CalendarDays {...SECTION} />}
          desc={isStudent && program.status === "ACTIVE" ? "روز را انتخاب کن و وضعیت هر آیتم را ثبت کن." : undefined}
        >
          <WeekNav
            weekStart={weekStart}
            selected={selected}
            today={today}
            loading={weekLoading}
            onPrev={() => { const s = addDays(weekStart, -7); setWeekStart(s); setSelected(weekStartOf(today) === s ? today : s); }}
            onNext={() => { const s = addDays(weekStart, 7); setWeekStart(s); setSelected(weekStartOf(today) === s ? today : s); }}
            onToday={() => { setWeekStart(weekStartOf(today)); setSelected(today); }}
            onSelect={setSelected}
            hasItem={(d) => inRange(d) && sortedItems.some((it) => itemRuns(it, d))}
          />
          <div className="mentor-week-label">{fmtWeekday(selected)}{selected === today ? "، امروز" : ""}</div>

          {!inRange(selected) ? (
            <MentorEmpty>این روز خارج از بازه‌ی برنامه است</MentorEmpty>
          ) : dayItems.length === 0 ? (
            <MentorEmpty>برای این روز آیتمی نیست</MentorEmpty>
          ) : (
            dayItems.map((it) =>
              isStudent ? (
                <StudentItem
                  key={`${it.id}:${selected}`}
                  programId={program.id}
                  item={it}
                  isWorkout={isWorkout}
                  day={selected}
                  editable={program.status === "ACTIVE" && selected <= today}
                  future={selected > today}
                  log={logFor(it.id, selected)}
                  onSaved={(l) => { setLog(l); load({ quiet: true }); }}
                />
              ) : (
                <MentorItem
                  key={`${it.id}:${selected}`}
                  item={it}
                  isWorkout={isWorkout}
                  log={logFor(it.id, selected)}
                  future={selected > today}
                  canFeedback={program.status !== "DRAFT"}
                  onFeedback={(t) => setFeedbackTarget(t)}
                />
              )
            )
          )}
        </MentorSection>
      ) : (
        <MentorSection title="آیتم‌های برنامه" icon={<ClipboardList {...SECTION} />} count={sortedItems.length ? faNum(sortedItems.length) : undefined}>
          {sortedItems.length === 0 ? (
            <MentorEmpty>این برنامه آیتمی ندارد</MentorEmpty>
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

      {(canCancel || isStudent) && (
        <div className="mentor-danger-zone">
          {isStudent && (
            <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => setReportOpen(true)}>
              <Flag {...BTN_SM} /> گزارش برنامه
            </button>
          )}
          {canCancel && (
            <button type="button" className="trade-danger-btn mentor-btn is-sm" onClick={() => setRespond("cancel")} disabled={!!busy}>
              <CircleSlash {...BTN_SM} /> لغو برنامه
            </button>
          )}
        </div>
      )}

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
          message="برنامه تمام‌شده علامت بخورد؟"
          hint="ثبت اجرا بسته می‌شود و برنامه از روتین برداشته می‌شود."
          confirmLabel="اتمام برنامه"
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

// ───────────────────────── ناوبریِ هفته ─────────────────────────

function WeekNav({
  weekStart, selected, today, loading, onPrev, onNext, onToday, onSelect, hasItem,
}: {
  weekStart: string; selected: string; today: string; loading: boolean;
  onPrev: () => void; onNext: () => void; onToday: () => void; onSelect: (d: string) => void; hasItem: (d: string) => boolean;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isThisWeek = weekStartOf(today) === weekStart;
  return (
    <>
      <div className="mentor-week-nav">
        <button type="button" className="trade-icon-btn" onClick={onPrev} aria-label="هفته‌ی قبل"><ChevronRight size={16} strokeWidth={1.75} aria-hidden /></button>
        <div className="day-picker">
          {days.map((d) => {
            const js = parseDay(d).getDay();
            return (
              <button
                key={d}
                type="button"
                className={`day-pill${d === selected ? " on" : ""}${d > today ? " is-future" : ""}`}
                onClick={() => onSelect(d)}
                aria-label={fmtWeekday(d)}
                aria-pressed={d === selected}
                style={!hasItem(d) && d !== selected ? { opacity: 0.45 } : undefined}
              >
                {FA_WEEKDAY_SHORT[js]}
                <small>{jDay(d)}</small>
              </button>
            );
          })}
        </div>
        <button type="button" className="trade-icon-btn" onClick={onNext} aria-label="هفته‌ی بعد"><ChevronLeft size={16} strokeWidth={1.75} aria-hidden /></button>
      </div>
      {(loading || !isThisWeek) && (
        <div className="mentor-btn-group" style={{ justifyContent: "center", minHeight: 24, marginBottom: 4 }}>
          {loading && <Spinner size={14} />}
          {!isThisWeek && <button type="button" className="mentor-text-btn" onClick={onToday}>رفتن به هفته‌ی جاری</button>}
        </div>
      )}
    </>
  );
}

// ───────────────────────── آیتم‌ها ─────────────────────────

function ItemMeta({ item, isWorkout, showDays }: { item: Item; isWorkout: boolean; showDays?: boolean }) {
  return (
    <div className="mentor-item-meta">
      {showDays && <span><CalendarDays {...CHIP} /> {daysLabel(item)}</span>}
      {item.startTime && <span><Clock {...CHIP} /> <span className="mono" dir="ltr">{faNum(item.startTime)}</span></span>}
      {item.durationMin != null && <span>{faNum(item.durationMin)} دقیقه</span>}
      {isWorkout && item.sets != null && <span><Dumbbell {...CHIP} /> {faNum(item.sets)} ست{item.reps ? ` × ${faNum(item.reps)}` : ""}</span>}
      {isWorkout && item.weightKg != null && <span>{faNum(item.weightKg)} کیلوگرم</span>}
      {isWorkout && item.restSec != null && <span>استراحت {faNum(item.restSec)} ثانیه</span>}
    </div>
  );
}

function StudentItem({
  programId, item, isWorkout, day, editable, future, log, onSaved,
}: {
  programId: string; item: Item; isWorkout: boolean; day: string; editable: boolean; future: boolean;
  log: Log | null; onSaved: (l: Log) => void;
}) {
  const [status, setStatus] = useState<ProgramLogStatus | null>(log?.status ?? null);
  const [setsDone, setSetsDone] = useState(log?.setsDone != null ? String(log.setsDone) : "");
  const [note, setNote] = useState(log?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty =
    status !== (log?.status ?? null) ||
    setsDone !== (log?.setsDone != null ? String(log.setsDone) : "") ||
    note.trim() !== (log?.note ?? "").trim();
  const justSaved = !!savedAt && !dirty && !error;

  async function save() {
    if (!status) { setError("وضعیت را انتخاب کن"); return; }
    let sets: number | undefined;
    if (isWorkout && setsDone.trim()) {
      sets = Number(setsDone);
      if (!Number.isInteger(sets) || sets < 0 || (item.sets != null && sets > item.sets * 3) || sets > 100) { setError("تعداد ست معتبر نیست"); return; }
    }
    if (note.trim().length > NOTE_MAX) { setError(`یادداشت حداکثر ${faNum(NOTE_MAX)} نویسه است`); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mentor-programs/${programId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, date: day, status, setsDone: sets, note: note.trim() || undefined }),
      });
      if (!res.ok) { setError(await readApiError(res, "ثبت نشد؛ دوباره تلاش کن")); return; }
      const d: { log: Log } = await res.json();
      setSavedAt(Date.now());
      onSaved(d.log);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mentor-item">
      <div className="mentor-item-head">
        <div className="mentor-item-title">{item.title}</div>
        {log && !dirty && <span className={`mentor-log-chip is-${log.status.toLowerCase()}`}>{LOG_LABELS[log.status]}</span>}
      </div>
      <ItemMeta item={item} isWorkout={isWorkout} />
      {item.details && <p className="mentor-item-details">{item.details}</p>}

      {editable ? (
        <>
          <div className="mentor-log-status day-picker" role="radiogroup" aria-label="وضعیت اجرا">
            {(Object.keys(LOG_LABELS) as ProgramLogStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={status === s}
                className={`day-pill${status === s ? ` on is-${s.toLowerCase()}` : ""}`}
                onClick={() => { setStatus(s); setError(null); setSavedAt(null); }}
              >
                {LOG_LABELS[s]}
              </button>
            ))}
          </div>
          <div className={`mentor-log-extra${isWorkout ? " has-sets" : ""}`}>
            {isWorkout && (
              <NumberInput
                className="wsearch-newform-name trade-glass-field"
                value={setsDone}
                onChange={(v) => { setSetsDone(v); setSavedAt(null); }}
                placeholder={item.sets != null ? `مثلاً ${faNum(item.sets)}` : "مثلاً ۳"}
                aria-label="تعداد ست انجام‌شده"
              />
            )}
            <input
              className="wsearch-newform-name trade-glass-field"
              value={note}
              maxLength={NOTE_MAX + 20}
              onChange={(e) => { setNote(e.target.value); setSavedAt(null); }}
              placeholder="مثلاً «ست آخر سنگین بود»"
              aria-label="یادداشت برای منتور (اختیاری)"
            />
          </div>
          <div className="mentor-log-foot">
            {error && <p className="mentor-field-error" role="alert" style={{ flex: 1 }}>{error}</p>}
            <button type="button" className="trade-primary-btn mentor-btn is-sm" onClick={save} disabled={busy || !dirty || !status}>
              {busy ? <Spinner size={14} /> : justSaved ? <><Check {...BTN_SM} /> ثبت شد</> : log ? "به‌روزرسانی ثبت" : "ثبت اجرا"}
            </button>
          </div>
        </>
      ) : (
        <>
          {future && <p className="mentor-log-note">ثبت اجرا برای روزهای آینده ممکن نیست</p>}
          {!future && !log && <p className="mentor-log-note">ثبت نشده</p>}
          {log?.setsDone != null && <p className="mentor-log-note">{faNum(log.setsDone)} ست انجام شد</p>}
          {log?.note && <p className="mentor-log-note">{log.note}</p>}
        </>
      )}
    </div>
  );
}

function MentorItem({
  item, isWorkout, log, future, canFeedback, onFeedback,
}: {
  item: Item; isWorkout: boolean; log: Log | null; future: boolean; canFeedback: boolean;
  onFeedback: (t: { itemId?: string; logId?: string; label: string }) => void;
}) {
  const statusCls = log ? log.status.toLowerCase() : "none";
  return (
    <div className="mentor-item">
      <div className="mentor-item-head">
        <div className="mentor-item-title">{item.title}</div>
        <span className={`mentor-log-chip is-${statusCls}`}>{log ? LOG_LABELS[log.status] : future ? "آینده" : "ثبت‌نشده"}</span>
      </div>
      <ItemMeta item={item} isWorkout={isWorkout} />
      {log?.setsDone != null && <p className="mentor-log-note">{faNum(log.setsDone)}{item.sets != null ? ` از ${faNum(item.sets)}` : ""} ست انجام شد</p>}
      {log?.note && <p className="mentor-log-note">یادداشت شاگرد: {log.note}</p>}
      {canFeedback && (
        <button
          type="button"
          className="mentor-text-btn"
          style={{ marginTop: 4 }}
          onClick={() => onFeedback(log ? { itemId: item.id, logId: log.id, label: `اجرای «${item.title}»` } : { itemId: item.id, label: `«${item.title}»` })}
        >
          <MessageSquareText {...BTN_SM} /> {log ? "بازخورد به این اجرا" : "بازخورد به این آیتم"}
        </button>
      )}
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
    if (!b) { setError("متن بازخورد خالی است"); return; }
    if (b.length > FEEDBACK_MAX) { setError(`بازخورد حداکثر ${faNum(FEEDBACK_MAX)} نویسه است`); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mentor-programs/${programId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: b, itemId: target?.itemId, logId: target?.logId }),
      });
      if (!res.ok) { setError(await readApiError(res, "بازخورد ارسال نشد؛ دوباره تلاش کن")); return; }
      const d: { feedback: Feedback } = await res.json();
      setBody("");
      onSent(d.feedback);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  if (!canWrite && sorted.length === 0) return null;

  return (
    <MentorSection title="بازخوردها" icon={<MessageSquareText {...SECTION} />} count={sorted.length ? faNum(sorted.length) : undefined}>
      {sorted.length === 0 ? (
        <MentorEmpty>هنوز بازخوردی ننوشته‌ای</MentorEmpty>
      ) : (
        sorted.map((f) => (
          <div key={f.id} className="mentor-feedback">
            <div className="mentor-feedback-head">
              <span>{fmtDateTime(f.createdAt)}</span>
              {f.itemTitle ? <span className="mentor-feedback-ref">{f.logId ? "اجرای " : ""}«{f.itemTitle}»</span> : <span>کل برنامه</span>}
              {role === "STUDENT" && !f.readAt && <span className="mentor-feedback-new">تازه</span>}
              {role === "MENTOR" && <span>{f.readAt ? "دیده شد" : "دیده نشده"}</span>}
            </div>
            <p className="mentor-feedback-body">{f.body}</p>
          </div>
        ))
      )}

      {canWrite && (
        <div className="mentor-field" style={{ marginTop: 12 }}>
          <div className="mentor-btn-group">
            <label className="mentor-field-label" htmlFor="mentor-feedback-body">بازخورد به {target ? target.label : "کل برنامه"}</label>
            {target && <button type="button" className="mentor-text-btn" onClick={onClearTarget}>تغییر به کل برنامه</button>}
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
              placeholder="مثلاً «ست آخر را با وزنه‌ی کمتر انجام بده»"
            />
            <button type="submit" className={`routine-ai-action${body.trim() ? " has-text" : ""}`} disabled={busy || !body.trim()} aria-label="ارسال بازخورد">
              <span className="routine-ai-action-icon" aria-hidden="true">{busy ? <Spinner size={16} /> : <Send size={16} strokeWidth={1.75} />}</span>
            </button>
          </form>
          {error && <p className="mentor-field-error" role="alert">{error}</p>}
        </div>
      )}
    </MentorSection>
  );
}
