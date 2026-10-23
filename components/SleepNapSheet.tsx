"use client";

import "./sleep-log.css";
import "./sleep-tools.css";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X } from "lucide-react";
import { GradientRing, RING_AMBER, RING_GREEN } from "./GradientRing";
import { SegmentedTabs } from "./SegmentedTabs";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useSheetFocus } from "@/lib/useSheetFocus";
import { isEn, tr } from "@/lib/i18n";
import { NAP_PRESETS, formatCountdown, napClockOf, napWakeClock, normalizeNapLatency, useNapTimer } from "@/lib/sleepNap";

// چرت: انتخاب مدت، نمایش ساعت بیدارشدن، شمارش معکوس بزرگ و صفحه‌ی «بیدار شو».

export type SleepNapSheetProps = { open: boolean; onClose: () => void; latency: number };

const presetHint = (m: number) =>
  m === 10 ? tr("چرت خیلی کوتاه برای هوشیاری", "A very short nap for alertness")
    : m === 20 ? tr("چرت قدرتی؛ بدون خواب‌آلودگی بعدش", "Power nap; no grogginess afterwards")
      : m === 30 ? tr("ممکنه کمی خواب‌آلود بیدار بشی", "You may wake up a bit groggy")
        : tr("یک چرخه‌ی کامل خواب", "One full sleep cycle");

export function SleepNapSheet(props: SleepNapSheetProps) {
  if (!props.open || typeof document === "undefined") return null;
  return createPortal(<SheetBody {...props} />, document.body);
}

function SheetBody({ onClose, latency }: SleepNapSheetProps) {
  useLockBodyScroll();
  const nap = useNapTimer();
  const lat = normalizeNapLatency(latency);
  const [minutes, setMinutes] = useState<number>(20);
  const [now, setNow] = useState(() => Date.now());
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("unsupported");
  const panelRef = useRef<HTMLDivElement>(null);
  useSheetFocus(panelRef);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    try { setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission); } catch { setPerm("unsupported"); }
  }, []);

  // ساعت پیش‌نمایش «بیدارشدن در ...» هر 15 ثانیه تازه می‌شه
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const askPerm = async () => {
    try { setPerm(await Notification.requestPermission()); } catch { setPerm("denied"); }
  };

  const presetOpts = NAP_PRESETS.map((m) => ({ value: String(m), label: tr(`${m} دقیقه`, `${m} min`) }));
  const wake = napWakeClock(now, minutes, lat);
  const showPerm = perm === "default";

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="modal-panel liquid-glass-panel open sleep-scope slg-panel" role="dialog" aria-modal="true" aria-label={tr("چرت", "Nap")} dir={isEn() ? "ltr" : "rtl"}>
        <div className="modal-head">
          <div className="modal-title">{tr("چرت", "Nap")}</div>
          <button className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
        </div>

        <div className="slg-body stl-body">
          {nap.ended ? (
            <div className="stl-end" role="alert">
              <GradientRing value={1} size={200} stroke={8} grad={RING_AMBER} className="stl-fit">
                <span className="stl-center">
                  <b className="stl-wake">{tr("بیدار شو", "Wake up")}</b>
                </span>
              </GradientRing>
              <span className="stl-hint">{tr("چرتت تموم شد", "Your nap is over")}</span>
            </div>
          ) : nap.running ? (
            <div className="stl-run">
              <GradientRing value={nap.progress} size={230} stroke={8} grad={RING_GREEN} className="stl-fit">
                <span className="stl-center">
                  <span className="stl-big" dir="ltr">{formatCountdown(nap.remainingSec)}</span>
                  <span className="stl-hint">{tr("تا بیدارشدن", "until wake-up")}</span>
                </span>
              </GradientRing>
              <div className="stl-wakeat">
                <span>{tr("بیدارشدن ساعت", "Wake-up at")}</span>
                <b dir="ltr">{nap.endsAt != null ? napClockOf(nap.endsAt) : "--:--"}</b>
              </div>
            </div>
          ) : (
            <div className="stl-opts">
              <SegmentedTabs
                className="seg-flush"
                ariaLabel={tr("مدت چرت", "Nap length")}
                options={presetOpts}
                active={String(minutes)}
                onChange={(v) => setMinutes(Number(v))}
              />
              <span className="stl-hint">{presetHint(minutes)}</span>
              <div className="stl-wakeat">
                <span>{tr("اگه الان شروع کنی بیدارشدن ساعت", "If you start now you wake at")}</span>
                <b dir="ltr">{wake}</b>
              </div>
              <span className="stl-hint">
                {lat > 0
                  ? tr(`شامل ${lat} دقیقه برای خواب رفتن`, `Includes ${lat} min to fall asleep`)
                  : tr("بدون زمان خواب رفتن", "No time to fall asleep added")}
              </span>
            </div>
          )}

          {showPerm && !nap.ended && (
            <button type="button" className="btn btn-ghost btn-sm stl-perm" onClick={askPerm}>
              <Bell aria-hidden /> <span>{tr("اعلان پایان چرت", "Notify me when the nap ends")}</span>
            </button>
          )}
        </div>

        <div className="slg-foot">
          <div className="slg-actions">
            {nap.ended ? (
              <button type="button" className="btn btn-primary slg-save" onClick={() => { nap.cancel(); }}>{tr("بیدار شدم", "I'm awake")}</button>
            ) : nap.running ? (
              <button type="button" className="btn btn-ghost slg-save" onClick={nap.cancel}><X aria-hidden /> {tr("لغو چرت", "Cancel nap")}</button>
            ) : (
              <button type="button" className="btn btn-primary slg-save" onClick={() => nap.start(minutes, lat)}>{tr("شروع چرت", "Start nap")}</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default SleepNapSheet;
