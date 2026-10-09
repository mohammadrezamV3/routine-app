"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, CircleSlash, MessageSquareText, XCircle } from "lucide-react";
import { MentorChip, MentorEmpty, MentorField, type MentorTone } from "@/components/MentorUI";
import { Spinner } from "@/components/Spinner";
import type { Item, ProgressCell, ProgressState, ProgressView } from "@/lib/mentorTypes";
import { summarizeDay } from "@/lib/mentorProgressCore";
import { fmtWeekday, networkError, readApiError } from "@/lib/mentorFormat";
import { weekdayShort, jMonthName, faNum, toJalali } from "@/lib/jalali";
import { tr } from "@/lib/i18n";

// نمای هفتگی «پیشرفت خودکار» — فقط‌خواندنی. وضعیت هر آیتم از تیک‌های خود
// شاگرد در «روتین من» می‌آید (lib/mentorProgress.ts)؛ شاگرد فقط می‌تواند برای
// هر روز یک یادداشت اختیاری برای منتور بنویسد، نه وضعیت.

const NOTE_MAX = 500;
const CHIP = { size: 13, strokeWidth: 1.75, "aria-hidden": true } as const;
const CELL = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN_SM = { size: 14, strokeWidth: 1.75, "aria-hidden": true } as const;

export const stateMeta = (): Record<ProgressState, { label: string; tone: MentorTone; Icon: typeof Circle }> => ({
  done: { label: tr("انجام شد", "Done"), tone: "ok", Icon: CheckCircle2 },
  partial: { label: tr("نیمه‌کاره", "Partly done"), tone: "warn", Icon: AlertCircle },
  missed: { label: tr("انجام نشد", "Not done"), tone: "danger", Icon: XCircle },
  upcoming: { label: tr("پیش رو", "Upcoming"), tone: "neutral", Icon: Circle },
  untracked: { label: tr("بدون ثبت", "Not logged"), tone: "neutral", Icon: CircleSlash },
});

