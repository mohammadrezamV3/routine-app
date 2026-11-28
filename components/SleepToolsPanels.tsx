"use client";

import { useCallback, useEffect, useId, useMemo, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import "./sleep-tools-row.css";
import { sleepMinutes, type sleepInsights, type SleepRecord } from "@/lib/sleep";
import { sparkPoints } from "@/lib/sleepWeekStats";
import { formatRemaining, remainingMs, useSleepSound } from "@/lib/sleepSound";
import { soundSummary } from "@/lib/sleepSoundCatalog";
import { formatCountdown, useNapTimer } from "@/lib/sleepNap";
import { tr } from "@/lib/i18n";

// ردیف ابزارهای خواب زیر دو کارت /sleep: صداهای خواب، تنفس آرام، چرت و آمار.
// هر کاشی پنجره‌ی خودش رو (next/dynamic، پیش‌لود با hover/فوکوس/لمس) باز می‌کنه.
// تایمر چرت اینجا mount می‌مونه تا زنگ حتی با بسته بودن پنجره بخوره.

// بارگذاری چانک با یک بار تلاش دوباره؛ اگه بعد از آپدیت سایت چانک قدیمی نبود، به‌جای
// «کلیک بی‌اثر» یک پیام با دکمه‌ی بارگذاری دوباره نشون می‌دیم.
function LoadFailed({ onClose }: { onClose?: () => void }) {
  return createPortal(
    <div className="modal-panel open slg-panel sleep-scope" role="alert" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <span>{tr("بارگذاری انجام نشد. اتصال رو بررسی کن و دوباره امتحان کن.", "Could not load. Check your connection and try again.")}</span>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>{tr("تلاش دوباره", "Try again")}</button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{tr("بستن", "Close")}</button>
      </div>
    </div>,
    document.body,
  );
}
function safeLoad<T extends { default?: unknown }>(load: () => Promise<T>, pick: (m: T) => ComponentType<any>) {
  return () =>
    load()
      .catch(() => new Promise<T>((r) => setTimeout(r, 400)).then(load))
      .then(pick)
      .catch(() => LoadFailed as ComponentType<any>);
}
const loadSound = () => import("./SleepSoundSheet");
const loadBreath = () => import("./SleepBreathSheet");
const loadNap = () => import("./SleepNapSheet");
const loadStats = () => import("./SleepStatsSheet");
const SleepSoundSheet = dynamic(safeLoad(loadSound, (m) => m.SleepSoundSheet), { ssr: false });
const SleepBreathSheet = dynamic(safeLoad(loadBreath, (m) => m.SleepBreathSheet), { ssr: false });
const SleepNapSheet = dynamic(safeLoad(loadNap, (m) => m.SleepNapSheet), { ssr: false });
const SleepStatsSheet = dynamic(safeLoad(loadStats, (m) => m.SleepStatsSheet), { ssr: false });

type Tool = "sound" | "breath" | "nap" | "stats";

// تصویرگری زنده‌ی هر کاشی: فقط SVG/CSS. حرکت‌ها فقط transform/opacity و با
// reduced-motion و data-perf-weak خاموش می‌شن (sleep-tools-row.css).
const EQ_V = [0.5, 0.9, 0.6, 1, 0.7, 0.95, 0.55];
function ArtSound({ playing }: { playing: boolean }) {
  return (
    <span className={`slt-bars${playing ? " is-playing" : ""}`}>
      {EQ_V.map((v, i) => <i key={i} style={{ ["--v" as string]: v, ["--i" as string]: i } as React.CSSProperties} />)}
    </span>
  );
}
function ArtBreath() {
  return <span className="slt-breath"><i /><i /><i /></span>;
}
function ArtNap({ pct }: { pct: number }) {
  return (
    <svg viewBox="0 0 34 34" fill="none" strokeLinecap="round">
      <circle cx="17" cy="17" r="14" className="slt-ring-track" strokeWidth="3" />
      <circle cx="17" cy="17" r="14" className="slt-ring-arc" strokeWidth="3" pathLength={100} strokeDasharray={`${pct} 100`} transform="rotate(-90 17 17)" />
      <text x="17" y="21" textAnchor="middle" className="slt-z">z</text>
    </svg>
  );
}
function ArtStats({ values }: { values: number[] }) {
  const id = useId().replace(/:/g, "");
  const pts = sparkPoints(values, 64, 34) ?? sparkPoints([2, 4, 3, 6, 5, 8], 64, 34)!;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join("");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox="0 0 64 34" fill="none" strokeLinecap="round" strokeLinejoin="round" className="slt-spark">
      <defs>
        <linearGradient id={`sp${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={{ stopColor: "var(--slt-a)" }} /><stop offset="1" style={{ stopColor: "var(--slt-b)" }} />
        </linearGradient>
      </defs>
      <path d={d} stroke={`url(#sp${id})`} strokeWidth="2.5" />
      <circle cx={last.x} cy={last.y} r="3" style={{ fill: "var(--slt-b)" }} />
    </svg>
  );
}

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

  const sparkValues = useMemo(() => entries.slice(-7).map((e) => sleepMinutes(e)), [entries]);

  const tile = (t: Tool, label: string, sub: string, art: React.ReactNode, live = false) => (
    <button
      type="button"
      className={`slt-tile is-${t}${live ? " is-live" : ""}`}
      aria-haspopup="dialog"
      onClick={() => setOpen(t)}
      onMouseEnter={preload(t)}
      onFocus={preload(t)}
      onTouchStart={preload(t)}
    >
      <span className="slt-art" aria-hidden="true">{art}</span>
      <span className="slt-txt">
        <span className="slt-label">{label}</span>
        <span className="slt-sub">{sub}</span>
      </span>
    </button>
  );

  return (
    <>
      <div className="slt-row" role="group" aria-label={tr("ابزارهای خواب", "Sleep tools")}>
        {tile("sound", tr("صداها", "Sounds"),
          snd.playing
            ? `${soundSummary(snd.layers)} · ${rem != null ? tr(`${formatRemaining(rem)} مانده`, `${formatRemaining(rem)} left`) : tr("بدون تایمر", "no timer")}`
            : tr("باران، اقیانوس، نویز", "Rain, ocean, noise"),
          <ArtSound playing={snd.playing} />, snd.playing)}
        {tile("breath", tr("تنفس آرام", "Breathe"), tr("4-7-8 · 5 دقیقه", "4-7-8 · 5 min"), <ArtBreath />)}
        {tile("nap", nap.ended ? tr("بیدار شو", "Wake up") : tr("چرت", "Nap"),
          nap.running ? tr(`${formatCountdown(nap.remainingSec)} مانده`, `${formatCountdown(nap.remainingSec)} left`)
            : nap.ended ? tr("وقت بیدار شدنه", "Time to wake up") : tr("20 دقیقه", "20 min"),
          <ArtNap pct={nap.running ? Math.max(4, Math.round(nap.progress * 100)) : nap.ended ? 100 : 28} />, nap.running || nap.ended)}
        {tile("stats", tr("آمار", "Stats"), tr("تقویم و روند", "Calendar and trends"), <ArtStats values={sparkValues} />)}
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
