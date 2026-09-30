import type { Metadata } from "next";
import { ModuleGate } from "@/components/ModuleGate";
import { SleepPanel } from "@/components/SleepPanel";

// صفحه‌ی شخصیه، پس ایندکس نمی‌شه (هم‌الگوی /dashboard و بقیه‌ی صفحه‌های حساب).
export const metadata: Metadata = {
  title: "خواب",
  robots: { index: false, follow: false },
};

export default function SleepPage() {
  return (
    <ModuleGate module="SLEEP">
      <SleepPanel />
    </ModuleGate>
  );
}
