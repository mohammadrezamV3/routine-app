"use client";

import { useEffect, useState } from "react";
import { SegmentedTabs } from "./SegmentedTabs";
import { TimeInput } from "./TimeInput";
import { bedOptions, LATENCY_PRESETS, normalizeLatency, wakeOptions, type CycleOption } from "@/lib/sleepCycles";
import { minutesToClock } from "@/lib/sleep";
import { toEnDigits } from "@/lib/schedule";

const LS_KEY = "arion:tool:sleep";
type Mode = "wake" | "now";

function parseClock(raw: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(toEnDigits(raw).trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h < 24 && mi < 60 ? h * 60 + mi : null;
}

function dur(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} ساعت و ${m} دقیقه` : `${h} ساعت`;
}

type Shown = { mode: Mode; at: string; latency: number; options: CycleOption[] };

export function ToolSleepCalculator() {
  const [mode, setMode] = useState<Mode>("wake");
  const [time, setTime] = useState("");
  const [latency, setLatency] = useState(15);
  const [err, setErr] = useState<string | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {};
      if (p.mode === "wake" || p.mode === "now") setMode(p.mode);
      if (p.latency) setLatency(normalizeLatency(p.latency));
      if (typeof p.time === "string") setTime(p.time);
    } catch { /* بدون ذخیره هم کار می‌کند */ }
  }, []);

  function calculate(e?: React.FormEvent) {
    e?.preventDefault();
    let at: number;
    if (time.trim() === "" && mode === "now") {
      const d = new Date();
      at = d.getHours() * 60 + d.getMinutes();
    } else {
      const parsed = parseClock(time);
      if (parsed === null) {
        setErr(mode === "wake" ? "ساعت بیدار شدن را کامل و به شکل 07:00 وارد کن" : "ساعت را به شکل 23:30 وارد کن یا خالی بگذار تا زمان الان حساب شود");
        setShown(null);
        return;
      }
      at = parsed;
    }
    setErr(null);
    // هدف 8 ساعت فقط برای انتخاب گزینه‌ی «best» کتابخانه است؛ توصیه‌ی صفحه 5 و 6 چرخه است
    const options = mode === "wake" ? bedOptions(at, latency, 480) : wakeOptions(at, latency, 480);
    setShown({ mode, at: minutesToClock(at), latency, options });
    try { localStorage.setItem(LS_KEY, JSON.stringify({ mode, latency, time })); } catch { /* نادیده */ }
  }

  return (
    <form className="tl-calc" onSubmit={calculate} noValidate>
      <div className="tl-form">
        <SegmentedTabs<Mode>
          active={mode}
          onChange={(m) => { setMode(m); setShown(null); setErr(null); }}
          ariaLabel="حالت محاسبه"
          options={[
            { value: "wake", label: "ساعت بیدار شدن را می‌دانم" },
            { value: "now", label: "الان یا ساعت مشخص می‌خوابم" },
          ]}
        />
        <div>
          <label className="exercise-form-label" htmlFor="tl-sleep-time">
            {mode === "wake" ? "ساعت بیدار شدن (24 ساعته)" : "ساعت خوابیدن (خالی = همین الان)"}
          </label>
          <TimeInput
            value={time}
            onChange={setTime}
            className="wsearch-newform-name"
            placeholder={mode === "wake" ? "07:00" : "الان"}
          />
        </div>
        <div>
          <span className="exercise-form-label">چند دقیقه طول می‌کشد خوابت ببرد؟</span>
          <SegmentedTabs<string>
            active={String(latency)}
            onChange={(v) => setLatency(normalizeLatency(Number(v)))}
            ariaLabel="زمان به خواب رفتن به دقیقه"
            options={LATENCY_PRESETS.map((p) => ({ value: String(p), label: <span dir="ltr">{p}</span> }))}
          />
        </div>
        {err && <div className="trade-form-error" role="alert">{err}</div>}
        <button type="submit" className="trade-primary-btn tl-btn">محاسبه</button>
      </div>

      <div className="tl-out" aria-live="polite">
        {!shown && <p className="tl-note">ساعت را وارد کن و روی محاسبه بزن؛ ساعت‌های مناسب با چرخه‌های 90 دقیقه‌ای همین‌جا نشان داده می‌شوند.</p>}
        {shown && (
          <div className="tl-fade" key={`${shown.mode}-${shown.at}-${shown.latency}`}>
            <h2 className="tl-out-title">
              {shown.mode === "wake"
                ? <>برای بیدار شدن ساعت <span dir="ltr">{shown.at}</span> بهتر است بخوابی:</>
                : <>اگر ساعت <span dir="ltr">{shown.at}</span> بخوابی بهتر است بیدار شوی:</>}
            </h2>
            <ul className="tl-list" style={{ marginTop: 10 }}>
              {shown.options.map((o) => (
                <li key={o.cycles} className={`tl-opt${o.cycles >= 5 ? " rec" : ""}`}>
                  <span className="tl-opt-clock" dir="ltr">{o.clock}</span>
                  <span className="tl-opt-meta">{o.cycles} چرخه، {dur(o.sleepMin)} خواب</span>
                  {o.cycles >= 5 && <span className="tl-badge">پیشنهادی</span>}
                </li>
              ))}
            </ul>
            <p className="tl-note" style={{ marginTop: 10 }}>
              زمان به خواب رفتن ({shown.latency} دقیقه) در محاسبه لحاظ شده است. چرخه‌ها حدودی هستند و برای هر فرد کمی فرق می‌کنند.
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
