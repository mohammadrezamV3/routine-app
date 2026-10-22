"use client";

import "./sleep-log.css";
import "./sleep-sound.css";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloudRain, Cloud, Fan, Mountain, Pause, Play, Waves, Wind, type LucideIcon } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useSheetFocus } from "@/lib/useSheetFocus";
import { tr } from "@/lib/i18n";
import {
  SLEEP_SOUND_KINDS, SLEEP_SOUND_TIMERS, formatRemaining, remainingMs, useSleepSound, type SleepSoundKind,
} from "@/lib/sleepSound";

// پنجره‌ی صداهای خواب: کارت‌های صدا، حجم، تایمر خاموشی و یک دکمه‌ی پخش/توقف.
// پخش در موتور ماژولی می‌مونه و با بسته‌شدن پنجره قطع نمی‌شه.

export type SleepSoundSheetProps = { open: boolean; onClose: () => void };

const ICONS: Record<SleepSoundKind, LucideIcon> = {
  rain: CloudRain, ocean: Waves, fan: Fan, white: Wind, pink: Cloud, brown: Mountain,
};
const soundName = (k: SleepSoundKind): string => ({
  rain: tr("باران", "Rain"),
  ocean: tr("اقیانوس", "Ocean"),
  fan: tr("پنکه", "Fan"),
  white: tr("نویز سفید", "White noise"),
  pink: tr("نویز صورتی", "Pink noise"),
  brown: tr("نویز قهوه‌ای", "Brown noise"),
})[k];

export function SleepSoundSheet(props: SleepSoundSheetProps) {
  if (!props.open || typeof document === "undefined") return null;
  return createPortal(<SheetBody onClose={props.onClose} />, document.body);
}

function SheetBody({ onClose }: { onClose: () => void }) {
  useLockBodyScroll();
  const snd = useSleepSound();
  const panelRef = useRef<HTMLDivElement>(null);
  useSheetFocus(panelRef);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!snd.playing || snd.endsAt == null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [snd.playing, snd.endsAt]);

  const rem = snd.playing ? remainingMs(snd.endsAt, now) : null;
  const timerOpts = [
    { value: "0", label: tr("بدون", "Off") },
    ...SLEEP_SOUND_TIMERS.map((m) => ({ value: String(m), label: String(m) })),
  ];

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="modal-panel liquid-glass-panel open sleep-scope slg-panel sns-panel" role="dialog" aria-modal="true" aria-label={tr("صداهای خواب", "Sleep sounds")}>
        <div className="modal-head">
          <div className="modal-title">{tr("صداهای خواب", "Sleep sounds")}</div>
          <button className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
        </div>

        <div className="slg-body">
          <div className="sns-grid" role="group" aria-label={tr("انتخاب صدا", "Choose a sound")}>
            {SLEEP_SOUND_KINDS.map((k) => {
              const Icon = ICONS[k];
              const on = snd.kind === k;
              const live = on && snd.playing;
              return (
                <button
                  key={k}
                  type="button"
                  className={`sns-card${on ? " active" : ""}`}
                  aria-pressed={on}
                  onClick={() => snd.play(k)}
                >
                  <span className="sns-card-top">
                    <Icon size={22} aria-hidden />
                    <span className={`sns-eq${live ? " live" : ""}`} aria-hidden>
                      <i /><i /><i /><i />
                    </span>
                  </span>
                  <span className="sns-card-name">{soundName(k)}</span>
                </button>
              );
            })}
          </div>

          <div className="slg-block">
            <div className="slg-block-head">
              <label className="slg-label" htmlFor="sns-vol">{tr("بلندی صدا", "Volume")}</label>
              <span className="sns-vol-num" dir="ltr">{Math.round(snd.volume * 100)}%</span>
            </div>
            <input
              id="sns-vol"
              type="range" min={0} max={100} step={1}
              value={Math.round(snd.volume * 100)}
              onChange={(e) => snd.setVolume(Number(e.target.value) / 100)}
              className="sns-range"
              style={{ ["--sns-fill" as string]: `${Math.round(snd.volume * 100)}%` }}
              data-noswipe
            />
          </div>

          <div className="slg-block">
            <div className="slg-block-head">
              <span className="slg-label">{tr("تایمر خاموشی (دقیقه)", "Sleep timer (minutes)")}</span>
              {rem != null && (
                <span className="sns-remain" dir="ltr" aria-live="off">{formatRemaining(rem)}</span>
              )}
            </div>
            <SegmentedTabs
              className="sns-timer seg-flush"
              ariaLabel={tr("تایمر خاموشی", "Sleep timer")}
              options={timerOpts}
              active={String(snd.timerMin ?? 0)}
              onChange={(v) => snd.setTimer(Number(v) || null)}
            />
          </div>
        </div>

        <div className="slg-foot">
          <div className="slg-actions">
            {snd.playing ? (
              <button type="button" className="btn btn-primary slg-save" onClick={snd.stop}>
                <Pause aria-hidden /> <span>{tr("توقف", "Stop")}</span>
              </button>
            ) : (
              <button type="button" className="btn btn-primary slg-save" onClick={() => snd.play()}>
                <Play aria-hidden /> <span>{tr("پخش", "Play")}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default SleepSoundSheet;
