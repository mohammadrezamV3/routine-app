"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { BarChart3, Moon, Wind, Waves, type LucideIcon } from "lucide-react";
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

  const tile = (t: Tool, Icon: LucideIcon, label: string, opts?: { live?: boolean; sub?: string; eq?: boolean; pulse?: boolean }) => (
    <button
      type="button"
      className={`slt-tile${opts?.live ? " is-live" : ""}`}
      aria-haspopup="dialog"
      onClick={() => setOpen(t)}
      onMouseEnter={preload(t)}
      onFocus={preload(t)}
      onTouchStart={preload(t)}
    >
      <span className="slt-ic" aria-hidden="true">
        {opts?.eq ? <span className="slt-eq"><i /><i /><i /><i /></span> : <Icon className={opts?.pulse ? "slt-pulse" : undefined} />}
      </span>
      <span className="slt-label">{label}</span>
      {opts?.sub && <span className="slt-sub">{opts.sub}</span>}
    </button>
  );

  return (
    <>
      <div className="slt-row" role="group" aria-label={tr("ابزارهای خواب", "Sleep tools")}>
        {tile("sound", Waves, snd.playing ? soundName(snd.kind) : tr("صداها", "Sounds"), {
          live: snd.playing,
          eq: snd.playing,
          sub: snd.playing && rem != null ? formatRemaining(rem) : undefined,
        })}
        {tile("breath", Wind, tr("تنفس آرام", "Breathe"))}
        {tile("nap", Moon, nap.ended ? tr("بیدار شو", "Wake up") : tr("چرت", "Nap"), {
          live: nap.running || nap.ended,
          pulse: nap.ended,
          sub: nap.running ? formatCountdown(nap.remainingSec) : undefined,
        })}
        {tile("stats", BarChart3, tr("آمار", "Stats"))}
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
