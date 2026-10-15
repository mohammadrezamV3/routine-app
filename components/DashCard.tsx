"use client";

import { ReactNode } from "react";
import { m as motion } from "framer-motion";
import { cn } from "@/lib/utils";

// قاب کارت عمومی داشبورد — رادیوس/بوردر/بک‌گراند یکسان برای همه‌ی
// کارت‌های سایدبار و کارت اصلی، با انیمیشن fade-up موقع لود.
export function DashCard({ children, className, delay = 0, label, dataCard }: { children: ReactNode; className?: string; delay?: number; label?: string; dataCard?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut", delay }}
      aria-label={label}
      data-card={dataCard}
      className={cn(
        "rounded-dash border border-dash-border bg-dash-card backdrop-blur-xl",
        // پدینگ پیش‌فرض فقط وقتی کاربر خودش p-* / sm:p-* نداده (جایگزین tailwind-merge)
        !/(^|\s)p-/.test(className ?? "") && "p-3.5",
        !/(^|\s)sm:p-/.test(className ?? "") && "sm:p-5",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
