"use client";

import { useState } from "react";
import { AnimatePresence, m as motion } from "framer-motion";
import { CalendarDays, TrendingUp, Lightbulb } from "lucide-react";
import { SleepTrendChart } from "./SleepTrendChart";
import { SleepMonthMap } from "./SleepMonthMap";
import { SleepInsightsPanel } from "./SleepInsightsPanel";
import "./sleep-charts.css";
import type { sleepInsights, SleepRecord } from "@/lib/sleep";
import { tr } from "@/lib/i18n";

type PanelKey = "calendar" | "trend" | "insights";

const panelMeta = (): Record<PanelKey, { label: string; icon: React.ReactNode }> => ({
  calendar: { label: tr("تقویم", "Calendar"), icon: <CalendarDays /> },
  trend: { label: tr("روند", "Trend"), icon: <TrendingUp /> },
  insights: { label: tr("تحلیل", "Insights"), icon: <Lightbulb /> },
});
const ORDER: PanelKey[] = ["calendar", "trend", "insights"];

// آمار خواب زیر دو کارت /sleep: ردیف باکس‌های آیکونی (عین DashQuickPanels و
// ابزارهای چارت ترید) و زیرش یک بخش با محتوای انتخاب‌شده. پیش‌فرض: تقویم.
export function SleepStatsPanels({
  entries,
  insights,
  target,
  todayIso,
  onPick,
}: {
  entries: SleepRecord[];
  insights: ReturnType<typeof sleepInsights>;
  target: { wake: string; sleep: string };
  todayIso: string;
  onPick: (dateIso: string) => void;
}) {
  const [active, setActive] = useState<PanelKey>("calendar");
  const meta = panelMeta();

  return (
    <div className="slst">
      <div className="slst-tabs" role="tablist" aria-label={tr("آمار خواب", "Sleep stats")}>
        {ORDER.map((key) => {
          const on = key === active;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(key)}
              className={`slst-tile${on ? " is-on" : ""}`}
            >
              <span className="slst-ic" aria-hidden="true">{meta[key].icon}</span>
              <span className="slst-label">{meta[key].label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {active === "calendar" && <SleepMonthMap insights={insights} todayIso={todayIso} onPick={onPick} />}
          {active === "trend" && (
            <SleepTrendChart entries={entries} insights={insights} target={target} todayIso={todayIso} onPick={onPick} />
          )}
          {active === "insights" && <SleepInsightsPanel insights={insights} target={target} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
