"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Tablets, BarChart3, Users, Moon } from "lucide-react";
import { DashReminderCard } from "./DashReminderCard";
import { DashMedicationCard } from "./DashMedicationCard";
import { DashFriendsCard } from "./DashFriendsCard";
import { DashWeeklyChartCard } from "./DashWeeklyChartCard";
import { SleepMiniCard } from "./SleepMiniCard";
import { DashboardPrefs } from "@/lib/dashboardPrefs";

type PanelKey = "reminders" | "sleep" | "medications" | "chart" | "friends";

const PANEL_META: Record<PanelKey, { label: string; icon: React.ReactNode }> = {
  reminders: { label: "یادآوری", icon: <Bell /> },
  sleep: { label: "خواب", icon: <Moon /> },
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
    // خواب بخشی از «روتین من» ـه و همیشه توی ردیفِ دکمه‌ها هست (خاموش‌شدنی نیست)
    list.push("sleep");
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
            // دکمه‌ی ساده + ترنزیشنِ CSS (نه framer layout): layout روی بچه‌ها
            // scale می‌انداخت و اسم موقعِ رفتن اول بزرگ می‌شد بعد محو.
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
          key={current}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {current === "reminders" && <DashReminderCard />}
          {current === "sleep" && <SleepMiniCard />}
          {current === "medications" && <DashMedicationCard />}
          {current === "chart" && <DashWeeklyChartCard refreshKey={statsRefreshKey} />}
          {current === "friends" && <DashFriendsCard />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
