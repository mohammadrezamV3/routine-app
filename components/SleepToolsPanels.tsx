"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "./sleep-tools-row.css";
import type { sleepInsights, SleepRecord } from "@/lib/sleep";
import { formatRemaining, remainingMs, useSleepSound, type SleepSoundKind } from "@/lib/sleepSound";
import { formatCountdown, useNapTimer } from "@/lib/sleepNap";
import { tr } from "@/lib/i18n";

// ردیف ابزارهای خواب زیر دو کارت /sleep: صداهای خواب، تنفس آرام، چرت و آمار.
// هر کاشی پنجره‌ی خودش رو (next/dynamic، پیش‌لود با hover/فوکوس/لمس) باز می‌کنه.
// تایمر چرت اینجا mount می‌مونه تا زنگ حتی با بسته بودن پنجره بخوره.

const loadSound = () => import("./SleepSoundSheet");
const loadBreath = () => import("./SleepBreathSheet");
const loadNap = () => import("./SleepNapSheet");
const loadStats = () => import("./SleepStatsSheet");
const SleepSoundSheet = dynamic(() => loadSound().then((m) => m.SleepSoundSheet), { ssr: false });
const SleepBreathSheet = dynamic(() => loadBreath().then((m) => m.SleepBreathSheet), { ssr: false });
const SleepNapSheet = dynamic(() => loadNap().then((m) => m.SleepNapSheet), { ssr: false });
const SleepStatsSheet = dynamic(() => loadStats().then((m) => m.SleepStatsSheet), { ssr: false });

type Tool = "sound" | "breath" | "nap" | "stats";

// آیکون‌های تصویرگونه‌ی ابزارها: فقط stroke (currentColor + رنگ تاکید کاشی)، بدون بک‌گراند
function ArtSound() {
  return (
    <svg viewBox="0 0 48 48" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="24" r="4.5" stroke="currentColor" />
      <path d="M21 18.5Q25 24 21 29.5" stroke="var(--t)" />
      <path d="M27.5 13.5Q36 24 27.5 34.5" stroke="var(--t)" opacity=".75" />
      <path d="M34 8.5Q47 24 34 39.5" stroke="var(--t)" opacity=".5" />
    </svg>
  );
}
function ArtBreath() {
  return (
    <svg viewBox="0 0 48 48" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="24" cy="24" r="21" stroke="var(--t)" strokeDasharray="1.5 4.5" opacity=".7" />
      <circle cx="24" cy="24" r="15" stroke="currentColor" />
      <circle cx="24" cy="24" r="9" stroke="var(--t)" />
      <circle cx="24" cy="24" r="3.2" fill="var(--t)" stroke="none" />
    </svg>
  );
}
function ArtNap() {
  return (
    <svg viewBox="0 0 48 48" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M26 9.5a14.5 14.5 0 1 0 12.5 22A11.5 11.5 0 0 1 26 9.5z" stroke="currentColor" />
      <path d="M33 7h6.5L33 14.5h6.5" stroke="var(--t)" />
      <path d="M40.5 19.5h4l-4 4.5h4" stroke="var(--t)" opacity=".7" />
    </svg>
  );
}
function ArtStats() {
  return (
    <svg viewBox="0 0 48 48" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 40.5h36" stroke="currentColor" opacity=".5" />
      <rect x="9" y="26" width="8" height="14" rx="4" stroke="currentColor" />
      <rect x="20" y="18" width="8" height="22" rx="4" stroke="var(--t)" />
      <rect x="31" y="9" width="8" height="31" rx="4" stroke="currentColor" />
    </svg>
  );
}
const ART: Record<Tool, () => JSX.Element> = { sound: ArtSound, breath: ArtBreath, nap: ArtNap, stats: ArtStats };

const soundName = (k: SleepSoundKind): string => ({
  rain: tr("باران", "Rain"),
  ocean: tr("اقیانوس", "Ocean"),
  fan: tr("پنکه", "Fan"),
  white: tr("نویز سفید", "White noise"),
  pink: tr("نویز صورتی", "Pink noise"),
  brown: tr("نویز قهوه‌ای", "Brown noise"),
})[k];

export function SleepToolsPanels({
  entries,
  insights,
  target,
  todayIso,
  latency,
  onPick,
}: {
  entries: SleepRecord[];
  insights: ReturnType<typeof sleepInsights>;
  target: { wake: string; sleep: string };
  todayIso: string;
  latency: number;
  onPick: (dateIso: string) => void;
}) {
  const [open, setOpen] = useState<Tool | null>(null);
  const snd = useSleepSound();
  const nap = useNapTimer();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!snd.playing || snd.endsAt == null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [snd.playing, snd.endsAt]);

  const close = useCallback(() => setOpen(null), []);
  const pick = useCallback((iso: string) => { setOpen(null); onPick(iso); }, [onPick]);

  const preload = (t: Tool) => () => {
    void (t === "sound" ? loadSound() : t === "breath" ? loadBreath() : t === "nap" ? loadNap() : loadStats());
  };

  const rem = snd.playing ? remainingMs(snd.endsAt, now) : null;

  const tile = (t: Tool, label: string, sub: string, opts?: { live?: boolean; eq?: boolean; pulse?: boolean }) => {
    const Art = ART[t];
    return (
      <button
        type="button"
        className={`slt-tile is-${t}${opts?.live ? " is-live" : ""}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(t)}
        onMouseEnter={preload(t)}
        onFocus={preload(t)}
        onTouchStart={preload(t)}
      >
        <span className={`slt-art${opts?.pulse ? " slt-pulse" : ""}`} aria-hidden="true"><Art /></span>
        {opts?.eq && <span className="slt-eq" aria-hidden="true"><i /><i /><i /><i /></span>}
        <span className="slt-txt">
          <span className="slt-label">{label}</span>
          <span className="slt-sub">{sub}</span>
        </span>
      </button>
    );
  };

  return (
    <>
      <div className="slt-row" role="group" aria-label={tr("ابزارهای خواب", "Sleep tools")}>
        {tile("sound", tr("صداها", "Sounds"),
          snd.playing
            ? `${soundName(snd.kind)} · ${rem != null ? tr(`${formatRemaining(rem)} مانده`, `${formatRemaining(rem)} left`) : tr("بدون تایمر", "no timer")}`
            : tr("باران، اقیانوس، نویز", "Rain, ocean, noise"),
          { live: snd.playing, eq: snd.playing })}
        {tile("breath", tr("تنفس آرام", "Breathe"), tr("4-7-8 · 5 دقیقه", "4-7-8 · 5 min"))}
        {tile("nap", nap.ended ? tr("بیدار شو", "Wake up") : tr("چرت", "Nap"),
          nap.running ? tr(`${formatCountdown(nap.remainingSec)} مانده`, `${formatCountdown(nap.remainingSec)} left`)
            : nap.ended ? tr("وقت بیدار شدنه", "Time to wake up") : tr("20 دقیقه", "20 min"),
          { live: nap.running || nap.ended, pulse: nap.ended })}
        {tile("stats", tr("آمار", "Stats"), tr("تقویم و روند", "Calendar and trends"))}
      </div>

      {open === "sound" && <SleepSoundSheet open onClose={close} />}
      {open === "breath" && <SleepBreathSheet open onClose={close} />}
      {open === "nap" && <SleepNapSheet open onClose={close} latency={latency} />}
      {open === "stats" && (
        <SleepStatsSheet open onClose={close} entries={entries} insights={insights} target={target} todayIso={todayIso} onPick={pick} />
      )}
    </>
  );
}
