"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, TrendingUp, Lightbulb } from "lucide-react";
import { SleepTrendChart } from "./SleepTrendChart";
import { SleepMonthMap } from "./SleepMonthMap";
import { SleepInsightsPanel } from "./SleepInsightsPanel";
import type { sleepInsights, SleepRecord } from "@/lib/sleep";

type PanelKey = "calendar" | "trend" | "insights";

const PANEL_META: Record<PanelKey, { label: string; icon: React.ReactNode }> = {
  calendar: { label: "تقویم", icon: <CalendarDays /> },
  trend: { label: "روند", icon: <TrendingUp /> },
  insights: { label: "تحلیل", icon: <Lightbulb /> },
};
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

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-start justify-center gap-2.5 sm:gap-3.5" role="tablist" aria-label="آمار خواب">
        {ORDER.map((key) => {
          const on = key === active;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={PANEL_META[key].label}
              title={PANEL_META[key].label}
              onClick={() => setActive(key)}
              className={`dash-quick-tile rounded-dash border bg-dash-card backdrop-blur-xl${on ? " is-on" : ""}`}
            >
              <span className="dash-quick-tile-icon">{PANEL_META[key].icon}</span>
              <span className="dash-quick-tile-label" aria-hidden={!on}>{PANEL_META[key].label}</span>
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
