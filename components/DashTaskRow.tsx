"use client";

import { motion } from "framer-motion";
import { Check, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashImportanceBadge } from "./DashImportanceBadge";
import { Importance } from "@/lib/storage";

export type DashTaskItem = { id: string; name: string; time: string; importance?: Importance; done: boolean };

// موبایل: بج اهمیت زیر اسم برنامه می‌ره (نه کنارش) تا اسم عرضِ کامل ردیف رو
// داشته باشه. کلیک روی متنِ برنامه، همون کارت واقعیِ برنامه (ProgramCard) رو
// باز می‌کنه. چک‌باکس فقط برای «امروز» فعاله (روزهای دیگه فقط نمایشیه).
export function DashTaskRow({
  task,
  editable,
  onToggle,
  onOpen,
}: {
  task: DashTaskItem;
  editable: boolean;
  onToggle: (id: string) => void;
  onOpen: (name: string) => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="flex items-center gap-2 rounded-2xl px-2.5 py-3 transition-colors hover:bg-white/[0.03] sm:gap-4 sm:px-3 sm:py-3.5"
    >
      <button type="button" aria-label="جزئیات برنامه" onClick={() => onOpen(task.name)} className="shrink-0 text-dash-muted transition hover:text-dash-text">
        <MoreVertical size={17} />
      </button>

      <button
        type="button"
        onClick={() => onOpen(task.name)}
        className={cn("flex min-w-0 flex-1 items-center gap-2 text-right transition-[filter] duration-300 sm:gap-4", task.done && "blur-[3px]")}
      >
        <div className="hidden shrink-0 sm:block">
          <DashImportanceBadge importance={task.importance} />
        </div>

        <div className="min-w-0 flex-1 text-right">
          <div className="truncate text-[14px] font-medium text-dash-text sm:text-[15px]">{task.name}</div>
          <div className="mt-1 sm:hidden">
            <DashImportanceBadge importance={task.importance} />
          </div>
        </div>

        <span className="shrink-0 font-mono text-[11.5px] text-dash-muted sm:text-[13px]" dir="ltr">
          {task.time}
        </span>
      </button>

      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        disabled={!editable}
        onClick={() => onToggle(task.id)}
        aria-pressed={task.done}
        aria-label={task.done ? "علامت‌زدن به‌عنوان انجام‌نشده" : "علامت‌زدن به‌عنوان انجام‌شده"}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition",
          !editable && "cursor-not-allowed opacity-50",
          task.done ? "text-white" : "border-white/30 bg-transparent text-transparent hover:border-white/45"
        )}
        style={
          task.done
            ? { background: "var(--accent)", borderColor: "var(--accent)", boxShadow: "0 0 10px rgba(var(--accent-rgb),.65)" }
            : undefined
        }
      >
        <Check size={15} strokeWidth={3} />
      </motion.button>
    </motion.div>
  );
}
