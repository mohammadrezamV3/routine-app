"use client";

import { AccountPageHead } from "@/components/AccountUI";
import { TradeSettings } from "@/components/TradeSettings";

// «تنظیمات › ترید» — هر بخش صفحه‌ی خودش؛ فهرست بخش‌ها در /account/general
export default function TradeSettingsPage() {
  return (
    <section>
      <AccountPageHead title="ترید" backHref="/account/general" backLabel="تنظیمات" />
      <TradeSettings />
    </section>
  );
}
