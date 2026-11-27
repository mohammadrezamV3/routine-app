"use client";

import { useState } from "react";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { TimeInput } from "@/components/TimeInput";
import { bedOptions, DEFAULT_LATENCY, LATENCY_PRESETS, wakeOptions, type CycleOption } from "@/lib/sleepCycles";
import { hhmmToMin } from "@/lib/sleepDial";
import { durationLabel } from "@/lib/sleep";
import { tr } from "@/lib/i18n";

type Mode = "wake" | "now" | "bed";

// هدف 8 ساعت خواب؛ فقط برای نشان‌دادن «پیشنهاد» روی نزدیک‌ترین گزینه
const GOAL_MIN = 480;

type Result = { sig: string; mode: Mode; at: string; options: CycleOption[] };

export function ToolSleepCalc() {
  const [mode, setMode] = useState<Mode>("wake");
  const [wakeAt, setWakeAt] = useState("07:00");
  const [bedAt, setBedAt] = useState("23:00");
  const [latency, setLatency] = useState<string>(String(DEFAULT_LATENCY));
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sig = [mode, mode === "wake" ? wakeAt : mode === "bed" ? bedAt : "", latency].join("|");

  function calculate() {
    const lat = Number(latency);
    if (mode === "now") {
      const d = new Date();
      const nowMin = d.getHours() * 60 + d.getMinutes();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      setError(null);
      setRes({ sig, mode, at: `${h}:${m}`, options: wakeOptions(nowMin, lat, GOAL_MIN) });
      return;
    }
    const raw = mode === "wake" ? wakeAt : bedAt;
    const min = hhmmToMin(raw);
    if (min === null) { setError(tr("ساعت را به شکل 07:00 وارد کن", "Enter the time like 07:00")); setRes(null); return; }
    setError(null);
    setRes({ sig, mode, at: raw, options: mode === "wake" ? bedOptions(min, lat, GOAL_MIN) : wakeOptions(min, lat, GOAL_MIN) });
  }

  const stale = !!res && res.sig !== sig;

  return (
    <div>
      <div className="stl-form">
        <div className="stl-field wide">
          <span className="stl-label">{tr("چه چیزی را می‌خواهی بدانی؟", "What do you want to find out?")}</span>
          <SegmentedTabs<Mode>
            ariaLabel={tr("حالت محاسبه", "Calculation mode")}
            active={mode}
            onChange={(m) => { setMode(m); setRes(null); setError(null); }}
            options={[
              { value: "wake", label: tr("ساعت بیداری", "Wake-up time") },
              { value: "now", label: tr("الان بخوابم", "Sleep now") },
              { value: "bed", label: tr("ساعت خواب", "Bedtime") },
            ]}
          />
        </div>
        {mode === "wake" && (
          <div className="stl-field">
            <span className="stl-label">{tr("ساعت بیداری", "Wake-up time")}</span>
            <TimeInput value={wakeAt} onChange={setWakeAt} className="wsearch-newform-name" placeholder="07:00" />
          </div>
        )}
        {mode === "bed" && (
          <div className="stl-field">
            <span className="stl-label">{tr("ساعت دراز کشیدن در تخت", "Time you get into bed")}</span>
            <TimeInput value={bedAt} onChange={setBedAt} className="wsearch-newform-name" placeholder="23:00" />
          </div>
        )}
        <div className={`stl-field${mode === "now" ? " wide" : ""}`}>
          <span className="stl-label">{tr("چند دقیقه طول می‌کشد بخوابی؟", "How long do you take to fall asleep?")}</span>
          <SegmentedTabs<string>
            ariaLabel={tr("زمان به خواب رفتن", "Time to fall asleep")}
            active={latency}
            onChange={setLatency}
            options={LATENCY_PRESETS.map((p) => ({ value: String(p), label: String(p) }))}
          />
          <span className="stl-hint">{tr("به دقیقه؛ برای بیشتر آدم‌ها حدود 15 دقیقه است.", "In minutes; for most people it is about 15.")}</span>
        </div>
      </div>

      <div className="stl-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={calculate}>{tr("محاسبه", "Calculate")}</button>
      </div>
      {error && <p className="stl-error" role="alert">{error}</p>}

      {res && (
        <div className={`stl-result${stale ? " stale" : ""}`} aria-live="polite">
          <p className="stl-note">
            {res.mode === "wake" && tr(`برای بیدارشدن ساعت ${res.at}، یکی از این ساعت‌ها در تخت دراز بکش:`, `To wake up at ${res.at}, get into bed at one of these times:`)}
            {res.mode === "now" && tr(`اگر همین الان (${res.at}) دراز بکشی، یکی از این ساعت‌ها برای بیدارشدن مناسب است:`, `If you lie down right now (${res.at}), one of these is a good time to wake up:`)}
            {res.mode === "bed" && tr(`اگر ساعت ${res.at} در تخت دراز بکشی، یکی از این ساعت‌ها برای بیدارشدن مناسب است:`, `If you get into bed at ${res.at}, one of these is a good time to wake up:`)}
          </p>
          <div className="stl-times">
            {res.options.map((o) => (
              <div key={o.cycles} className={`stl-time${o.best ? " best" : ""}`}>
                <div className="stl-time-clock"><span className="stl-ltr">{o.clock}</span></div>
                <div className="stl-time-meta">
                  {tr(`${o.cycles} چرخه`, `${o.cycles} cycles`)} · {durationLabel(o.sleepMin)}
                </div>
                {o.best && <div className="stl-time-meta">{tr("نزدیک به 8 ساعت", "Closest to 8 hours")}</div>}
              </div>
            ))}
          </div>
          <p className="stl-note">
            {tr(
              "هر چرخه‌ی خواب حدود 90 دقیقه است. بیدارشدن در پایان یک چرخه معمولا سبک‌تر از بیدارشدن وسط خواب عمیق است. برای بزرگسالان 5 تا 6 چرخه (7.5 تا 9 ساعت) مناسب است.",
              "Each sleep cycle lasts about 90 minutes. Waking at the end of a cycle usually feels lighter than waking in deep sleep. Five to six cycles (7.5 to 9 hours) suit most adults.",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
