import type { Metadata } from "next";
import { ModuleGate } from "@/components/ModuleGate";
import { SleepHub } from "@/components/SleepHub";

// خواب بخشی از «روتین من»ه (نه یک آیتم جدا در منو): زیر /weekly با تب‌های
// «برنامه‌ها / خواب» (RoutineSectionTabs). صفحه‌ی شخصیه و ایندکس نمی‌شه.
export const metadata: Metadata = {
  title: "خواب",
  robots: { index: false, follow: false },
};

export default function RoutineSleepPage() {
  return (
    <ModuleGate module="SLEEP">
      <SleepHub />
    </ModuleGate>
  );
}
