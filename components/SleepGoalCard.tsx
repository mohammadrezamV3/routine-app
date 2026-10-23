"use client";

import "./sleep-log.css";
import { useEffect, useMemo, useState } from "react";
import { Target } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { SleepTimeField } from "./SleepTimeField";
import { Spinner } from "./Spinner";
import { setSleepGoal, type SleepGoal } from "@/lib/sleepGoal";
import { getSleepLatency } from "@/lib/sleepLatency";
import { DEFAULT_LATENCY, durationLabel, goalFromTargets } from "@/lib/sleep";
import {
  GOAL_PRESETS_MIN, bedForDuration, clockMin, goalSuggestions, hoursShort, spanMin,
} from "@/lib/sleepSheetHelpers";
import { tr } from "@/lib/i18n";

// هدف خواب سیستم جدای خواب: ساعت خواب و بیداری هدف، و مدت هدف که از همین دو
// ساخته می‌شه (goalFromTargets). امتیاز، بدهی خواب، هیرو و چرخه‌ها همه از همین.
// سه راه برای تنظیم: مدت آماده (ساعت خواب از ساعت بیداری ساخته می‌شه)، ساعت‌ها
// به‌صورت دستی، یا پیشنهاد چرخه‌ای (پایان خواب روی مرز چرخه).
export function SleepGoalCard({
  goal,
  custom,
  goalMin,
  onSaved,
  bare = false,
}: {
  goal: SleepGoal;
  /** false یعنی هنوز از ساعت‌های روتین میاد */
  custom: boolean;
  goalMin: number;
  onSaved: () => void;
  /** داخل پنجره (SleepGoalSheet) بدون قاب کارت */
  bare?: boolean;
}) {
  const [bed, setBed] = useState(goal.sleep);
  const [wake, setWake] = useState(goal.wake);
  const [latency, setLatency] = useState(DEFAULT_LATENCY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => { setBed(goal.sleep); setWake(goal.wake); }, [goal.sleep, goal.wake]);
  useEffect(() => { let on = true; getSleepLatency().then((v) => { if (on) setLatency(v); }).catch(() => {}); return () => { on = false; }; }, []);

  const complete = clockMin(bed) !== null && clockMin(wake) !== null;
  const dirty = bed !== goal.sleep || wake !== goal.wake;
  const preview = complete ? goalFromTargets({ wake, sleep: bed }) : goalMin;
  const span = complete ? spanMin(bed, wake) : null;
  const presetActive = span != null && (GOAL_PRESETS_MIN as readonly number[]).includes(span) ? String(span) : null;
  const sugg = useMemo(() => goalSuggestions(wake, latency, preview), [wake, latency, preview]);

  const edit = (b: string, w: string) => { setBed(b); setWake(w); setOk(false); };

  async function save() {
    if (busy || !complete) return;
    setBusy(true);
    setErr(null);
    setOk(false);
    try {
      await setSleepGoal({ wake, sleep: bed });
      setOk(true);
      onSaved();
    } catch {
      setErr(tr("ذخیره نشد. دوباره امتحان کن.", "Couldn't save. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  const saveBtn = (
    <button type="button" className="btn btn-primary slg-save" onClick={save} disabled={busy || !dirty || !complete}>
      {busy ? <Spinner size={14} /> : ok && !dirty ? tr("ذخیره شد", "Saved") : tr("ذخیره‌ی هدف", "Save goal")}
    </button>
  );

  const body = (
    <>
      <div className="slg-goal-sum">
        <b>{durationLabel(preview)}</b>
        <span className="sl-sub">{tr("هر شب", "per night")}</span>
      </div>

      <div className="slg-times">
        <SleepTimeField label={tr("ساعت بیداری", "Wake-up time")} value={wake} fallback={goal.wake} onChange={(v) => edit(bed, v)} />
        <SleepTimeField label={tr("ساعت خواب", "Bedtime")} value={bed} fallback={goal.sleep} onChange={(v) => edit(v, wake)} />
      </div>

      <div className="slg-block">
        <span className="slg-label">{tr("مدت هدف (ساعت خواب خودکار حساب می‌شه)", "Target length (bedtime is worked out for you)")}</span>
        <SegmentedTabs
          className="slg-dur seg-flush"
          ariaLabel={tr("مدت هدف خواب", "Sleep goal length")}
          options={GOAL_PRESETS_MIN.map((m) => ({ value: String(m), label: tr(`${hoursShort(m)} س`, `${hoursShort(m)}h`) }))}
          active={presetActive}
          onChange={(v) => { const b = bedForDuration(wake, Number(v)); if (b) edit(b, wake); }}
        />
      </div>

      {sugg.length > 0 && (
        <div className="slg-block">
          <span className="slg-label">{tr("پیشنهاد چرخه‌ای برای این ساعت بیداری", "Cycle-aligned bedtimes for this wake-up time")}</span>
          <div className="slg-sugs">
            {sugg.map((o) => (
              <button
                key={o.cycles}
                type="button"
                className={`btn btn-outline slg-sug${o.bed === bed ? " is-sel" : ""}${o.best ? " is-best" : ""}`}
                aria-pressed={o.bed === bed}
                onClick={() => edit(o.bed, wake)}
              >
                <b dir="ltr">{o.bed}</b>
                <span className="slg-sug-meta">
                  <span>{tr(`${o.cycles} چرخه کامل`, `${o.cycles} full cycles`)}</span>
                  <small>{durationLabel(o.sleepMin)}</small>
                </span>
                {o.best && <em className="slg-sug-badge">{tr("پیشنهادی", "Suggested")}</em>}
              </button>
            ))}
          </div>
          <span className="sl-sub">{tr(`با احتساب ${latency} دقیقه تا خواب رفتن`, `Includes ${latency} min to fall asleep`)}</span>
        </div>
      )}

      {!custom && !dirty && <span className="sl-sub">{tr("فعلا از ساعت‌های روتینت گرفته شده؛ هر وقت خواستی جدا تنظیمش کن.", "For now it uses your routine times; set it separately whenever you like.")}</span>}
      {err && <span className="sl-err" role="alert">{err}</span>}
    </>
  );

  if (bare) {
    return (
      <>
        <div className="slg-body">{body}</div>
        <div className="slg-foot"><div className="slg-actions">{saveBtn}</div></div>
      </>
    );
  }
  return (
    <div className="sl-card">
      <div className="sl-head-row">
        <h3 className="sl-card-title"><Target aria-hidden="true" /> {tr("هدف خواب", "Sleep goal")}</h3>
      </div>
      <div className="slp-goal-bare">{body}{saveBtn}</div>
    </div>
  );
}
