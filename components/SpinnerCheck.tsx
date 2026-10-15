"use client";

import { Spinner } from "./Spinner";
import { tr } from "@/lib/i18n";

/**
 * دایره‌ی لودینگ که با `done` به تیک تبدیل می‌شه: دایره دورش بسته می‌شه و
 * تیک با stroke-dashoffset کشیده می‌شه (فقط SVG، بدون بک‌گراند). برای دکمه‌ی
 * ورود — جای متن «در حال ورود…».
 */
export function SpinnerCheck({ done, size = 20 }: { done: boolean; size?: number }) {
  if (!done) return <Spinner size={size} />;
  return (
    <svg className="spinner-check" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label={tr("ورود موفق", "Logged in")} role="img">
      <circle className="spinner-check-ring" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" />
      <path className="spinner-check-mark" d="M7 12.5l3.2 3.2L17 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
