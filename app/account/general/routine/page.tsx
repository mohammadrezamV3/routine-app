"use client";

import { AccountPageHead } from "@/components/AccountUI";
import { RoutineSettings } from "@/components/RoutineSettings";

// «تنظیمات › روتین» — هر بخش صفحه‌ی خودش؛ فهرست بخش‌ها در /account/general
export default function RoutineSettingsPage() {
  return (
    <section>
      <AccountPageHead title="روتین" backHref="/account/general" backLabel="تنظیمات" />
      <RoutineSettings />
    </section>
  );
}
