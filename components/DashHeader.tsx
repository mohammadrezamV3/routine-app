"use client";

import { motion } from "framer-motion";
import { DashProgressCircle } from "./DashProgressCircle";

// هدرِ صفحه‌ی داشبورد — عنوان + زیرعنوان، به‌همراه حلقه‌ی پیشرفتِ امروز که
// دورترین عنصر سمت راست صفحه‌ست (دقیقاً طبق طرح). دیگه کنترل «نمای جدول/
// نمای لیست» بالای این هدر نیست، پس صفحه مستقیماً از همین‌جا شروع می‌شه.
export function DashHeader({ progress = 75 }: { progress?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col-reverse items-center gap-3 text-center sm:flex-row sm:items-start sm:justify-start sm:gap-8 sm:text-right"
    >
      <div className="flex flex-col items-center gap-1">
        <span className="sm:hidden">
          <DashProgressCircle value={progress} size={60} strokeWidth={5} />
        </span>
        <span className="hidden sm:inline-block">
          <DashProgressCircle value={progress} size={72} strokeWidth={6} />
        </span>
        <span className="whitespace-nowrap text-[10px] text-dash-muted sm:text-[11px]">پیشرفت امروز</span>
      </div>
      <div>
        <h1 className="text-[21px] font-bold text-dash-text sm:text-[32px]">روتین من</h1>
        <p className="mt-1 text-[12px] text-dash-muted sm:mt-1.5 sm:text-[14px]">
          برنامه‌های روزانه خود را مدیریت و پیگیری کنید.
        </p>
      </div>
    </motion.div>
  );
}
