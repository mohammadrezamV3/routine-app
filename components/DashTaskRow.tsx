"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashImportanceBadge } from "./DashImportanceBadge";
import { Importance } from "@/lib/storage";

export type DashTaskItem = { id: string; name: string; time: string; importance?: Importance; done: boolean };

// بج اهمیت همیشه کنارِ اسمِ برنامه‌ست (نه زیرش). کلیک روی متنِ برنامه، کارتِ
// واقعیِ برنامه (ProgramCard، فقط‌نمایشی) رو باز می‌کنه؛ سه‌نقطه یک منوی
// کوچیک (ویرایش/حذف) باز می‌کنه. چک‌باکس فقط برای «امروز» فعاله.
export function DashTaskRow({
  task,
  editable,
  onToggle,
  onOpen,
  onEdit,
  onDelete,
}: {
  task: DashTaskItem;
  editable: boolean;
  onToggle: (id: string) => void;
  onOpen: (name: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="flex items-center gap-2 rounded-2xl px-2.5 py-3 transition-colors hover:bg-white/[0.03] sm:gap-4 sm:px-3 sm:py-3.5"
    >
      <div className="relative shrink-0">
        <button
          type="button"
          aria-label="گزینه‌های برنامه"
          onClick={() => setMenuOpen((v) => !v)}
          className="text-dash-muted transition hover:text-dash-text"
        >
          <MoreVertical size={17} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[150px] overflow-hidden rounded-2xl border border-dash-border bg-dash-card p-1.5 shadow-[0_16px_40px_rgba(0,0,0,.5)] backdrop-blur-xl">
              <div
                onClick={() => { setMenuOpen(false); onEdit(task.id); }}
                className="cursor-pointer rounded-xl px-3 py-2 text-right text-[13px] text-dash-text transition hover:bg-white/5"
              >
                ویرایش برنامه
              </div>
              <div
                onClick={() => { setMenuOpen(false); onDelete(task.id); }}
                className="cursor-pointer rounded-xl px-3 py-2 text-right text-[13px] text-[#E05252] transition hover:bg-[#E05252]/10"
              >
                حذف کامل برنامه
              </div>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => onOpen(task.name)}
        className={cn("flex min-w-0 flex-1 items-center gap-2 text-right transition-[filter] duration-300 sm:gap-3", task.done && "blur-[3px]")}
      >
        <div className="shrink-0">
          <DashImportanceBadge importance={task.importance} />
        </div>

        <div className="min-w-0 flex-1 truncate text-[14px] font-medium text-dash-text sm:text-[15px]">{task.name}</div>

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
          task.done ? "text-white" : "text-transparent hover:border-white/45"
        )}
        style={
          task.done
            ? { background: "var(--accent)", borderColor: "var(--accent)", boxShadow: "0 0 10px rgba(var(--accent-rgb),.65)" }
            : { background: "transparent", borderColor: "var(--muted)" }
        }
      >
        <Check size={15} strokeWidth={3} />
      </motion.button>
    </motion.div>
  );
}
