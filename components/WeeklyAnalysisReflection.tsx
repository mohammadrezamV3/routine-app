"use client";

import "./wa-cards.css";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, NotebookPen } from "lucide-react";
import type { ReflectionDto } from "@/lib/weeklyAnalysis/types";
import { SegmentedTabs } from "./SegmentedTabs";
import { Spinner } from "./Spinner";
import { SectionHead, V_WK_CARD, WK_EASE, useCalmMotion, waFetch } from "./WeeklyAnalysisKit";

const FACES = ["", "😞", "😕", "😐", "🙂", "😄"];
const MOOD_NAMES = ["", "خیلی بد", "بد", "معمولی", "خوب", "عالی"];

const DEBOUNCE_MS = 900;
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type Draft = { wentWell: string; improve: string; mood: number | null };

// بازتاب هفته — ذخیره‌ی خودکار با تاخیر (بدون دکمه‌ی ذخیره). کامپوننت با
// key=weekStart رندر می‌شه، پس با عوض‌شدن هفته استیتش از نو ساخته می‌شه.
export function WeeklyAnalysisReflection({
  offset, reflection, onSaved,
}: { offset: number; reflection: ReflectionDto; onSaved: (r: ReflectionDto) => void }) {
  const [draft, setDraft] = useState<Draft>({
    wentWell: reflection?.wentWell ?? "",
    improve: reflection?.improve ?? "",
    mood: reflection?.mood ?? null,
  });
  const [state, setState] = useState<SaveState>("idle");
  const calm = useCalmMotion();
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

  // اگه کاربر قبل از تموم‌شدن تاخیر از صفحه/هفته رفت، آخرین نسخه گم نشه
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
    <motion.section id="reflection" className="wk-card wc-journal" variants={V_WK_CARD} aria-label="مرور هفته">
      <SectionHead
        icon={<NotebookPen size={15} />}
        title="مرور هفته"
        aside={
          <span className={`wk-save-state ${state}`} aria-live="polite">
            {state === "saving" ? <Spinner size={12} label={null} /> : state === "saved" ? <><Check size={12} />ذخیره شد</> : state === "error" ? "ذخیره نشد" : null}
          </span>
        }
      />

      <div className="wc-journal-grid">
        <label className="wc-field">
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
        <label className="wc-field">
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

      <div className="wc-field" style={{ marginTop: 14 }}>
        <span className="exercise-form-label">
          حال کلی این هفته{draft.mood ? <span className="wk-muted-sm"> · {MOOD_NAMES[draft.mood]}</span> : null}
        </span>
        <div className="wc-mood">
          <span className="wc-mood-big" aria-hidden="true">
            <AnimatePresence mode="wait" initial={false}>
              {draft.mood && (
                <motion.span
                  key={draft.mood}
                  initial={calm ? false : { opacity: 0, scale: 0.4, rotate: -12 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={calm ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.25, ease: WK_EASE }}
                >{FACES[draft.mood]}</motion.span>
              )}
            </AnimatePresence>
          </span>
          <SegmentedTabs
            className="wk-seg wk-mood-seg wc-mood-seg seg-flush"
            ariaLabel="حال کلی این هفته"
            active={draft.mood ? String(draft.mood) : null}
            onChange={(v) => update({ mood: Number(v) })}
            options={[1, 2, 3, 4, 5].map((n) => ({
              value: String(n),
              label: <span className={`wc-mood-face${draft.mood === n ? " on" : ""}`}>{FACES[n]}</span>,
            }))}
          />
        </div>
      </div>

      {error && <div className="wk-error-inline">{error}</div>}
    </motion.section>
  );
}
