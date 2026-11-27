"use client";

import { AccountPageHead } from "@/components/AccountUI";
import { DataExportPanel } from "@/components/DataExportPanel";
import { tr } from "@/lib/i18n";

// «تنظیمات › خروجی داده‌ها» — فایل CSV یا JSON از داده‌های خودت
export default function DataExportPage() {
  return (
    <section>
      <AccountPageHead title={tr("خروجی داده‌ها", "Data export")} backHref="/account/general" backLabel={tr("تنظیمات", "Settings")} />
      <DataExportPanel />
    </section>
  );
}
