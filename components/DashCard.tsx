"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// قابِ کارتِ عمومیِ داشبورد — رادیوس/بوردر/بک‌گراند یکسان برای همه‌ی
// کارت‌های سایدبار و کارتِ اصلی، با انیمیشنِ fade-up موقع لود.
export function DashCard({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut", delay }}
      className={cn(
        "rounded-dash border border-dash-border bg-dash-card p-3.5 transition-[border-color,box-shadow] duration-300 hover:border-[rgba(var(--accent-rgb),.3)] hover:shadow-[0_8px_28px_rgba(0,0,0,.28)] sm:p-5",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
