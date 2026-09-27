"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Dumbbell, Flag, Loader2, MessageSquareText, Pencil, Repeat, Send, Timer,
} from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { ProgramStatusBadge } from "@/components/ProgramStatusBadge";
import { ProgramRespondModal } from "@/components/ProgramRespondModal";
import { MentorConfirmDialog } from "@/components/MentorConfirmDialog";
import { MentorReportModal } from "@/components/MentorReportModal";
import { NumberInput } from "@/components/NumberInput";
import { AccountBlock } from "@/components/AccountUI";
import { LoadingBlock } from "@/components/Spinner";
import type { Feedback, Item, Log, ProgramDetailResponse, ProgramLogStatus, ProgramTransitionAction } from "@/lib/mentorTypes";
import { dayKey, publicUserName } from "@/lib/mentorTypes";
import { fmtDateTime, fmtDay, fmtWeekday, NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { FA_WEEKDAY, FA_WEEKDAY_SHORT, faNum, isoLocal, toJalali } from "@/lib/jalali";

const LOG_LABELS: Record<ProgramLogStatus, string> = { COMPLETED: "انجام شد", PARTIAL: "نیمه‌کاره", MISSED: "انجام نشد" };
const NOTE_MAX = 500;
const FEEDBACK_MAX = 2000;

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
  return order.filter((d) => item.days.includes(d)).map((d) => FA_WEEKDAY[d]).join("، ") || "بدونِ روز";
}

function jDay(iso: string): string {
  const d = parseDay(iso);
  return faNum(toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())[2]);
}

export default function MentorProgramPage() {
  return (
    <MentorPageShell back={null}>
      <ProgramView />
    </MentorPageShell>
  );
}

