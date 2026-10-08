"use client";

import { AccountPageHead } from "@/components/AccountUI";
import { ExerciseSettings } from "@/components/ExerciseSettings";

// «تنظیمات › بدنسازی» — هر بخش صفحه‌ی خودش؛ فهرست بخش‌ها در /account/general
export default function ExerciseSettingsPage() {
  return (
    <section>
      <AccountPageHead title="بدنسازی" backHref="/account/general" backLabel="تنظیمات" />
      <ExerciseSettings />
    </section>
  );
}