function parseDay(iso: string): Date {
  return new Date(iso + "T00:00:00");
}
function jParts(iso: string): [number, number, number] {
  const d = parseDay(iso);
  return toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
function weekLabel(from: string, to: string): string {
  const a = jParts(from);
  const b = jParts(to);
  return a[1] === b[1]
    ? tr(`${faNum(a[2])} تا ${faNum(b[2])} ${jMonthName(b[1] - 1)}`, `${faNum(a[2])} to ${faNum(b[2])} ${jMonthName(b[1] - 1)}`)
    : tr(`${faNum(a[2])} ${jMonthName(a[1] - 1)} تا ${faNum(b[2])} ${jMonthName(b[1] - 1)}`, `${faNum(a[2])} ${jMonthName(a[1] - 1)} to ${faNum(b[2])} ${jMonthName(b[1] - 1)}`);
}

export function MentorProgressWeek({
  programId, view, items, isWorkout, isStudent, noteEditable, weekStart, weekEnd, today, loading, selected,
  onSelect, onPrev, onNext, onToday, onNoteSaved, canFeedback, onFeedback,
}: {
  programId: string;
  view: ProgressView;
  items: Item[];
  isWorkout: boolean;
  isStudent: boolean;
  /** برنامه در حال اجراست و شاگرد می‌تواند یادداشت بگذارد */
  noteEditable: boolean;
  weekStart: string;
  weekEnd: string;
  today: string;
  loading: boolean;
  selected: string;
  onSelect: (d: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNoteSaved: (date: string, body: string | null) => void;
  canFeedback: boolean;
  onFeedback: (t: { itemId?: string; logId?: string; label: string }) => void;
}) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const days = view.days;
  const isThisWeek = today >= weekStart && today <= weekEnd;
  // آیتم‌هایی که در این هفته حداقل یک روز برنامه دارند
  const weekItems = items.filter((it) => days.some((d) => d.cells.some((c) => c.itemId === it.id)));
  const cellOf = (date: string, itemId: string): ProgressCell | undefined => days.find((d) => d.date === date)?.cells.find((c) => c.itemId === itemId);
  const selDay = days.find((d) => d.date === selected) ?? null;
  const inRange = (d: string) => d >= view.from && (!view.to || d <= view.to);

  return (
    <>
      <div className="mentor-pg-nav">
        <button type="button" className="trade-icon-btn" onClick={onPrev} aria-label={tr("هفته‌ی قبل", "Previous week")}>
          <ChevronRight size={16} strokeWidth={1.75} className="dir-flip" aria-hidden />
        </button>
        <span className="mentor-pg-range">
          {weekLabel(weekStart, weekEnd)}
          {loading && <Spinner size={14} />}
        </span>
        <button type="button" className="trade-icon-btn" onClick={onNext} aria-label={tr("هفته‌ی بعد", "Next week")}>
          <ChevronLeft size={16} strokeWidth={1.75} className="dir-flip" aria-hidden />
        </button>
      </div>
      {!isThisWeek && (
        <div className="mentor-pg-today">
          <button type="button" className="mentor-text-btn" onClick={onToday}>{tr("رفتن به هفته‌ی جاری", "Go to this week")}</button>
        </div>
      )}

      {view.hidden ? (
        <MentorEmpty>{tr("این بخش رو شاگرد خصوصی نگه داشته", "The student keeps this section private")}</MentorEmpty>
      ) : weekItems.length === 0 ? (
        <MentorEmpty>{tr("این هفته کاری تو برنامه نیست", "No tasks in the program this week")}</MentorEmpty>
      ) : (
        <div className="mentor-pg-scroll">
          <table className="mentor-pg">
            <thead>
              <tr>
                <th scope="col" className="mentor-pg-item">{tr("کار", "Task")}</th>
                {days.map((d) => {
                  const summary = summarizeDay(d.cells.map((c) => c.state));
                  return (
                    <th key={d.date} scope="col">
                      <button
                        type="button"
                        className={`mentor-text-btn mentor-pg-day${d.date === selected ? " is-on" : ""}${d.date === today ? " is-today" : ""}`}
                        onClick={() => onSelect(d.date)}
                        aria-pressed={d.date === selected}
                        aria-label={`${fmtWeekday(d.date)}${summary ? `${tr("، ", ", ")}${stateMeta()[summary].label}` : ""}`}
                      >
                        <span>{weekdayShort(parseDay(d.date).getDay())}</span>
                        <small>{faNum(jParts(d.date)[2])}</small>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {weekItems.map((it) => (
                <tr key={it.id}>
                  <th scope="row" className="mentor-pg-item" title={it.title}>{it.title}</th>
                  {days.map((d) => {
                    const c = cellOf(d.date, it.id);
                    if (!c) return <td key={d.date} className={d.date === selected ? "is-on" : undefined} aria-label={tr("بدون برنامه", "No plan")}><span className="mentor-pg-none" aria-hidden>·</span></td>;
                    const m = stateMeta()[c.state];
                    return (
                      <td key={d.date} className={`is-${c.state}${d.date === selected ? " is-on" : ""}`} title={m.label} aria-label={`${it.title}${tr("، ", ", ")}${fmtWeekday(d.date)}: ${m.label}`}>
                        <m.Icon {...CELL} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="mv2-pg-legend" aria-label={tr("راهنمای نشانه‌ها", "Legend")}>
            {(["done", "partial", "missed", "upcoming"] as ProgressState[]).map((k) => {
              const m = stateMeta()[k];
              return <li key={k} className={`mv2-pg-legend-item is-${k}`}><m.Icon {...CHIP} /> {m.label}</li>;
            })}
          </ul>
        </div>
      )}

      {view.hidden && days.some((d) => d.note) && (
        days.filter((d) => d.note).map((d) => (
          <div key={d.date} className="mentor-note-box"><b>{tr("یادداشت شاگرد", "Student note")}{tr("، ", ", ")}{fmtWeekday(d.date)}</b><div>{d.note}</div></div>
        ))
      )}

      {!view.hidden && <div className="mentor-week-label">{fmtWeekday(selected)}{selected === today ? tr("، امروز", ", today") : ""}</div>}

      {!view.hidden && (
        !inRange(selected) ? (
          <MentorEmpty>{tr("این روز خارج از بازه‌ی برنامه است", "This day is outside the program's range")}</MentorEmpty>
        ) : !selDay || selDay.cells.length === 0 ? (
          <MentorEmpty>{tr("برای این روز کاری نیست", "No tasks for this day")}</MentorEmpty>
        ) : (
          selDay.cells.map((c) => {
            const it = byId.get(c.itemId);
            if (!it) return null;
            const m = stateMeta()[c.state];
            return (
              <div key={c.itemId} className="mentor-item">
                <div className="mentor-item-head">
                  <div className="mentor-item-title">{it.title}</div>
                  <MentorChip tone={m.tone} icon={<m.Icon {...CHIP} />}>{m.label}</MentorChip>
                </div>
                {c.doneOn && <p className="mentor-log-note">{tr(`در روز ${fmtWeekday(c.doneOn)} تیک خورد`, `Ticked on ${fmtWeekday(c.doneOn)}`)}</p>}
                {isWorkout && c.setsDone != null && (
                  <p className="mentor-log-note">{tr(`${faNum(c.setsDone)}${it.sets != null ? ` از ${faNum(it.sets)}` : ""} ست انجام شد`, `${faNum(c.setsDone)}${it.sets != null ? ` of ${faNum(it.sets)}` : ""} ${c.setsDone === 1 && it.sets == null ? "set" : "sets"} done`)}</p>
                )}
                {c.note && <p className="mentor-log-note">{isStudent ? tr("یادداشت تو", "Your note") : tr("یادداشت شاگرد", "Student note")}: {c.note}</p>}
                {canFeedback && !isStudent && (
                  <button
                    type="button"
                    className="mentor-text-btn"
                    style={{ marginTop: 4 }}
                    onClick={() => onFeedback(c.logId ? { itemId: it.id, logId: c.logId, label: tr(`اجرای «${it.title}»`, `Session of "${it.title}"`) } : { itemId: it.id, label: `«${it.title}»` })}
                  >
                    <MessageSquareText {...BTN_SM} /> {c.logId ? tr("بازخورد به این اجرا", "Give feedback on this session") : tr("بازخورد به این کار", "Give feedback on this task")}
                  </button>
                )}
              </div>
            );
          })
        )
      )}

      {isStudent ? (
        noteEditable && inRange(selected) && selected <= today ? (
          <DayNoteEditor key={selected} programId={programId} date={selected} initial={selDay?.note ?? null} onSaved={onNoteSaved} />
        ) : selDay?.note ? (
          <div className="mentor-note-box"><b>{tr("یادداشت تو برای مربی", "Your note for your mentor")}</b><div>{selDay.note}</div></div>
        ) : null
      ) : !view.hidden && selDay?.note ? (
        <div className="mentor-note-box"><b>{tr("یادداشت شاگرد", "Student note")}</b><div>{selDay.note}</div></div>
      ) : null}
    </>
  );
}

function DayNoteEditor({
  programId, date, initial, onSaved,
}: {
  programId: string;
  date: string;
  initial: string | null;
  onSaved: (date: string, body: string | null) => void;
}) {
  const [body, setBody] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => { setBody(initial ?? ""); setSaved(initial ?? ""); }, [initial]);
  const dirty = body.trim() !== saved.trim();
  const id = `mentor-day-note-${date}`;

  async function save() {
    const b = body.trim();
    if (b.length > NOTE_MAX) { setError(tr(`یادداشت حداکثر ${faNum(NOTE_MAX)} حرف باشه`, `A note can be at most ${faNum(NOTE_MAX)} characters`)); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mentor-programs/${programId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, note: b }),
      });
      if (!res.ok) { setError(await readApiError(res, tr("یادداشت ذخیره نشد؛ دوباره امتحان کن", "The note was not saved. Try again."))); return; }
      const d: { note: { body: string } | null } = await res.json();
      const next = d.note?.body ?? "";
      setSaved(next);
      setBody(next);
      setJustSaved(true);
      onSaved(date, d.note?.body ?? null);
    } catch {
      setError(networkError());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <MentorField label={tr("یادداشت برای مربی", "Note for your mentor")} htmlFor={id} optional error={error}>
        <textarea
          id={id}
          className="wsearch-newform-name trade-glass-field"
          rows={2}
          value={body}
          maxLength={NOTE_MAX + 20}
          onChange={(e) => { setBody(e.target.value); setJustSaved(false); setError(null); }}
          placeholder={tr("مثلا «پنجشنبه امتحان داشتم و آزمون را جمعه زدم»", `For example: "I had an exam on Thursday so I did the test on Friday"`)}
        />
      </MentorField>
      <div className="mentor-btn-group is-end" style={{ marginTop: 8 }}>
        <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={save} disabled={busy || !dirty}>
          {busy ? <Spinner size={14} /> : justSaved && !dirty ? <><Check {...BTN_SM} /> {tr("ذخیره شد", "Saved")}</> : tr("ذخیره‌ی یادداشت", "Save note")}
        </button>
      </div>
    </div>
  );
}
