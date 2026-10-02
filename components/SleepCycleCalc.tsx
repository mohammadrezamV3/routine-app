"use client";

import { useEffect, useMemo, useState } from "react";
import { BedDouble } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { TimeInput } from "./TimeInput";
import { bedTimesFor, CYCLE_MIN, DEFAULT_LATENCY, durationLabel, goalFromTargets, wakeTimesFor } from "@/lib/sleep";
import { faNum } from "@/lib/jalali";
import "./sleep-insights.css";

// ماشین‌حساب چرخه‌های 90 دقیقه‌ای خواب. هیچ بک‌گراندی نداره؛ گزینه‌ها بوردر
// دارن و پیشنهادی با بوردر/رنگ اکسنت مشخص می‌شه.
export type SleepCycleCalcProps = {
  target: { wake: string; sleep: string };
};

type Mode = "now" | "wake";

function parseClock(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h > 23 || mi > 59 ? null : h * 60 + mi;
}

export function SleepCycleCalc({ target }: SleepCycleCalcProps) {
  const [mode, setMode] = useState<Mode>("now");
  const [wake, setWake] = useState(target.wake);
  const [nowMin, setNowMin] = useState<number | null>(null);

  useEffect(() => {
    const read = () => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    };
    read();
    const id = window.setInterval(read, 30000);
    return () => window.clearInterval(id);
  }, []);

  const options = useMemo(() => {
    if (mode === "now") return nowMin === null ? null : wakeTimesFor(nowMin, DEFAULT_LATENCY);
    const w = parseClock(wake);
    return w === null ? null : bedTimesFor(w, DEFAULT_LATENCY);
  }, [mode, nowMin, wake]);

  const goal = goalFromTargets(target);
  const best = useMemo(() => {
    if (!options) return null;
    const cands = options.filter((o) => o.cycles >= 5);
    return cands.reduce((a, b) => (Math.abs(b.sleepMin - goal) < Math.abs(a.sleepMin - goal) ? b : a)).cycles;
  }, [options, goal]);

  return (
    <section className="sl-card" aria-label="ماشین‌حساب چرخه‌ی خواب">
      <h3 className="sl-card-title"><BedDouble />ماشین‌حساب چرخه‌ی خواب</h3>

      <SegmentedTabs<Mode>
        ariaLabel="حالت محاسبه"
        active={mode}
        onChange={setMode}
        options={[
          { value: "now", label: "الان بخوابم" },
          { value: "wake", label: "می‌خوام ساعت ... بیدار شم" },
        ]}
      />

      {mode === "wake" && (
        <label className="sli-wake">
          <span>ساعت بیداری</span>
          <TimeInput value={wake} onChange={setWake} className="sli-time-input" />
        </label>
      )}

      <p className="sl-sub">
        {mode === "now" ? "اگه همین الان دراز بکشی، این ساعت‌ها بیدار شدن راحت‌تری داری:" : "برای این ساعت بیداری، این ساعت‌ها وقت دراز کشیدنه:"}
      </p>

      {options ? (
        <ul className="sli-opts">
          {options.map((o) => (
            <li key={o.cycles} className={`sli-opt${o.cycles === best ? " is-best" : ""}`}>
              <b className="sli-opt-clock" dir="ltr">{o.clock}</b>
              <span className="sli-opt-meta">{faNum(o.cycles)} چرخه</span>
              <span className="sli-opt-meta">{durationLabel(o.sleepMin)}</span>
              {o.cycles === best && <em className="sli-opt-badge">پیشنهادی</em>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="sl-sub">{mode === "wake" ? "ساعت بیداری رو به شکل 07:00 وارد کن." : "..."}</p>
      )}

      <p className="sl-sub">
        هر چرخه‌ی خواب حدود {faNum(CYCLE_MIN)} دقیقه‌ست و بیدار شدن در پایان یک چرخه سبک‌تره. حدود {faNum(DEFAULT_LATENCY)} دقیقه هم برای به خواب رفتن حساب شده.
      </p>
    </section>
  );
}
