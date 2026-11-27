"use client";

// انتخاب هفته: قرص جمع‌وجور با قبلی/بعدی، برچسب بازه‌ی جلالی که فهرست 52 هفته‌ی اخیر رو باز می‌کنه،
// و چیپ «این هفته» که فقط خارج از هفته‌ی جاری دیده می‌شه.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { tr } from "@/lib/i18n";
import { jMonthName, toJalali } from "@/lib/jalali";
import type { LetterCtx } from "./WeeklyLetterCtx";
import "./weekly-letter.css";
import "./weekly-letter-live.css";

const MAX_BACK = 52; // سقف API

function shiftWeek(iso: string, weeks: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + weeks * 7));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

/** برچسب بازه‌ی هفته (شنبه تا جمعه) به تاریخ جلالی با رقم انگلیسی */
function rangeLabel(startIso: string): string {
  const [y, m, d] = startIso.split("-").map(Number);
  const a = toJalali(y, m, d);
  const e = new Date(Date.UTC(y, m - 1, d + 6));
  const b = toJalali(e.getUTCFullYear(), e.getUTCMonth() + 1, e.getUTCDate());
  const from = a[1] === b[1] ? `${a[2]}` : `${a[2]} ${jMonthName(a[1] - 1)}`;
  return `${from} - ${b[2]} ${jMonthName(b[1] - 1)}`;
}

export function WeeklyLetterWeekPicker({ ctx, onPick }: { ctx: LetterCtx; onPick: (weekStart: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  // شنبه‌ی هفته‌ی جاری از روی افست (همون منطق زمانی سرور)
  const currentStart = shiftWeek(ctx.weekStart, -ctx.offset);
  const canPrev = ctx.offset > -MAX_BACK;
  const canNext = ctx.offset < 0;

  const weeks = useMemo(
    () => Array.from({ length: MAX_BACK + 1 }, (_, i) => {
      const start = shiftWeek(currentStart, -i);
      return { start, label: rangeLabel(start), i };
    }),
    [currentStart],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    wrap.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (s: string) => { setOpen(false); if (s !== ctx.weekStart) onPick(s); };

  return (
    <div className="wl-wk" ref={wrap} role="group" aria-label={tr("انتخاب هفته", "Choose week")}>
      <div className="wl-wk-pill">
        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => canPrev && pick(shiftWeek(ctx.weekStart, -1))} disabled={!canPrev} aria-label={tr("هفته‌ی قبل", "Previous week")}>
          <ChevronRight size={18} className="dir-flip" />
        </button>
        <button type="button" className="btn btn-ghost wl-wk-label" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open} aria-live="polite">
          <span>{rangeLabel(ctx.weekStart)}</span>
          <ChevronDown size={14} className="wl-wk-caret" />
        </button>
        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => canNext && pick(shiftWeek(ctx.weekStart, 1))} disabled={!canNext} aria-label={tr("هفته‌ی بعد", "Next week")}>
          <ChevronLeft size={18} className="dir-flip" />
        </button>
      </div>
      {!ctx.isCurrent && (
        <button type="button" className="btn btn-tonal btn-sm wl-wk-now" onClick={() => pick(currentStart)}>
          {tr("این هفته", "This week")}
        </button>
      )}
      {open && (
        <ul className="wl-wk-list" role="listbox" aria-label={tr("فهرست هفته‌ها", "Weeks")}>
          {weeks.map((w) => (
            <li key={w.start} role="presentation">
              <button type="button" role="option" aria-selected={w.start === ctx.weekStart} className="wl-wk-opt" onClick={() => pick(w.start)}>
                <span>{w.label}</span>
                {w.i === 0 && <em>{tr("این هفته", "This week")}</em>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
