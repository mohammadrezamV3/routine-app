"use client";

import { AccountPageHead } from "@/components/AccountUI";
import { NotificationSettings } from "@/components/NotificationSettings";
import { tr } from "@/lib/i18n";

// «تنظیمات › اعلان‌ها» — هر بخش صفحه‌ی خودش؛ فهرست بخش‌ها در /account/general
export default function NotificationsSettingsPage() {
  return (
    <section>
      <AccountPageHead title={tr("اعلان‌ها", "Notifications")} backHref="/account/general" backLabel={tr("تنظیمات", "Settings")} />
      <NotificationSettings index={0} />
    </section>
  );
}
