"use client";

// فصل «یادداشت خودت»: بازتاب قابل‌ویرایش هر هفته؛ ذخیره با دکمه‌ی «ثبت» (خروج از صفحه با تغییر ذخیره‌نشده هم آخرین نسخه رو می‌فرسته).
import { useEffect, useRef, useState } from "react";
import { Check, PenLine } from "lucide-react";
import type { ReflectionDto } from "@/lib/weeklyAnalysis/types";
import { tr } from "@/lib/i18n";
import { Spinner } from "./Spinner";
import { Reveal } from "./WeeklyLetterShared";
import { WeeklyMoodStar } from "./WeeklyMoodStars";
import { LiveChapter, type LetterChapterExtra } from "./WeeklyLetterLiveKit";
import type { LetterChapterProps } from "./WeeklyLetterCtx";
import { waFetch } from "./WeeklyAnalysisKit";
import "./wl-medals.css";

const moodNames = () => ["", tr("خیلی بد", "Very bad"), tr("بد", "Bad"), tr("معمولی", "Okay"), tr("خوب", "Good"), tr("عالی", "Great")];

type Draft = { wentWell: string; improve: string; mood: number | null };
type Save = "idle" | "dirty" | "saving" | "saved" | "error";

// با key=weekStart رندر می‌شه تا با عوض‌شدن هفته از نو ساخته بشه
function ReflectionEditor({ ctx, no }: { ctx: LetterChapterProps["ctx"]; no?: number }) {
  const r = ctx.analysis.reflection;
  const [draft, setDraft] = useState<Draft>({ wentWell: r?.wentWell ?? "", improve: r?.improve ?? "", mood: r?.mood ?? null });
  const [hover, setHover] = useState<number | null>(null);
  const [state, setState] = useState<Save>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Draft | null>(null);
  const seq = useRef(0);
  const savedOnce = useRef(false);
  const reloadRef = useRef(ctx.reload);
  reloadRef.current = ctx.reload;
  const offset = ctx.offset;

  async function save(d: Draft) {
    const my = ++seq.current;
    pending.current = null;
    setState("saving");
    setError(null);
    try {
      await waFetch<{ reflection: ReflectionDto }>("/api/analysis/weekly/reflection", {
        method: "PUT",
        body: JSON.stringify({ offset, ...d }),
      });
      savedOnce.current = true;
      if (my !== seq.current) return;
      setState(pending.current ? "dirty" : "saved");
      if (!pending.current) reloadRef.current();
    } catch (e) {
      if (my !== seq.current) return;
      setState("error");
      setError((e as Error).message);
    }
  }

  function update(patch: Partial<Draft>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    pending.current = next;
    setState("dirty");
  }

  // خروج از صفحه/هفته با تغییر ذخیره‌نشده: آخرین نسخه گم نشه
  useEffect(() => {
    return () => {
      const d = pending.current;
      if (d) {
        try {
          void fetch("/api/analysis/weekly/reflection", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ offset, ...d }),
            keepalive: true,
          });
          savedOnce.current = true;
        } catch { /* بهترین تلاش */ }
      }
      // کش خواننده کهنه نمونه (بعد از ذخیره، با تاخیر کوتاه تا keepalive برسه)
      if (savedOnce.current) setTimeout(() => reloadRef.current(), 400);
    };
  }, [offset]);

  // رادیوگروپ: فلش‌ها بین پنج حالت جابه‌جا می‌شن (در rtl جهت فلش‌ها برعکسه)
  function onMoodKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const dir = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
    if (!dir) return;
    e.preventDefault();
    const rtl = document.documentElement.dir === "rtl";
    const step = e.key === "ArrowUp" || e.key === "ArrowDown" ? dir : rtl ? -dir : dir;
    const n = Math.min(5, Math.max(1, (draft.mood ?? (step > 0 ? 0 : 6)) + step));
    update({ mood: n });
    requestAnimationFrame(() => (e.currentTarget.querySelector(`[data-mood="${n}"]`) as HTMLElement | null)?.focus());
  }

  return (
    <LiveChapter id="reflection" no={no} title={tr("یادداشت خودت", "Your notes")} icon={PenLine}>
      <Reveal className="wl-card wlr-card">
        <div className="wlr-block">
          <span className="wl-live-sub" id={`mood-${ctx.weekStart}`}>{tr("حال این هفته", "How this week felt")}</span>
          <div className="wlr-moods" role="radiogroup" aria-labelledby={`mood-${ctx.weekStart}`} data-noswipe onKeyDown={onMoodKey}>
            {([1, 2, 3, 4, 5] as const).map((n) => {
              const on = draft.mood === n;
              const tab = on || (draft.mood === null && n === 1);
              const shown = hover ?? draft.mood ?? 0;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={moodNames()[n]}
                  title={moodNames()[n]}
                  tabIndex={tab ? 0 : -1}
                  data-mood={n}
                  className={`wlr-mood${n <= shown ? " is-fill" : ""}`}
                  onClick={() => update({ mood: on ? null : n })}
                  onPointerEnter={(e) => { if (e.pointerType === "mouse") setHover(n); }}
                  onPointerLeave={() => setHover(null)}
                  onFocus={(e) => { if (e.currentTarget.matches(":focus-visible")) setHover(n); }}
                  onBlur={() => setHover(null)}
                >
                  <WeeklyMoodStar filled={n <= shown} size={34} />
                </button>
              );
            })}
          </div>
          <span className={`wlr-mood-name${draft.mood ? " is-set" : ""}`} aria-live="polite">{(hover ?? draft.mood) ? moodNames()[(hover ?? draft.mood) as number] : ""}</span>
        </div>
        <div className="wlr-fields">
          <label className="wlr-field">
            <span className="wl-live-sub">{tr("چی خوب پیش رفت؟", "What went well?")}</span>
            <textarea
              className="wsearch-newform-name"
              rows={3}
              maxLength={1000}
              value={draft.wentWell}
              onChange={(e) => update({ wentWell: e.target.value })}
              placeholder={tr("یه چیز کوچیک هم حسابه…", "Even one small thing counts…")}
            />
          </label>
          <label className="wlr-field">
            <span className="wl-live-sub">{tr("چی رو بهتر کنم؟", "What should I improve?")}</span>
            <textarea
              className="wsearch-newform-name"
              rows={3}
              maxLength={1000}
              value={draft.improve}
              onChange={(e) => update({ improve: e.target.value })}
              placeholder={tr("هفته‌ی بعد روی چی تمرکز کنی؟", "What will you focus on next week?")}
            />
          </label>
        </div>
        {error && <div className="wl-live-error" role="alert">{error}</div>}
        <div className="wlr-foot">
          <span className={`wlr-state is-${state}`} aria-live="polite">
            {state === "saved" ? <><Check size={14} />{tr("ثبت شد", "Saved")}</> : state === "error" ? tr("ثبت نشد", "Not saved") : state === "dirty" ? tr("تغییر ثبت‌نشده", "Unsaved changes") : null}
          </span>
          <button
            type="button"
            className={`btn btn-primary${state === "saving" ? " is-loading" : ""}`}
            disabled={state === "saving" || state === "idle" || state === "saved"}
            aria-busy={state === "saving" || undefined}
            onClick={() => { if (pending.current) void save(pending.current); }}
          >
            {state === "saving" && <Spinner className="btn-spinner" size={16} label={null} />}
            {tr("ثبت", "Save")}
          </button>
        </div>
      </Reveal>
    </LiveChapter>
  );
}

export function WeeklyLetterReflection({ ctx, no }: LetterChapterProps & LetterChapterExtra) {
  return <ReflectionEditor key={ctx.weekStart} ctx={ctx} no={no} />;
}
