"use client";

import { AccountPageHead } from "@/components/AccountUI";
import { RoutineSettings } from "@/components/RoutineSettings";
import { tr } from "@/lib/i18n";

// «تنظیمات › روتین» — هر بخش صفحه‌ی خودش؛ فهرست بخش‌ها در /account/general
export default function RoutineSettingsPage() {
  return (
    <section>
      <AccountPageHead title={tr("روتین", "Routine")} backHref="/account/general" backLabel={tr("تنظیمات", "Settings")} />
      <RoutineSettings />
    </section>
  );
}
