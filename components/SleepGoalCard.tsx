"use client";

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { TimeInput } from "./TimeInput";
import { Spinner } from "./Spinner";
import { setSleepGoal, type SleepGoal } from "@/lib/sleepGoal";
import { durationLabel, goalFromTargets } from "@/lib/sleep";
import { tr } from "@/lib/i18n";

// هدف خواب سیستم جدای خواب: ساعت خواب و بیداری هدف، و مدت هدف که از همین دو
// ساخته می‌شه (goalFromTargets). امتیاز، بدهی خواب، هیرو و چرخه‌ها همه از همین.
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
      setErr(tr("ذخیره نشد. دوباره امتحان کن.", "Couldn't save. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={bare ? "slp-goal-bare" : "sl-card"}>
      <div className="sl-head-row">
        {!bare && <h3 className="sl-card-title"><Target aria-hidden="true" /> {tr("هدف خواب", "Sleep goal")}</h3>}
        <span className="sl-sub">{durationLabel(dirty ? preview : goalMin)} {tr("هر شب", "per night")}</span>
      </div>
      <div className="slp-goal-fields">
        <label className="slp-goal-field">
          <span>{tr("ساعت خواب", "Bedtime")}</span>
          <TimeInput value={bed} onChange={(v) => { setBed(v); setOk(false); }} className="wsearch-newform-name" />
        </label>
        <label className="slp-goal-field">
          <span>{tr("ساعت بیداری", "Wake-up time")}</span>
          <TimeInput value={wake} onChange={(v) => { setWake(v); setOk(false); }} className="wsearch-newform-name" />
        </label>
      </div>
      {!custom && !dirty && <span className="sl-sub">{tr("فعلا از ساعت‌های روتینت گرفته شده؛ هر وقت خواستی جدا تنظیمش کن.", "For now it uses your routine times; set it separately whenever you like.")}</span>}
      {err && <span className="sl-err">{err}</span>}
      {(dirty || ok) && (
        <button type="button" className="trade-primary-btn" onClick={save} disabled={busy || !dirty}>
          {busy ? <Spinner size={14} /> : ok && !dirty ? tr("ذخیره شد", "Saved") : tr("ذخیره‌ی هدف", "Save goal")}
        </button>
      )}
    </div>
  );
}
