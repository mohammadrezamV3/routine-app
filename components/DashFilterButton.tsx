"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// دکمه‌ی پیل‌مانندِ فیلتر (امروز/این‌هفته/فیلتر) — همون قاعده‌ی رنگ فعال/غیرفعالِ
// عمومیِ داشبورد: فعال سبزِ پر با گلو، غیرفعال شیشه‌ای تیره.
export function DashFilterButton({
  label,
  icon,
  active = false,
  onClick,
}: {
  label: string;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-dash border px-3 py-2 text-[12px] font-semibold transition sm:px-4 sm:py-2.5 sm:text-[13px]",
        active
          ? "border-dash-green/40 bg-dash-green text-dash-bg shadow-[0_0_18px_rgba(46,230,107,.3)]"
          : "border-dash-border bg-dash-card text-dash-muted hover:border-white/10 hover:text-dash-text"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
