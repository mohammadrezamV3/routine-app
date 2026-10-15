"use client";

// فصل «یادداشت خودت»: بازتاب قابل‌ویرایش هر هفته با ذخیره‌ی خودکار.
import { useEffect, useRef, useState } from "react";
import { Check, PenLine } from "lucide-react";
import type { ReflectionDto } from "@/lib/weeklyAnalysis/types";
import { tr } from "@/lib/i18n";
import { Spinner } from "./Spinner";
import { Reveal } from "./WeeklyLetterShared";
import { LiveChapter, type LetterChapterExtra } from "./WeeklyLetterLiveKit";
import type { LetterChapterProps } from "./WeeklyLetterCtx";
import { waFetch } from "./WeeklyAnalysisKit";

const FACES = ["", "😞", "🙁", "😐", "🙂", "😄"];
const moodNames = () => ["", tr("خیلی بد", "Very bad"), tr("بد", "Bad"), tr("معمولی", "Okay"), tr("خوب", "Good"), tr("عالی", "Great")];
const DEBOUNCE_MS = 900;

type Draft = { wentWell: string; improve: string; mood: number | null };
type Save = "idle" | "dirty" | "saving" | "saved" | "error";

// با key=weekStart رندر می‌شه تا با عوض‌شدن هفته از نو ساخته بشه
function ReflectionEditor({ ctx, no }: { ctx: LetterChapterProps["ctx"]; no?: number }) {
  const r = ctx.analysis.reflection;
  const [draft, setDraft] = useState<Draft>({ wentWell: r?.wentWell ?? "", improve: r?.improve ?? "", mood: r?.mood ?? null });
  const [state, setState] = useState<Save>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Draft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (pending.current) void save(pending.current); }, DEBOUNCE_MS);
    setState("dirty");
  }

  // خروج از صفحه/هفته قبل از تموم‌شدن تاخیر: آخرین نسخه گم نشه
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
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

  return (
    <LiveChapter id="reflection" no={no} title={tr("یادداشت خودت", "Your notes")} icon={PenLine}>
      <Reveal className="wl-card wl-live-refl">
        <div className="wl-live-refl-top">
          <span className="wl-live-sub">{tr("حال این هفته", "How this week felt")}</span>
          <span className={`wl-live-save is-${state}`} aria-live="polite">
            {state === "saving" ? <Spinner size={12} label={null} /> : state === "saved" ? <><Check size={12} />{tr("ذخیره شد", "Saved")}</> : state === "error" ? tr("ذخیره نشد", "Not saved") : null}
          </span>
        </div>
        <div className="wl-live-moods" role="radiogroup" aria-label={tr("حال کلی این هفته", "Overall mood this week")} data-noswipe>
          {[1, 2, 3, 4, 5].map((n) => {
            const on = draft.mood === n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={moodNames()[n]}
                title={moodNames()[n]}
                className={`wl-live-mood${on ? " is-on" : ""}`}
                onClick={() => update({ mood: on ? null : n })}
              >
                <span aria-hidden="true">{FACES[n]}</span>
              </button>
            );
          })}
        </div>
        <label className="wl-live-field">
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
        <label className="wl-live-field">
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
        {error && <div className="wl-live-error" role="alert">{error}</div>}
      </Reveal>
    </LiveChapter>
  );
}

export function WeeklyLetterReflection({ ctx, no }: LetterChapterProps & LetterChapterExtra) {
  return <ReflectionEditor key={ctx.weekStart} ctx={ctx} no={no} />;
}
