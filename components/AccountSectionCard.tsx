"use client";

import { AccountBlock } from "./AccountUI";

/**
 * نگه‌داشته شده فقط به‌عنوان یک لایه‌ی نازک روی `AccountBlock` — تنظیماتِ
 * روتین و ترید (که کامپوننت‌های مستقل‌اند و جاهای دیگر هم استفاده می‌شوند)
 * همچنان با همین نام صدایش می‌زنند، ولی خروجی دقیقا همان بخشِ استانداردِ
 * پنل کاربری‌ست تا هیچ‌جا دو شکلِ متفاوت از یک چیز نباشد.
 */
export function AccountSectionCard({
  icon, title, children, index = 0,
}: { icon: React.ReactNode; title: string; children: React.ReactNode; index?: number }) {
  return (
    <AccountBlock icon={icon} title={title} index={index}>
      {children}
    </AccountBlock>
  );
}
