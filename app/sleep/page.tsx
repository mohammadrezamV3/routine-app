import type { Metadata } from "next";
import { ModuleGate } from "@/components/ModuleGate";
import { SleepHub } from "@/components/SleepHub";

// خواب صفحه و سیستم کاملا جدای خودش رو داره (درخواست صاحب محصول: با روتین در
// یک صفحه نباشه). در منو زیر گروه «روتین من». صفحه‌ی شخصیه و ایندکس نمی‌شه.
export const metadata: Metadata = {
  title: "خواب",
  robots: { index: false, follow: false },
};

export default function SleepPage() {
  return (
    <ModuleGate module="SLEEP">
      <SleepHub />
    </ModuleGate>
  );
}
