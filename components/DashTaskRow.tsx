"use client";

import { motion } from "framer-motion";
import { Check, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashCategoryBadge } from "./DashCategoryBadge";
import { DashTask } from "@/lib/dashboardMockData";

// موبایل: بج دسته زیر اسم برنامه می‌ره (نه کنارش) تا اسم عرضِ کامل ردیف رو
// داشته باشه و بی‌جهت بریده نشه؛ دسکتاپ همون آرایشِ تک‌خطیِ اصلی می‌مونه.
// وقتی چک‌باکس زده بشه، محتوای ردیف (بج/اسم/ساعت) بلور می‌شه — خودِ
// چک‌باکس واضح می‌مونه تا هنوز قابل‌لمس/دیدن باشه.
export function DashTaskRow({
  task,
  onToggle,
}: {
  task: DashTask;
  onToggle: (id: string) => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="flex items-center gap-2 rounded-2xl px-2.5 py-3 transition-colors hover:bg-white/[0.03] sm:gap-4 sm:px-3 sm:py-3.5"
    >
      <button type="button" aria-label="گزینه‌های بیشتر" className="shrink-0 text-dash-muted transition hover:text-dash-text">
        <MoreVertical size={17} />
      </button>

      <div className={cn("flex min-w-0 flex-1 items-center gap-2 transition-[filter] duration-300 sm:gap-4", task.done && "pointer-events-none blur-[3px]")}>
        <div className="hidden shrink-0 sm:block">
          <DashCategoryBadge category={task.category} />
        </div>

        <div className="min-w-0 flex-1 text-right">
          <div className="truncate text-[14px] font-medium text-dash-text sm:text-[15px]">{task.title}</div>
          <div className="mt-1 sm:hidden">
            <DashCategoryBadge category={task.category} />
          </div>
        </div>

        <span className="shrink-0 font-mono text-[11.5px] text-dash-muted sm:text-[13px]" dir="ltr">
          {task.startTime} - {task.endTime}
        </span>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={() => onToggle(task.id)}
        aria-pressed={task.done}
        aria-label={task.done ? "علامت‌زدن به‌عنوان انجام‌نشده" : "علامت‌زدن به‌عنوان انجام‌شده"}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition",
          task.done
            ? "border-dash-green bg-dash-green text-white shadow-[0_0_10px_rgba(46,230,107,.65)]"
            : "border-white/30 bg-transparent text-transparent hover:border-white/45"
        )}
      >
        <Check size={15} strokeWidth={3} />
      </motion.button>
    </motion.div>
  );
}
