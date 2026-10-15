"use client";

import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n";

/**
 * دایره‌ی لودینگ مشترک اپ، به سبک تلگرام: یک کمان نازک با سر گرد، بدون
 * ریل، که می‌چرخد و هم‌زمان طولش نرم بلند و کوتاه می‌شود. رنگ از
 * currentColor میاد تا داخل هر دکمه/تمی رنگ متن همون‌جا رو بگیره.
 *
 * همه‌ی لودینگ‌های داخل دکمه/خط/بخش از همین کامپوننت استفاده می‌کنند؛
 * فقط لودینگ تمام‌صفحه (PageLoader/BootSplash/RouteProgress) جداست.
 *
 * هندسه: شعاع کمان همیشه 10 واحد است (محیط ثابت ~62.8 تا keyframes
 * طول خط در globals.css با عدد ثابت کار کنه) و viewBox به‌اندازه‌ی ضخامت
 * خط بزرگ‌تر می‌شه، پس لبه‌ی بیرونی حلقه تقریبا دقیقا `size` پیکسل است
 * و ضخامت خط به پیکسل با اندازه مقیاس می‌گیره (نازک، مثل تلگرام).
 */
export function Spinner({
  size = 16,
  className,
  label = tr("در حال بارگذاری", "Loading"),
}: {
  size?: number;
  className?: string;
  /** متن دسترس‌پذیری؛ null یعنی تزئینی (aria-hidden) — وقتی والد خودش status/label دارد. */
  label?: string | null;
}) {
  const strokePx = Math.min(3, Math.max(1.5, size / 9.5));
  const sw = (21 * strokePx) / Math.max(size - strokePx, 1); // ضخامت به واحد viewBox
  const box = 21 + sw;
  const c = box / 2;
  const a11y = label === null ? { "aria-hidden": true as const } : { role: "status", "aria-label": label };
  return (
    <svg
      className={cn("tg-spinner", className)}
      width={size}
      height={size}
      viewBox={`0 0 ${box} ${box}`}
      fill="none"
      {...a11y}
    >
      <circle className="tg-spinner-arc" cx={c} cy={c} r="10" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
    </svg>
  );
}

/** لودینگ وسط‌چین یک بخش — طبق درخواست صریح، دیگر متنی کنارش نیست. */
export function LoadingBlock({ size = 22 }: { size?: number }) {
  return (
    <div className="app-loading-block" role="status" aria-label={tr("در حال بارگذاری", "Loading")}>
      <Spinner size={size} label={null} />
    </div>
  );
}
