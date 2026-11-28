"use client";

import "./sleep-sheet.css";
import "./sleep-log.css";
import "./sleep-detail.css";
import "./sleep-charts.css";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { SleepTrendChart } from "./SleepTrendChart";
import { SleepMonthMap } from "./SleepMonthMap";
import { SleepInsightsPanel, MIN_NIGHTS } from "./SleepInsightsPanel";
import { SleepNightDetail } from "./SleepNightDetail";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useSheetFocus } from "@/lib/useSheetFocus";
import type { sleepInsights, SleepRecord } from "@/lib/sleep";
import { sleepMinutes } from "@/lib/sleep";
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
  const [detailIso, setDetailIso] = useState<string | null>(null);
  const detailRec = detailIso ? entries.find((e) => e.date === detailIso && sleepMinutes(e) > 0) ?? null : null;
  // شب ثبت‌شده: نمای کامل همین‌جا؛ شب خالی: مستقیم فرم ثبت
  const pick = (iso: string) => {
    if (entries.some((e) => e.date === iso && sleepMinutes(e) > 0)) setDetailIso(iso);
    else onPick(iso);
  };
  const panelRef = useRef<HTMLDivElement>(null);
  useSheetFocus(panelRef);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { if (detailIso) setDetailIso(null); else onClose(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose, detailIso]);

  const options: { value: Tab; label: string }[] = [
    { value: "calendar", label: tr("تقویم", "Calendar") },
    { value: "trend", label: tr("روند", "Trend") },
    { value: "insights", label: tr("خلاصه", "Summary") },
    ...(insights.nights >= MIN_NIGHTS ? [{ value: "tips" as Tab, label: tr("نکته‌ها", "Tips") }] : []),
  ];

  return (
    <>
      <div className="modal-overlay open sleep-ov" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="modal-panel liquid-glass-panel open sleep-scope slg-panel slg-stats" role="dialog" aria-modal="true" aria-label={tr("آمار خواب", "Sleep stats")} dir={isEn() ? "ltr" : "rtl"}>
        <div className="modal-head">
          <div className="modal-title">{tr("آمار خواب", "Sleep stats")}</div>
          <button type="button" className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
        </div>
        <div className="slg-body">
          {detailRec ? (
            <>
              <button type="button" className="btn btn-ghost btn-sm sst-back" onClick={() => setDetailIso(null)}>
                {isEn() ? <ChevronLeft aria-hidden width={16} height={16} /> : <ChevronRight aria-hidden width={16} height={16} />}{tr("برگشت به آمار", "Back to stats")}
              </button>
              <SleepNightDetail rec={detailRec} goalMin={insights.goalMin} targetBed={target.sleep} onEdit={() => onPick(detailRec.date)} />
            </>
          ) : (
            <>
          <SegmentedTabs<Tab> options={options} active={tab} onChange={setTab} className="seg-flush" ariaLabel={tr("بخش‌های آمار خواب", "Sleep stats sections")} />
          {tab === "calendar" && <SleepMonthMap insights={insights} todayIso={todayIso} onPick={pick} />}
          {tab === "trend" && <SleepTrendChart fit entries={entries} insights={insights} target={target} todayIso={todayIso} onPick={pick} />}
          {tab === "insights" && <SleepInsightsPanel insights={insights} target={target} part={insights.nights >= MIN_NIGHTS ? "stats" : "all"} />}
          {tab === "tips" && <SleepInsightsPanel insights={insights} target={target} part="tips" />}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default SleepStatsSheet;
