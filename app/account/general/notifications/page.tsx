"use client";

import { AccountPageHead } from "@/components/AccountUI";
import { NotificationSettings } from "@/components/NotificationSettings";

// «تنظیمات › اعلان‌ها» — هر بخش صفحه‌ی خودش؛ فهرست بخش‌ها در /account/general
export default function NotificationsSettingsPage() {
  return (
    <section>
      <AccountPageHead title="اعلان‌ها" backHref="/account/general" backLabel="تنظیمات" />
      <NotificationSettings index={0} />
    </section>
  );
}
