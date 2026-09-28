"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Tablets, BarChart3, Users } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { DashReminderCard } from "./DashReminderCard";
import { DashMedicationCard } from "./DashMedicationCard";
import { DashFriendsCard } from "./DashFriendsCard";
import { DashWeeklyChartCard } from "./DashWeeklyChartCard";
import { DashboardPrefs } from "@/lib/dashboardPrefs";

type PanelKey = "reminders" | "medications" | "chart" | "friends";

const PANEL_META: Record<PanelKey, { label: string; icon: React.ReactNode }> = {
  reminders: { label: "یادآوری", icon: <Bell className="h-4 w-4" /> },
  medications: { label: "دارو", icon: <Tablets className="h-4 w-4" /> },
  chart: { label: "آمار هفتگی", icon: <BarChart3 className="h-4 w-4" /> },
  friends: { label: "دوستان", icon: <Users className="h-4 w-4" /> },
};

// چهار کارتِ «یادآوری / یادآوری دارو / آمار هفتگی / دوستان» قبلا هرکدوم
// جدا و زیر هم (یا توی دو ستون) چیده می‌شدن. اینجا هر چهارتا زیر یک ردیفِ
// آیکون جمع می‌شن — با کلیک روی هر آیکون، همون کارت (بدون هیچ تغییری در
// خودش، فقط wrap شده) زیر ردیف نشون داده می‌شه. یک‌بار در لحظه انتخاب
// می‌شه؛ کلیک دوباره روی آیکونِ فعال چیزی رو نمی‌بنده (طبق رفتار
// SegmentedTabs که تعویض به همون مقدار را نادیده می‌گیرد).
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
      <SegmentedTabs
        options={enabled.map((key) => ({
          value: key,
          label: (
            <span className="flex items-center justify-center gap-1.5">
              {PANEL_META[key].icon}
              <span>{PANEL_META[key].label}</span>
            </span>
          ),
        }))}
        active={current}
        onChange={setActive}
      />

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
