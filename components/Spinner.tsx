"use client";

import { QuarterRing } from "./QuarterRing";

/**
 * دایره‌ی لودینگِ مشترکِ اپ.
 *
 * قبلاً هر جا لودینگ داشتیم یا فقط متنِ «در حال بارگذاری…» بود یا یک
 * اسپینرِ inline که همان‌جا دوباره ساخته شده بود. درخواستِ صریحِ کاربر بود
 * که «هر جا چیزی لودینگ رفت، دایره‌ی لودینگ بیاد، بدون هیچ متنِ دیگری» —
 * پس همه از همین یک کامپوننت (که خودش از QuarterRing استفاده می‌کند)
 * استفاده می‌کنند.
 */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <QuarterRing
      className={className}
      style={{ width: size, height: size, borderTopWidth: Math.max(2, Math.round(size / 8)), borderRightWidth: Math.max(2, Math.round(size / 8)) }}
    />
  );
}

/** لودینگِ وسط‌چینِ یک بخش — طبقِ درخواستِ صریح، دیگر متنی کنارش نیست. */
export function LoadingBlock({ size = 22 }: { size?: number }) {
  return (
    <div className="app-loading-block" role="status">
      <Spinner size={size} />
    </div>
  );
}
