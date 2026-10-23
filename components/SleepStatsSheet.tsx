"use client";

import "./sleep-log.css";
import "./sleep-charts.css";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SegmentedTabs } from "./SegmentedTabs";
import { SleepTrendChart } from "./SleepTrendChart";
import { SleepMonthMap } from "./SleepMonthMap";
import { SleepInsightsPanel, MIN_NIGHTS } from "./SleepInsightsPanel";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useSheetFocus } from "@/lib/useSheetFocus";
import type { sleepInsights, SleepRecord } from "@/lib/sleep";
import { isEn, tr } from "@/lib/i18n";

// پنجره‌ی آمار خواب: تقویم، روند و تحلیل با SegmentedTabs. انتخاب یک شب پنجره
// رو می‌بنده و ویرایش همون شب باز می‌شه (onPick).

type Tab = "calendar" | "trend" | "insights" | "tips";

export type SleepStatsSheetProps = {
  open: boolean;
  onClose: () => void;
  entries: SleepRecord[];
  insights: ReturnType<typeof sleepInsights>;
  target: { wake: string; sleep: string };
  todayIso: string;
  onPick: (dateIso: string) => void;
};

export function SleepStatsSheet(props: SleepStatsSheetProps) {
  if (!props.open || typeof document === "undefined") return null;
  return createPortal(<Body {...props} />, document.body);
}

function Body({ onClose, entries, insights, target, todayIso, onPick }: SleepStatsSheetProps) {
  useLockBodyScroll();
  const [tab, setTab] = useState<Tab>("calendar");
  const panelRef = useRef<HTMLDivElement>(null);
  useSheetFocus(panelRef);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const options: { value: Tab; label: string }[] = [
    { value: "calendar", label: tr("تقویم", "Calendar") },
    { value: "trend", label: tr("روند", "Trend") },
    { value: "insights", label: tr("خلاصه", "Summary") },
    ...(insights.nights >= MIN_NIGHTS ? [{ value: "tips" as Tab, label: tr("نکته‌ها", "Tips") }] : []),
  ];

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="modal-panel liquid-glass-panel open sleep-scope slg-panel slg-stats" role="dialog" aria-modal="true" aria-label={tr("آمار خواب", "Sleep stats")} dir={isEn() ? "ltr" : "rtl"}>
        <div className="modal-head">
          <div className="modal-title">{tr("آمار خواب", "Sleep stats")}</div>
          <button type="button" className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
        </div>
        <div className="slg-body">
          <SegmentedTabs<Tab> options={options} active={tab} onChange={setTab} className="seg-flush" ariaLabel={tr("بخش‌های آمار خواب", "Sleep stats sections")} />
          {tab === "calendar" && <SleepMonthMap insights={insights} todayIso={todayIso} onPick={onPick} />}
          {tab === "trend" && <SleepTrendChart fit entries={entries} insights={insights} target={target} todayIso={todayIso} onPick={onPick} />}
          {tab === "insights" && <SleepInsightsPanel insights={insights} target={target} part={insights.nights >= MIN_NIGHTS ? "stats" : "all"} />}
          {tab === "tips" && <SleepInsightsPanel insights={insights} target={target} part="tips" />}
        </div>
      </div>
    </>
  );
}

export default SleepStatsSheet;
