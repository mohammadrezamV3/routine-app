"use client";

import { Suspense } from "react";
import { AccountPageHead } from "@/components/AccountUI";
import { MentorPrivacyAccountSection } from "@/components/MentorPrivacyAccountSection";
import { tr } from "@/lib/i18n";

// «تنظیمات › دسترسی منتورها» — هر بخش صفحه‌ی خودش؛ فهرست بخش‌ها در /account/general
export default function MentorsSettingsPage() {
  return (
    <section>
      <AccountPageHead title={tr("دسترسی مربی‌ها", "Mentor access")} hint={tr("مربی فقط بخش‌هایی از روتینت را می‌بیند که این‌جا اجازه بدهی", "A mentor only sees the parts of your routine you allow here")} backHref="/account/general" backLabel={tr("تنظیمات", "Settings")} />
      <Suspense fallback={null}><MentorPrivacyAccountSection /></Suspense>
    </section>
  );
}
