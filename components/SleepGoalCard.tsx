"use client";

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { TimeInput } from "./TimeInput";
import { Spinner } from "./Spinner";
import { setSleepGoal, type SleepGoal } from "@/lib/sleepGoal";
import { durationLabel, goalFromTargets } from "@/lib/sleep";

// هدف خواب سیستم جدای خواب: ساعت خواب و بیداری هدف، و مدت هدف که از همین دو
// ساخته می‌شه (goalFromTargets). امتیاز، بدهی خواب، هیرو و چرخه‌ها همه از همین.
export function SleepGoalCard({
  goal,
  custom,
  goalMin,
  onSaved,
}: {
  goal: SleepGoal;
  /** false یعنی هنوز از ساعت‌های روتین میاد */
  custom: boolean;
  goalMin: number;
  onSaved: () => void;
}) {
  const [bed, setBed] = useState(goal.sleep);
  const [wake, setWake] = useState(goal.wake);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => { setBed(goal.sleep); setWake(goal.wake); }, [goal.sleep, goal.wake]);

  const dirty = bed !== goal.sleep || wake !== goal.wake;
  const preview = goalFromTargets({ wake, sleep: bed });

  async function save() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    setOk(false);
    try {
      await setSleepGoal({ wake, sleep: bed });
      setOk(true);
      onSaved();
    } catch {
      setErr("ذخیره نشد. دوباره امتحان کن.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sl-card">
      <div className="sl-head-row">
        <h3 className="sl-card-title"><Target aria-hidden="true" /> هدف خواب</h3>
        <span className="sl-sub">{durationLabel(dirty ? preview : goalMin)} هر شب</span>
      </div>
      <div className="slp-goal-fields">
        <label className="slp-goal-field">
          <span>ساعت خواب</span>
          <TimeInput value={bed} onChange={(v) => { setBed(v); setOk(false); }} className="wsearch-newform-name" />
        </label>
        <label className="slp-goal-field">
          <span>ساعت بیداری</span>
          <TimeInput value={wake} onChange={(v) => { setWake(v); setOk(false); }} className="wsearch-newform-name" />
        </label>
      </div>
      {!custom && !dirty && <span className="sl-sub">فعلا از ساعت‌های روتینت گرفته شده؛ هر وقت خواستی جدا تنظیمش کن.</span>}
      {err && <span className="sl-err">{err}</span>}
      {(dirty || ok) && (
        <button type="button" className="trade-primary-btn" onClick={save} disabled={busy || !dirty}>
          {busy ? <Spinner size={14} /> : ok && !dirty ? "ذخیره شد" : "ذخیره‌ی هدف"}
        </button>
      )}
    </div>
  );
}
