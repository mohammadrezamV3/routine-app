"use client";

import { useEffect, useRef, useState } from "react";
import { Check, NotebookPen } from "lucide-react";
import type { ReflectionDto } from "@/lib/weeklyAnalysis/types";
import { cn } from "@/lib/utils";
import { DashCard } from "./DashCard";
import { Spinner } from "./Spinner";
import { waFetch } from "./WeeklyAnalysisShared";

const MOODS = [
  { v: 1, emoji: "😞", label: "خیلی بد" },
  { v: 2, emoji: "😕", label: "بد" },
  { v: 3, emoji: "😐", label: "معمولی" },
  { v: 4, emoji: "🙂", label: "خوب" },
  { v: 5, emoji: "😄", label: "عالی" },
];

const DEBOUNCE_MS = 900;
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type Draft = { wentWell: string; improve: string; mood: number | null };

// بازتابِ هفته — ذخیره‌ی خودکار با تأخیر (بدونِ دکمه‌ی ذخیره). کامپوننت با
// key=weekStart رندر می‌شه، پس با عوض‌شدنِ هفته استیتش از نو ساخته می‌شه.
export function WeeklyAnalysisReflection({
  offset,
  reflection,
  onSaved,
}: {
  offset: number;
  reflection: ReflectionDto;
  onSaved: (r: ReflectionDto) => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    wentWell: reflection?.wentWell ?? "",
    improve: reflection?.improve ?? "",
    mood: reflection?.mood ?? null,
  });
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Draft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  async function save(d: Draft) {
    const my = ++seq.current;
    pending.current = null;
    setState("saving");
    setError(null);
    try {
      const data = await waFetch<{ reflection: ReflectionDto }>("/api/analysis/weekly/reflection", {
        method: "PUT",
        body: JSON.stringify({ offset, ...d }),
      });
      if (my !== seq.current) return; // یه ذخیره‌ی تازه‌تر در راهه
      setState(pending.current ? "dirty" : "saved");
      onSavedRef.current(data.reflection);
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

  // اگه کاربر قبل از تموم‌شدنِ تأخیر از صفحه/هفته رفت، آخرین نسخه گم نشه
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      const d = pending.current;
      if (!d) return;
      try {
        void fetch("/api/analysis/weekly/reflection", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset, ...d }),
          keepalive: true,
        });
      } catch { /* بی‌صدا — بهترین تلاش */ }
    };
  }, [offset]);

  return (
    <DashCard className="wa-reflection-card">
      <div className="wa-card-head">
        <h2 className="wa-card-title"><NotebookPen size={16} className="wa-title-icon" />مرور هفته</h2>
        <span className={cn("wa-save-state", state)} aria-live="polite">
          {state === "saving" ? <Spinner size={12} /> : state === "saved" ? <><Check size={12} />ذخیره شد</> : state === "error" ? "ذخیره نشد" : null}
        </span>
      </div>

      <div className="wa-reflection-grid">
        <label className="wa-field">
          <span className="exercise-form-label">چی خوب پیش رفت؟</span>
          <textarea
            className="wsearch-newform-name"
            rows={3}
            maxLength={1000}
            value={draft.wentWell}
            onChange={(e) => update({ wentWell: e.target.value })}
            placeholder="یه چیز کوچیک هم حسابه…"
          />
        </label>
        <label className="wa-field">
          <span className="exercise-form-label">چی رو بهتر کنم؟</span>
          <textarea
            className="wsearch-newform-name"
            rows={3}
            maxLength={1000}
            value={draft.improve}
            onChange={(e) => update({ improve: e.target.value })}
            placeholder="هفته‌ی بعد روی چی تمرکز کنی؟"
          />
        </label>
      </div>

      <div className="exercise-form-label">حال کلی این هفته</div>
      <div className="wa-mood-row" role="radiogroup" aria-label="حال کلی این هفته">
        {MOODS.map((m) => (
          <button
            key={m.v}
            type="button"
            role="radio"
            aria-checked={draft.mood === m.v}
            aria-label={m.label}
            title={m.label}
            className={cn("wa-ghost wa-mood", draft.mood === m.v && "active", draft.mood !== null && draft.mood !== m.v && "dim")}
            onClick={() => update({ mood: draft.mood === m.v ? null : m.v })}
          >
            <span aria-hidden="true">{m.emoji}</span>
          </button>
        ))}
      </div>

      {error && <div className="wa-error-inline">{error}</div>}
    </DashCard>
  );
}
