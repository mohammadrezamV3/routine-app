"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, MoreVertical, Pencil, Trash2, CalendarClock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashImportanceBadge } from "./DashImportanceBadge";
import { Importance } from "@/lib/storage";
import { toEnDigits } from "@/lib/schedule";

export type DashTaskItem = { id: string; name: string; time: string; importance?: Importance; tag?: string; done: boolean; isPast?: boolean; dayPast?: boolean; notStarted?: boolean };

// بج اهمیت همیشه کنارِ اسمِ برنامه‌ست (نه زیرش). فقط کلیک روی خودِ متنِ اسمِ
// برنامه (نه کل ردیف) کارتِ واقعیِ برنامه (ProgramCard، فقط‌نمایشی) رو باز
// می‌کنه؛ سه‌نقطه یک منوی کوچیک (ویرایش/حذف) باز می‌کنه. چک‌باکس فقط برای
// «امروز» فعاله.
export function DashTaskRow({
  task,
  editable,
  onToggle,
  onOpen,
  onEdit,
  onDelete,
  onMove,
}: {
  task: DashTaskItem;
  editable: boolean;
  onToggle: (id: string) => void;
  onOpen: (name: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const btnWrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // منو با createPortal به document.body می‌ره — چون DashCard (والدِ این
  // ردیف) با backdrop-blur یه containing-block/stacking-context جدید می‌سازه،
  // یعنی z-index داخلِ خودِ همون کارت محدود می‌مونه و نمی‌تونه بالاترِ
  // کارت‌های خواهرِ بعدی (که دیرتر توی DOM میان و بدونِ این پورتال روشون
  // می‌افتاد) بیاد. با پورتال به body، این مشکلِ stacking-context کلاً حل می‌شه.
  function openMenu() {
    const rect = btnWrapRef.current?.getBoundingClientRect();
    if (rect) setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (btnWrapRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  return (
    <motion.div
      className="flex items-center gap-2 rounded-2xl px-2.5 py-3 transition-colors hover:bg-white/[0.03] sm:gap-4 sm:px-3 sm:py-3.5"
    >
      <div className="relative shrink-0" ref={btnWrapRef}>
        <button
          type="button"
          aria-label="گزینه‌های برنامه"
          onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
          className="text-dash-muted transition hover:text-dash-text"
        >
          <MoreVertical className="h-[15px] w-[15px] sm:h-[17px] sm:w-[17px]" />
        </button>
        {menuOpen && menuPos && createPortal(
          <div
            ref={menuRef}
            style={{ top: menuPos.top, right: menuPos.right }}
            className="dash-context-menu fixed z-[70] min-w-[150px] overflow-hidden rounded-2xl border border-dash-border p-1.5 shadow-[0_16px_40px_rgba(0,0,0,.5)]"
          >
            <div
              onClick={() => { setMenuOpen(false); onEdit(task.id); }}
              className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-right text-[12px] text-dash-text transition hover:bg-white/5 sm:text-[13px]"
            >
              <Pencil size={13} className="shrink-0" />
              ویرایش برنامه
            </div>
            <div
              onClick={() => { if (task.isPast) return; setMenuOpen(false); onMove(task.id); }}
              aria-disabled={task.isPast}
              title={task.isPast ? "زمانِ این برنامه گذشته — قابلِ انتقال نیست" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-right text-[12px] transition sm:text-[13px]",
                task.isPast
                  ? "cursor-not-allowed text-dash-muted opacity-45"
                  : "cursor-pointer text-dash-text hover:bg-white/5"
              )}
            >
              <CalendarClock size={13} className="shrink-0" />
              انتقال به یک روز دیگر
            </div>
            <div
              onClick={() => { if (task.isPast) return; setMenuOpen(false); onDelete(task.id); }}
              aria-disabled={task.isPast}
              title={task.isPast ? "زمانِ این برنامه گذشته — قابلِ حذف نیست" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-right text-[12px] transition sm:text-[13px]",
                task.isPast ? "cursor-not-allowed text-dash-muted opacity-45" : "cursor-pointer text-[#E05252] hover:bg-[#E05252]/10"
              )}
            >
              <Trash2 size={13} className="shrink-0" />
              حذف کامل برنامه
            </div>
          </div>,
          document.body
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 text-right sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpen(task.name)}
            className="min-w-0 truncate text-right text-[13px] font-medium text-dash-text transition hover:text-dash-green sm:text-[15px]"
          >
            {task.name}
          </button>
          {task.tag && (
            <span className="w-[48px] shrink-0 truncate rounded-full border border-dash-border bg-white/[0.03] px-1.5 py-0.5 text-center text-[9px] font-semibold text-dash-muted sm:w-[68px] sm:px-2.5 sm:py-1 sm:text-[11px]">
              {task.tag}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <DashImportanceBadge importance={task.importance} />

          <span className="shrink-0 font-mono text-[10.5px] text-dash-muted sm:text-[13px]" dir="ltr">
            {toEnDigits(task.time)}
          </span>
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.85, transition: { duration: 0.1 } }}
        disabled={!editable || task.notStarted}
        onClick={() => onToggle(task.id)}
        aria-pressed={task.done}
        title={task.notStarted ? "هنوز شروع نشده — بعد از شروعش می‌تونی تیک بزنی" : undefined}
        aria-label={
          task.done
            ? "علامت‌زدن به‌عنوان انجام‌نشده"
            : task.dayPast
            ? "این برنامه انجام نشده و روزش گذشته"
            : task.notStarted
            ? "این برنامه هنوز شروع نشده"
            : "علامت‌زدن به‌عنوان انجام‌شده"
        }
        animate={task.done ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className={cn(
          "relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors sm:h-6 sm:w-6",
          (!editable || task.notStarted) && "cursor-not-allowed opacity-50",
          task.done || (task.dayPast && !task.done) ? "text-white" : "text-transparent hover:border-white/45",
          task.dayPast && !task.done && "task-check-missed"
        )}
        style={
          task.done
            ? { background: "var(--accent)", borderColor: "var(--accent)", boxShadow: "0 0 10px rgba(var(--accent-rgb),.65)" }
            : task.dayPast
            ? { background: "#E05252", borderColor: "#E05252" }
            : { background: "transparent", borderColor: "var(--muted)" }
        }
      >
        <AnimatePresence>
          {task.done ? (
            <motion.span
              key="done"
              initial={{ scale: 0, rotate: -45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 650, damping: 26 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Check className="h-3 w-3 sm:h-[15px] sm:w-[15px]" strokeWidth={3} />
            </motion.span>
          ) : task.dayPast ? (
            <motion.span
              key="missed"
              initial={{ scale: 0, rotate: 45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 650, damping: 26 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <X className="h-3 w-3 sm:h-[15px] sm:w-[15px]" strokeWidth={3} />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}