function ProgramView() {
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
      if (res.status === 404 || res.status === 403) { setError({ msg: "این برنامه پیدا نشد یا به آن دسترسی نداری.", retry: false }); return; }
      if (!res.ok) { setError({ msg: await readApiError(res, "برنامه بارگذاری نشد"), retry: true }); return; }
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

  if (error) {
    return (
      <>
        <Link href="/mentorship" prefetch className="trade-back-link"><ChevronRight size={15} /> منتورهای من</Link>
        <MentorErrorState message={error.msg} onRetry={error.retry ? () => load() : undefined} />
      </>
    );
  }
  if (!data) return <LoadingBlock />;

  const { program, role, items, logs, feedback } = data;
  const isStudent = role === "STUDENT";
  const other = program.counterpart;
  const otherName = publicUserName(other);
  const back = isStudent
    ? { href: `/mentorship/${program.mentorshipId}?tab=programs`, label: "برنامه‌های منتور" }
    : { href: `/mentor/students/${other.id}`, label: otherName };
  const rangeStart = program.startDate ?? dayKey(program.activatedAt);
  const rangeEnd = program.endDate;
  const inRange = (d: string) => (!rangeStart || d >= rangeStart) && (!rangeEnd || d <= rangeEnd);
  const trackable = program.status === "ACTIVE" || program.status === "COMPLETED" || (!isStudent && program.status === "CANCELLED");
  const canCancel = ["DRAFT", "PENDING", "ACCEPTED", "ACTIVE"].includes(program.status);
  const canActivate = program.status === "ACCEPTED" && (!program.startDate || program.startDate <= today);
  const sortedItems = [...items].sort((a, b) => a.order - b.order || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  const dayItems = sortedItems.filter((it) => itemRuns(it, selected));
  const logFor = (itemId: string, day: string) => logs.find((l) => l.itemId === itemId && dayKey(l.date) === day) ?? null;

  function setLog(l: Log) {
    setData((d) => (d ? { ...d, logs: [...d.logs.filter((x) => !(x.itemId === l.itemId && dayKey(x.date) === dayKey(l.date))), l] } : d));
  }

  return (
    <>
      <Link href={back.href} prefetch className="trade-back-link"><ChevronRight size={15} /> {back.label}</Link>

      <div className="trade-surface mentor-hero">
        <div className="mentor-hero-top">
          <div className="mentor-hero-id">
            <div className="rp-card-eyebrow">{program.type === "WORKOUT" ? "برنامه‌ی تمرینی" : "برنامه‌ی روتین"}{program.version > 1 ? ` · نسخه‌ی ${faNum(program.version)}` : ""}</div>
            <h1 className="mentor-hero-name">{program.title}</h1>
            <div className="mentor-rel-sub" style={{ marginTop: 4 }}>
              <MentorUserAvatar name={otherName} avatarUrl={other.avatarUrl} size={20} />
              <span>{isStudent ? "منتور" : "شاگرد"}: {otherName}</span>
            </div>
          </div>
          <ProgramStatusBadge status={program.status} />
        </div>
        {program.description && <p className="mentor-bio" style={{ marginTop: 12, color: "var(--muted)" }}>{program.description}</p>}
        <div className="rp-card-meta">
          {program.startDate && <span><CalendarDays size={12} /> شروع {fmtDay(program.startDate)}</span>}
          {program.endDate && <span><CalendarDays size={12} /> پایان {fmtDay(program.endDate)}</span>}
          <span>{faNum(items.length)} آیتم</span>
        </div>

        {(program.status === "ACTIVE" || program.status === "COMPLETED") && (
          <>
            <div className="mentor-progress">
              <div className="rp-bar"><span style={{ width: `${Math.max(0, Math.min(100, program.progress.rate))}%` }} /></div>
              <span className="rp-card-pct">{faNum(program.progress.rate)}٪</span>
            </div>
            <div className="mentor-progress-legend">
              <span>انجام‌شده: {faNum(program.progress.completed)}</span>
              <span>نیمه‌کاره: {faNum(program.progress.partial)}</span>
              <span>انجام‌نشده: {faNum(program.progress.missed)}</span>
            </div>
          </>
        )}

        {program.status === "DRAFT" && program.changeRequestNote && (
          <div className="mentor-note-box">
            <b>{isStudent ? "درخواستِ تغییرت:" : "درخواستِ تغییرِ شاگرد:"}</b> {program.changeRequestNote}
            {isStudent && <div style={{ marginTop: 4 }}>منتور در حالِ اصلاحِ برنامه است؛ نسخه‌ی تازه که برسد همین‌جا می‌بینی.</div>}
          </div>
        )}
        {program.status === "REJECTED" && program.rejectReason && (
          <div className="mentor-note-box"><b>دلیلِ رد:</b> {program.rejectReason}</div>
        )}
        {program.status === "ACCEPTED" && (
          <div className="mentor-note-box">
            {canActivate ? "برنامه پذیرفته شده و آماده‌ی شروع است." : `برنامه پذیرفته شده و ${program.startDate ? `از ${fmtDay(program.startDate)}` : "به‌زودی"} شروع می‌شود.`}
          </div>
        )}

        {actionError && <div className="trade-form-error">{actionError}</div>}

        <div className="mentor-actions-bar">
          {isStudent && program.status === "PENDING" && (
            <>
              <button type="button" className="trade-primary-btn" onClick={() => transition("accept")} disabled={!!busy}>
                {busy === "accept" ? <Loader2 size={15} className="trade-spin" /> : <><Check size={15} /> پذیرفتن</>}
              </button>
              <button type="button" className="account-outline-btn" onClick={() => setRespond("request_changes")} disabled={!!busy}>درخواستِ تغییر</button>
              <button type="button" className="account-outline-btn muted" onClick={() => setRespond("reject")} disabled={!!busy}>رد</button>
            </>
          )}
          {!isStudent && program.status === "DRAFT" && (
            <Link href={`/mentor/programs/${program.id}/edit`} className="trade-primary-btn" style={{ textDecoration: "none" }}>
              <Pencil size={14} /> ویرایشِ پیش‌نویس
            </Link>
          )}
          {canActivate && (
            <button type="button" className="trade-primary-btn" onClick={() => transition("activate")} disabled={!!busy}>
              {busy === "activate" ? <Loader2 size={15} className="trade-spin" /> : "شروعِ برنامه"}
            </button>
          )}
          {program.status === "ACTIVE" && (
            <button type="button" className="account-outline-btn" onClick={() => { setActionError(null); setConfirmComplete(true); }} disabled={!!busy}>
              <Check size={14} /> اتمامِ برنامه
            </button>
          )}
          {canCancel && (
            <button type="button" className="account-outline-btn muted" onClick={() => setRespond("cancel")} disabled={!!busy}>لغو</button>
          )}
        </div>
        {isStudent && (
          <button type="button" className="trade-ghost-btn" style={{ marginTop: 10 }} onClick={() => setReportOpen(true)}>
            <Flag size={12} /> گزارشِ این برنامه
          </button>
        )}
      </div>

      {trackable ? (
        <AccountBlock
          title={isStudent ? "اجرای برنامه" : "پایشِ اجرا"}
          icon={<CalendarDays size={15} />}
          desc={isStudent ? (program.status === "ACTIVE" ? "روز را انتخاب کن و برای هر آیتم ثبت کن که انجامش دادی یا نه." : undefined) : "رنگ‌ها: سبز انجام‌شده، زرد نیمه‌کاره، قرمز انجام‌نشده، خاکستری ثبت‌نشده."}
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
          <div className="mentor-week-label">{fmtWeekday(selected)}{selected === today ? " (امروز)" : ""}</div>

          {!inRange(selected) ? (
            <p className="mentor-muted" style={{ textAlign: "center", margin: "8px 0" }}>این روز خارج از بازه‌ی برنامه است.</p>
          ) : dayItems.length === 0 ? (
            <p className="mentor-muted" style={{ textAlign: "center", margin: "8px 0" }}>برای این روز آیتمی در برنامه نیست.</p>
          ) : (
            dayItems.map((it) =>
              isStudent ? (
                <StudentItem
                  key={`${it.id}:${selected}`}
                  programId={program.id}
                  item={it}
                  isWorkout={program.type === "WORKOUT"}
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
                  isWorkout={program.type === "WORKOUT"}
                  log={logFor(it.id, selected)}
                  future={selected > today}
                  canFeedback={program.status !== "DRAFT"}
                  onFeedback={(t) => setFeedbackTarget(t)}
                />
              )
            )
          )}
        </AccountBlock>
      ) : (
        <AccountBlock title="آیتم‌های برنامه" icon={<Repeat size={15} />}>
          {sortedItems.length === 0 ? (
            <p className="mentor-muted" style={{ margin: 0 }}>این برنامه هنوز آیتمی ندارد.</p>
          ) : (
            sortedItems.map((it) => (
              <div key={it.id} className="mentor-item">
                <div className="mentor-item-head"><div className="mentor-item-title">{it.title}</div></div>
                <ItemMeta item={it} isWorkout={program.type === "WORKOUT"} showDays />
                {it.details && <p className="mentor-item-details">{it.details}</p>}
              </div>
            ))
          )}
        </AccountBlock>
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
          message="برنامه تمام‌شده علامت بخورد؟ دیگر ثبتِ اجرا ممکن نیست و از روتین برداشته می‌شود."
          confirmLabel="اتمامِ برنامه"
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
        <button type="button" className="trade-icon-btn" onClick={onPrev} aria-label="هفته‌ی قبل"><ChevronRight size={17} /></button>
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
        <button type="button" className="trade-icon-btn" onClick={onNext} aria-label="هفته‌ی بعد"><ChevronLeft size={17} /></button>
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, minHeight: 22, marginBottom: 4 }}>
        {loading && <Loader2 size={14} className="trade-spin" style={{ color: "var(--muted)" }} />}
        {!isThisWeek && <button type="button" className="trade-ghost-btn" onClick={onToday}>برو به امروز</button>}
      </div>
    </>
  );
}

// ───────────────────────── آیتم‌ها ─────────────────────────

function ItemMeta({ item, isWorkout, showDays }: { item: Item; isWorkout: boolean; showDays?: boolean }) {
  return (
    <div className="mentor-item-meta">
      {showDays && <span><Repeat size={11} /> {daysLabel(item)}</span>}
      {item.startTime && <span><Clock size={11} /> <span className="mono" dir="ltr">{faNum(item.startTime)}</span></span>}
      {item.durationMin != null && <span><Timer size={11} /> {faNum(item.durationMin)} دقیقه</span>}
      {isWorkout && item.sets != null && <span><Dumbbell size={11} /> {faNum(item.sets)} ست{item.reps ? ` × ${faNum(item.reps)}` : ""}</span>}
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

  async function save() {
    if (!status) { setError("اول وضعیت را انتخاب کن"); return; }
    let sets: number | undefined;
    if (isWorkout && setsDone.trim()) {
      sets = Number(setsDone);
      if (!Number.isInteger(sets) || sets < 0 || (item.sets != null && sets > item.sets * 3) || sets > 100) { setError("تعدادِ ست معتبر نیست"); return; }
    }
    if (note.trim().length > NOTE_MAX) { setError(`یادداشت حداکثر ${faNum(NOTE_MAX)} کاراکتر است`); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mentor-programs/${programId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, date: day, status, setsDone: sets, note: note.trim() || undefined }),
      });
      if (!res.ok) { setError(await readApiError(res, "ثبت نشد")); return; }
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
          <div className="mentor-log-status day-picker" role="radiogroup" aria-label="وضعیتِ اجرا">
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
                placeholder={item.sets != null ? `ست‌ها (از ${faNum(item.sets)})` : "ستِ انجام‌شده"}
                aria-label="تعدادِ ستِ انجام‌شده"
              />
            )}
            <input
              className="wsearch-newform-name trade-glass-field"
              value={note}
              maxLength={NOTE_MAX + 20}
              onChange={(e) => { setNote(e.target.value); setSavedAt(null); }}
              placeholder="یادداشت برای منتور (اختیاری)"
              aria-label="یادداشت"
            />
          </div>
          <div className="mentor-log-foot">
            {error && <div className="trade-form-error">{error}</div>}
            {!error && savedAt && !dirty && <span className="mentor-log-saved"><Check size={13} /> ثبت شد</span>}
            <button type="button" className="trade-primary-btn" style={{ padding: "8px 16px" }} onClick={save} disabled={busy || !dirty || !status}>
              {busy ? <Loader2 size={14} className="trade-spin" /> : log ? "به‌روزرسانی" : "ثبت"}
            </button>
          </div>
        </>
      ) : (
        <>
          {future && <p className="mentor-muted" style={{ margin: "6px 0 0", fontSize: 11 }}>ثبتِ اجرا برای روزهای آینده ممکن نیست.</p>}
          {!future && !log && <p className="mentor-muted" style={{ margin: "6px 0 0", fontSize: 11 }}>ثبت نشده.</p>}
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
      {log?.note && <p className="mentor-log-note">یادداشتِ شاگرد: {log.note}</p>}
      {canFeedback && (
        <button
          type="button"
          className="trade-ghost-btn"
          style={{ marginTop: 6, paddingInline: 0 }}
          onClick={() => onFeedback(log ? { itemId: item.id, logId: log.id, label: `اجرای «${item.title}»` } : { itemId: item.id, label: `«${item.title}»` })}
        >
          <MessageSquareText size={12} /> بازخورد {log ? "به این اجرا" : "به این آیتم"}
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
    if (!b) { setError("متنِ بازخورد خالی است"); return; }
    if (b.length > FEEDBACK_MAX) { setError(`حداکثر ${faNum(FEEDBACK_MAX)} کاراکتر`); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mentor-programs/${programId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: b, itemId: target?.itemId, logId: target?.logId }),
      });
      if (!res.ok) { setError(await readApiError(res, "ارسال نشد")); return; }
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
    <AccountBlock title="بازخوردها" icon={<MessageSquareText size={15} />}>
      {sorted.length === 0 ? (
        <p className="mentor-muted" style={{ margin: 0 }}>هنوز بازخوردی ثبت نشده.</p>
      ) : (
        sorted.map((f) => (
          <div key={f.id} className="mentor-feedback">
            <div className="mentor-feedback-head">
              <span>{fmtDateTime(f.createdAt)}</span>
              {f.itemTitle && <span className="mentor-feedback-ref">{f.logId ? "اجرای " : ""}«{f.itemTitle}»</span>}
              {!f.itemTitle && <span>کلِ برنامه</span>}
              {role === "STUDENT" && !f.readAt && <span className="mentor-feedback-new">تازه</span>}
              {role === "MENTOR" && <span>{f.readAt ? "دیده شد" : "هنوز دیده نشده"}</span>}
            </div>
            <p className="mentor-feedback-body">{f.body}</p>
          </div>
        ))
      )}

      {canWrite && (
        <div style={{ marginTop: 12 }}>
          <div className="exercise-form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>بازخورد به: {target ? target.label : "کلِ برنامه"}</span>
            {target && <button type="button" className="trade-ghost-btn" style={{ padding: "2px 6px" }} onClick={onClearTarget}>کلِ برنامه</button>}
          </div>
          <form className="routine-ai-composer" style={{ borderTop: "none", paddingTop: 0 }} onSubmit={(e) => { e.preventDefault(); send(); }}>
            <textarea
              ref={inputRef}
              className="routine-ai-input"
              rows={1}
              value={body}
              maxLength={FEEDBACK_MAX + 50}
              onChange={(e) => { setBody(e.target.value); setError(null); }}
              placeholder="بازخوردت را بنویس…"
              aria-label="متنِ بازخورد"
            />
            <button type="submit" className={`routine-ai-action${body.trim() ? " has-text" : ""}`} disabled={busy || !body.trim()} aria-label="ارسالِ بازخورد">
              <span className="routine-ai-action-icon" aria-hidden="true">{busy ? <Loader2 size={16} className="trade-spin" /> : <Send size={16} />}</span>
            </button>
          </form>
          {error && <div className="trade-form-error">{error}</div>}
        </div>
      )}
    </AccountBlock>
  );
}
