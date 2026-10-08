"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { TimeInput } from "@/components/TimeInput";
import { WEEK_ORDER } from "@/lib/schedule";
import {
  DAY_PRESETS,
  durationText,
  matchDayPreset,
  newTimeRow,
  rowDurationMin,
  type ProgramKind,
  type TimeRow,
} from "@/lib/programForm";
import "./program-time-rows.css";

// کارت‌های ردیف ساعت فرم «افزودن برنامه».
export type RowError = { days?: boolean; start?: boolean; end?: boolean; order?: boolean };

export type ProgramTimeRowsProps = {
  kind: ProgramKind;
  rows: TimeRow[];
  onChange: (rows: TimeRow[]) => void;
  /** خطاهای اعتبارسنجی به ازای id ردیف */
  errors: Record<string, RowError>;
  /** اسم برنامه‌ای که با این ردیف تداخل داره (به ازای id ردیف)، یا null */
  conflicts: Record<string, string | null>;
  /** کاربر روی یک ردیف دست برد → خطای همون ردیف پاک بشه */
  onClearError: (rowId: string) => void;
};

export function ProgramTimeRows({ kind, rows, onChange, errors, conflicts, onClearError }: ProgramTimeRowsProps) {
  const reduce = useReducedMotion();
  const once = kind === "once";
  const visible = once ? rows.slice(0, 1) : rows;
  const canRemove = !once && rows.length > 1;

  const patch = (id: string, p: Partial<TimeRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...p } : r)));
    onClearError(id);
  };

  const toggleDay = (row: TimeRow, d: number) => {
    const has = row.jsDays.includes(d);
    if (has && row.jsDays.length <= 1) return;
    patch(row.id, { jsDays: has ? row.jsDays.filter((x) => x !== d) : [...row.jsDays, d] });
  };

  const motionProps = reduce
    ? { initial: false as const, exit: { opacity: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: "auto" },
        exit: { opacity: 0, height: 0 },
        transition: { duration: 0.22, ease: "easeOut" as const },
      };

  return (
    <div className="ptr-list">
      <AnimatePresence initial={false}>
        {visible.map((row) => {
          const err = errors[row.id] || {};
          const conflict = conflicts[row.id];
          const dur = rowDurationMin(row);
          const bothFilled = row.start.length === 5 && row.end.length === 5;
          const orderBad = !!err.order || (bothFilled && dur === null);
          const active = matchDayPreset(row.jsDays);
          const msg = err.days
            ? "حداقل یک روز رو انتخاب کن"
            : err.start || err.end
            ? "ساعت شروع و پایان رو کامل وارد کن"
            : "";
          return (
            <motion.div key={row.id} className="ptr-item" {...motionProps}>
              <div className={"ptr-card" + (canRemove ? " has-remove" : "")}>
                {canRemove && (
                  <div className="ptr-head">
                    <button
                      type="button"
                      className="ptr-remove"
                      aria-label="حذف این ساعت"
                      onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                )}

                {!once && (
                  <>
                    <div className={"ptr-pills" + (err.days ? " is-err" : "")}>
                      {WEEK_ORDER.map((d) => {
                        const on = row.jsDays.includes(d.jsDay);
                        return (
                          <button
                            key={d.jsDay}
                            type="button"
                            className={"ptr-pill" + (on ? " is-on" : "")}
                            aria-pressed={on}
                            aria-label={d.name}
                            onClick={() => toggleDay(row, d.jsDay)}
                          >
                            {d.short}
                          </button>
                        );
                      })}
                    </div>
                    {DAY_PRESETS.length > 0 && (
                      <div className="ptr-presets">
                        {DAY_PRESETS.map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            className={"ptr-chip" + (active === p.key ? " is-on" : "")}
                            aria-pressed={active === p.key}
                            onClick={() => patch(row.id, { jsDays: [...p.jsDays] })}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <div className="ptr-times">
                  <div className={"time-field" + (err.start ? " is-err" : "")}>
                    <span className="time-field-label">شروع</span>
                    <TimeInput value={row.start} onChange={(v) => patch(row.id, { start: v })} />
                  </div>
                  <div className={"time-field" + (err.end || orderBad ? " is-err" : "")}>
                    <span className="time-field-label">پایان</span>
                    <TimeInput value={row.end} onChange={(v) => patch(row.id, { end: v })} />
                  </div>
                </div>

                {orderBad ? (
                  <p className="ptr-dur is-err">پایان باید بعد از شروع باشه</p>
                ) : dur !== null ? (
                  <p className="ptr-dur">{durationText(dur)}</p>
                ) : null}

                {msg && <p className="ptr-msg">{msg}</p>}

                {conflict ? (
                  <p className="ptr-warn">
                    <AlertTriangle size={14} />
                    <span>{"با «" + conflict + "» هم‌زمانه"}</span>
                  </p>
                ) : null}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {!once && (
        <button type="button" className="ptr-add" onClick={() => onChange([...rows, newTimeRow()])}>
          <Plus size={15} />
          <span>ساعت دیگه برای روزهای دیگه</span>
        </button>
      )}
    </div>
  );
}
