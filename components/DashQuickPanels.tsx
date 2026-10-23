"use client";

import { useMemo } from "react";
import { Bell, Tablets, BarChart3, Users } from "lucide-react";
import { DashReminderCard } from "./DashReminderCard";
import { DashMedicationCard } from "./DashMedicationCard";
import { DashFriendsCard } from "./DashFriendsCard";
import { DashWeeklyChartCard } from "./DashWeeklyChartCard";
import { QuickPanels, type QuickPanelItem } from "./QuickPanels";
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

  const meta = panelMeta();
  const items: QuickPanelItem[] = enabled.map((key) => ({
    key,
    label: meta[key].label,
    icon: meta[key].icon,
    render: () => {
      if (key === "reminders") return <DashReminderCard />;
      if (key === "medications") return <DashMedicationCard />;
      if (key === "chart") return <DashWeeklyChartCard refreshKey={statsRefreshKey} />;
      return <DashFriendsCard />;
    },
  }));

  return <QuickPanels items={items} ariaLabel={tr("بخش‌های روتین", "Routine sections")} />;
}
