"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Tablets, BarChart3, Users } from "lucide-react";
import { DashReminderCard } from "./DashReminderCard";
import { DashMedicationCard } from "./DashMedicationCard";
import { DashFriendsCard } from "./DashFriendsCard";
import { DashWeeklyChartCard } from "./DashWeeklyChartCard";
import { DashboardPrefs } from "@/lib/dashboardPrefs";

type PanelKey = "reminders" | "medications" | "chart" | "friends";

const PANEL_META: Record<PanelKey, { label: string; icon: React.ReactNode }> = {
  reminders: { label: "یادآوری", icon: <Bell /> },
  medications: { label: "دارو", icon: <Tablets /> },
  chart: { label: "آمار هفتگی", icon: <BarChart3 /> },
  friends: { label: "دوستان", icon: <Users /> },
};

// چهار کارتِ «یادآوری / یادآوری دارو / آمار هفتگی / دوستان» — طبقِ طرحِ
// دستیِ کاربر: یک ردیفِ چهار باکسِ مربعیِ جدا (هرکدوم با آیکون و اسم، همون
// ظاهرِ DashCard)، و زیرشون یک باکسِ بزرگ که محتوای بخشِ انتخاب‌شده رو با
// انیمیشن نشون می‌ده. نه SegmentedTabs/تاگل.
export function DashQuickPanels({
  prefs,
  statsRefreshKey,
}: {
  prefs: DashboardPrefs;
  statsRefreshKey?: number;
}) {
  const enabled = useMemo<PanelKey[]>(() => {
    const list: PanelKey[] = [];
    if (prefs.showReminders) list.push("reminders");
    if (prefs.showMedications) list.push("medications");
    if (prefs.showChart) list.push("chart");
    if (prefs.showFriends) list.push("friends");
    return list;
  }, [prefs.showReminders, prefs.showMedications, prefs.showChart, prefs.showFriends]);

  const [active, setActive] = useState<PanelKey | null>(null);
  const current = active && enabled.includes(active) ? active : enabled[0] ?? null;

  if (enabled.length === 0 || !current) return null;

  return (
    <div className="dash-quick-panels flex flex-col gap-4 sm:gap-6">
      {/* باکس‌های کوچیکِ فقط‌آیکون؛ انتخاب‌شده بزرگ‌تر می‌شه و اسمش ظاهر می‌شه. */}
      <div className="flex items-end justify-center gap-2.5 sm:gap-3.5" role="tablist" aria-label="بخش‌های روتین">
        {enabled.map((key) => {
          const on = key === current;
          return (
            <motion.button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={PANEL_META[key].label}
              title={PANEL_META[key].label}
              onClick={() => setActive(key)}
              whileTap={{ scale: 0.92 }}
              layout
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className={`dash-quick-tile rounded-dash border bg-dash-card backdrop-blur-xl${on ? " is-on" : ""}`}
            >
              <motion.span layout="position" className="dash-quick-tile-icon">{PANEL_META[key].icon}</motion.span>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.span
                    key="label"
                    className="dash-quick-tile-label"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {PANEL_META[key].label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {current === "reminders" && <DashReminderCard />}
          {current === "medications" && <DashMedicationCard />}
          {current === "chart" && <DashWeeklyChartCard refreshKey={statsRefreshKey} />}
          {current === "friends" && <DashFriendsCard />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
