"use client";

import type { ReactNode } from "react";

/**
 * سطح قابل‌زدن (کارت/ردیف) که button واقعی نیست: ریست شیشه‌ای سراسری button{} و هاور اکسنتش
 * بک‌گراند کارت و ردیف‌های ch-* رو خراب می‌کنه. نقش و کیبورد (Enter/Space) رو خودش می‌ده.
 */
export function CoachPress({ onPress, className, children, label }: { onPress: () => void; className?: string; children: ReactNode; label?: string }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={className}
      aria-label={label}
      onClick={onPress}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPress(); }
      }}
    >
      {children}
    </div>
  );
}
