"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// دکمه‌ی پیل‌مانند فیلتر (امروز/این‌هفته/فیلتر) — همون قاعده‌ی رنگ فعال/غیرفعال
// عمومی داشبورد: فعال سبز پر با گلو، غیرفعال شیشه‌ای تیره.
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
        "flex shrink-0 items-center gap-1 rounded-dash border px-2.5 py-1.5 text-[11px] font-semibold transition sm:gap-1.5 sm:px-4 sm:py-2.5 sm:text-[13px]",
        active ? "text-dash-bg" : "border-dash-border bg-dash-card text-dash-muted hover:border-white/10 hover:text-dash-text"
      )}
      style={
        active
          ? { background: "var(--accent)", borderColor: "rgba(var(--accent-rgb),.4)", boxShadow: "0 0 8px rgba(var(--accent-rgb),.25)" }
          : undefined
      }
    >
      {icon}
      {label}
    </button>
  );
}
