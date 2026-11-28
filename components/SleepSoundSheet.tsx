"use client";

import "./sleep-sheet.css";
import "./sleep-log.css";
import "./sleep-sound.css";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Anchor, AudioLines, Bell, Bird, Bug, Building2, Car, CarFront, Cat, Clock, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain,
  CloudRainWind, CloudSnow, Coffee, Droplet, Droplets, Eye, Fan, Fish, Flame, Headphones, Heater, HeartPulse, House, Leaf, Moon, Mountain,
  Music, Music2, Pause, Play, Plane, Ship, Snowflake, Sprout, Sun, Tent, TrainFront, Trees, Waves, WashingMachine, Wind, Zap,
  type LucideIcon,
} from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useSheetFocus } from "@/lib/useSheetFocus";
import { isEn, tr } from "@/lib/i18n";
import { SLEEP_SOUND_TIMERS, formatRemaining, remainingMs, useSleepSound } from "@/lib/sleepSound";
import {
  MAX_SOUND_LAYERS, SLEEP_SOUND_CATALOG, SLEEP_SOUND_CATEGORIES, soundCategoryName, soundName, soundsOfCategory,
  type SleepSoundCategory, type SleepSoundKind,
} from "@/lib/sleepSoundCatalog";

// پنجره‌ی صداهای خواب: دسته‌ها، کاشی‌های صدا (ترکیب تا 3 صدا با بلندی جدا)، بلندی کل، تایمر خاموشی و پخش/توقف.
// پخش در موتور ماژولی می‌مونه و با بسته‌شدن پنجره قطع نمی‌شه.

export type SleepSoundSheetProps = { open: boolean; onClose: () => void };

const ICONS: Record<SleepSoundKind, LucideIcon> = {
  white: Wind, pink: Cloud, brown: Mountain, pinkSoft: CloudFog, brownDeep: Anchor,
  rain: CloudDrizzle, rainHeavy: CloudRain, rainRoof: House, rainTent: Tent, rainLeaves: Leaf,
  storm: CloudLightning, thunderFar: Zap, ocean: Waves, stream: Droplets, waterfall: Droplet, lake: Fish,
  wind: CloudRainWind, forest: Trees, fire: Flame, frogs: Sprout, crickets: Bug, cicadas: Sun,
  owls: Eye, dawnBirds: Bird, blizzard: CloudSnow,
  fan: Fan, ac: Snowflake, cabin: Plane, train: TrainFront, city: Building2, cafe: Coffee,
  fireplace: Heater, rainCar: Car, washer: WashingMachine, ship: Ship, traffic: CarFront, clock: Clock, purr: Cat,
  heartbeat: HeartPulse, bowl: Bell, drone: Moon, chimes: AudioLines, padLullaby: Music2, binaural: Headphones, musicBox: Music,
};

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
  const [cat, setCat] = useState<SleepSoundCategory>(() => SLEEP_SOUND_CATALOG[snd.kind]);

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
      <div className="modal-overlay open sleep-ov" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="modal-panel liquid-glass-panel open sleep-scope slg-panel sns-panel" role="dialog" aria-modal="true" aria-label={tr("صداهای خواب", "Sleep sounds")} dir={isEn() ? "ltr" : "rtl"}>
        <div className="modal-head">
          <div className="modal-title">{tr("صداهای خواب", "Sleep sounds")}</div>
          <button className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
        </div>

        <div className="slg-body">
          <SegmentedTabs
            className="sns-cats seg-flush"
            ariaLabel={tr("دسته‌ی صدا", "Sound category")}
            options={SLEEP_SOUND_CATEGORIES.map((c) => ({ value: c, label: soundCategoryName(c) }))}
            active={cat}
            onChange={(v) => setCat(v as SleepSoundCategory)}
          />

          <div className="sns-grid" role="group" aria-label={tr("انتخاب صدا", "Choose a sound")}>
            {soundsOfCategory(cat).map((k) => {
              const Icon = ICONS[k];
              const on = snd.layers.some((l) => l.kind === k);
              const live = on && snd.playing;
              return (
                <button
                  key={k}
                  type="button"
                  className={`sns-card${on ? " active" : ""}`}
                  aria-pressed={on}
                  onClick={() => snd.toggleLayer(k)}
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

          <div className="slg-block sns-mix">
            <div className="slg-block-head">
              <span className="slg-label">{tr("ترکیب فعلی", "Current mix")}</span>
              <span className="sns-vol-num" dir="ltr">{snd.layers.length}/{MAX_SOUND_LAYERS}</span>
            </div>
            {snd.layers.map((l) => (
              <div key={l.kind} className="sns-mix-row">
                <label className="sns-mix-name" htmlFor={`sns-l-${l.kind}`}>{soundName(l.kind)}</label>
                <input
                  id={`sns-l-${l.kind}`}
                  type="range" min={0} max={100} step={1}
                  value={Math.round(l.volume * 100)}
                  onChange={(e) => snd.setLayerVolume(l.kind, Number(e.target.value) / 100)}
                  className="sns-range"
                  style={{ ["--sns-fill" as string]: `${Math.round(l.volume * 100)}%` }}
                  data-noswipe
                />
              </div>
            ))}
          </div>

          <div className="slg-block">
            <div className="slg-block-head">
              <label className="slg-label" htmlFor="sns-vol">{tr("بلندی کل", "Master volume")}</label>
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
