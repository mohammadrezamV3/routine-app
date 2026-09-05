"use client";

/**
 * دایره‌ی لودینگِ مشترکِ اپ.
 *
 * قبلاً هر جا لودینگ داشتیم یا فقط متنِ «در حال بارگذاری…» بود یا یک
 * اسپینرِ inline که همان‌جا دوباره ساخته شده بود. درخواستِ صریحِ کاربر بود
 * که «هر جا چیزی لودینگ رفت، دایره‌ی لودینگ بیاد» — پس یک کامپوننتِ واحد
 * که همه‌جا یک شکل باشد.
 */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      className={className ? `app-spinner ${className}` : "app-spinner"}
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 8)) }}
      aria-hidden="true"
    />
  );
}

/** لودینگِ وسط‌چینِ یک بخش — دایره + متنِ اختیاری. */
export function LoadingBlock({ text = "در حال بارگذاری…", size = 22 }: { text?: string; size?: number }) {
  return (
    <div className="app-loading-block" role="status">
      <Spinner size={size} />
      <span>{text}</span>
    </div>
  );
}
