"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Tablets, BarChart3, Users } from "lucide-react";
import { DashReminderCard } from "./DashReminderCard";
import { DashMedicationCard } from "./DashMedicationCard";
import { DashFriendsCard } from "./DashFriendsCard";
import { DashWeeklyChartCard } from "./DashWeeklyChartCard";
import { DashboardPrefs } from "@/lib/dashboardPrefs";
import { featureVisible } from "@/lib/featureFlags";
import { useFeatures } from "@/lib/useFeatures";
import { tr } from "@/lib/i18n";

type PanelKey = "reminders" | "medications" | "chart" | "friends";

const panelMeta = (): Record<PanelKey, { label: string; icon: React.ReactNode }> => ({
  reminders: { label: tr("یادآوری", "Reminders"), icon: <Bell /> },
  medications: { label: tr("دارو", "Medication"), icon: <Tablets /> },
  chart: { label: tr("آمار هفتگی", "Weekly stats"), icon: <BarChart3 /> },
  friends: { label: tr("دوستان", "Friends"), icon: <Users /> },
});

// چهار کارت «یادآوری / یادآوری دارو / آمار هفتگی / دوستان» — طبق طرح
// دستی کاربر: یک ردیف چهار باکس مربعی جدا (هرکدوم با آیکون و اسم، همون
// ظاهر DashCard)، و زیرشون یک باکس بزرگ که محتوای بخش انتخاب‌شده رو با
// انیمیشن نشون می‌ده. نه SegmentedTabs/تاگل.
export function DashQuickPanels({
  prefs,
  statsRefreshKey,
}: {
  prefs: DashboardPrefs;
  statsRefreshKey?: number;
}) {
  // دوستان فلگ پنل ادمین هم داره (/admin/features) — خاموش یعنی دکمه نیست
  const features = useFeatures();
  const friendsOn = featureVisible(features, "friends");
  const enabled = useMemo<PanelKey[]>(() => {
    const list: PanelKey[] = [];
    if (prefs.showReminders) list.push("reminders");
    if (prefs.showMedications) list.push("medications");
    if (prefs.showChart) list.push("chart");
    if (prefs.showFriends && friendsOn) list.push("friends");
    return list;
  }, [prefs.showReminders, prefs.showMedications, prefs.showChart, prefs.showFriends, friendsOn]);

  const [active, setActive] = useState<PanelKey | null>(null);
  const current = active && enabled.includes(active) ? active : enabled[0] ?? null;

  if (enabled.length === 0 || !current) return null;

  return (
    <div className="dash-quick-panels flex flex-col gap-4 sm:gap-6">
      {/* باکس‌های کوچیک فقط‌آیکون؛ انتخاب‌شده بزرگ‌تر می‌شه و اسمش ظاهر می‌شه. */}
      <div className="flex items-end justify-center gap-2.5 sm:gap-3.5" role="tablist" aria-label={tr("بخش‌های روتین", "Routine sections")}>
        {enabled.map((key) => {
          const on = key === current;
          return (
            // دکمه‌ی ساده + ترنزیشن CSS (نه framer layout): layout روی بچه‌ها
            // scale می‌انداخت و اسم موقع رفتن اول بزرگ می‌شد بعد محو.
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={panelMeta()[key].label}
              title={panelMeta()[key].label}
              onClick={() => setActive(key)}
              className={`dash-quick-tile rounded-dash border bg-dash-card backdrop-blur-xl${on ? " is-on" : ""}`}
            >
              <span className="dash-quick-tile-icon">{panelMeta()[key].icon}</span>
              <span className="dash-quick-tile-label" aria-hidden={!on}>{panelMeta()[key].label}</span>
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
          {current === "medications" && <DashMedicationCard />}
          {current === "chart" && <DashWeeklyChartCard refreshKey={statsRefreshKey} />}
          {current === "friends" && <DashFriendsCard />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
