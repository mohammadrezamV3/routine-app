"use client";

import { AccountPageHead } from "@/components/AccountUI";
import { TradeSettings } from "@/components/TradeSettings";
import { tr } from "@/lib/i18n";

// «تنظیمات › ترید» — هر بخش صفحه‌ی خودش؛ فهرست بخش‌ها در /account/general
export default function TradeSettingsPage() {
  return (
    <section>
      <AccountPageHead title={tr("ترید", "Trading")} backHref="/account/general" backLabel={tr("تنظیمات", "Settings")} />
      <TradeSettings />
    </section>
  );
}
