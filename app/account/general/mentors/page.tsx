"use client";

import { Suspense } from "react";
import { AccountPageHead } from "@/components/AccountUI";
import { MentorPrivacyAccountSection } from "@/components/MentorPrivacyAccountSection";

// «تنظیمات › دسترسی منتورها» — هر بخش صفحه‌ی خودش؛ فهرست بخش‌ها در /account/general
export default function MentorsSettingsPage() {
  return (
    <section>
      <AccountPageHead title="دسترسی مربی‌ها" hint="مربی فقط بخش‌هایی از روتینت را می‌بیند که این‌جا اجازه بدهی" backHref="/account/general" backLabel="تنظیمات" />
      <Suspense fallback={null}><MentorPrivacyAccountSection /></Suspense>
    </section>
  );
}
