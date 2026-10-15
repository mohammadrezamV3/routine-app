"use client";

import { AccountPageHead } from "@/components/AccountUI";
import { ExerciseSettings } from "@/components/ExerciseSettings";
import { tr } from "@/lib/i18n";

// «تنظیمات › بدنسازی» — هر بخش صفحه‌ی خودش؛ فهرست بخش‌ها در /account/general
export default function ExerciseSettingsPage() {
  return (
    <section>
      <AccountPageHead title={tr("بدنسازی", "Workout")} backHref="/account/general" backLabel={tr("تنظیمات", "Settings")} />
      <ExerciseSettings />
    </section>
  );
}
