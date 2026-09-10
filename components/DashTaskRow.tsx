"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, MoreVertical, Pencil, Play, Trash2, CalendarClock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashImportanceBadge } from "./DashImportanceBadge";
import { Importance } from "@/lib/storage";
import { toEnDigits } from "@/lib/schedule";

export type DashTaskItem = {
  id: string; name: string; time: string; importance?: Importance; tag?: string; done: boolean;
  isPast?: boolean; dayPast?: boolean; notStarted?: boolean;
  /** ردیفِ سنتتیکِ «برنامه تمرینی امروز» — بجای چک‌باکس، دکمه‌ی «شروع»
   * دارد که با کلیک هم تیک می‌خورد هم به صفحه‌ی بدنسازی می‌برد. سه‌نقطه
   * (ویرایش/انتقال/حذف) برایش نیست چون یک occurrence واقعی نیست. */
  exercise?: boolean;
};

// بج اهمیت همیشه کنار اسم برنامه‌ست (نه زیرش). فقط کلیک روی خود متن اسم
// برنامه (نه کل ردیف) کارت واقعی برنامه (ProgramCard، فقط‌نمایشی) رو باز
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
  onStart,
}: {
  task: DashTaskItem;
  editable: boolean;
  onToggle: (id: string) => void;
  onOpen: (name: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string) => void;
  onStart?: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const btnWrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // جلوگیری از باگِ تپ‌استرایک: با اولین کلیکِ «شروع» بلافاصله دکمه غیرفعال
  // می‌شود، وگرنه یک دابل‌تپِ سریع می‌توانست دوبار onStart را صدا بزند
  // (دوبار ناوبری به صفحه‌ی بدنسازی، یا رِیس روی نوشتنِ وضعیتِ تیک).
  const [starting, setStarting] = useState(false);
  // اگه onStart به هر دلیلی (خطای شبکه هنگام ثبتِ تیک) done رو true نکنه،
  // دکمه نباید برای همیشه قفل بمونه — این یعنی خودِ همون باگی که قرار بود
  // جلوش گرفته بشه، فقط برعکس (به‌جای دوبار زدن، دیگه اصلاً نمی‌شه زد).
  useEffect(() => {
    if (!starting) return;
    const t = setTimeout(() => setStarting(false), 4000);
    return () => clearTimeout(t);
  }, [starting]);

  // منو با createPortal به document.body می‌ره — چون DashCard (والد این
  // ردیف) با backdrop-blur یه containing-block/stacking-context جدید می‌سازه،
  // یعنی z-index داخل خود همون کارت محدود می‌مونه و نمی‌تونه بالاتر
  // کارت‌های خواهر بعدی (که دیرتر توی DOM میان و بدون این پورتال روشون
  // می‌افتاد) بیاد. با پورتال به body، این مشکل stacking-context کلا حل می‌شه.
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
      {/* دکمه‌ی سه‌نقطه باید دقیقا هم‌ردیف خط متن اسم برنامه بشینه. قبلا
          یه <button> inline بود که ارتفاعش از line-height خودش می‌اومد و
          مرکز آیکون چند پیکسل بالاتر از مرکز متن می‌افتاد. حالا خودش یه
          فلکس مربعی هم‌ارتفاع ردیفه، پس مرکزش دقیقا روی مرکز ردیفه. */}
      <div className="flex h-6 w-6 shrink-0 items-center sm:h-[17px] sm:w-[17px]" ref={btnWrapRef}>
        {/* ردیفِ سنتتیکِ ورزش یک occurrence واقعی نیست — ویرایش/انتقال/حذف
            روی آن معنا ندارد، پس سه‌نقطه‌اش اصلاً رندر نمی‌شود (نه فقط
            غیرفعال) تا هم‌تراز بماند ولی گمراه‌کننده نباشد. */}
        {!task.exercise && (
          <button
            type="button"
            aria-label="گزینه‌های برنامه"
            onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-transparent p-0 text-dash-muted transition hover:text-dash-text"
          >
            <MoreVertical className="h-[15px] w-[15px] sm:h-[17px] sm:w-[17px]" />
          </button>
        )}
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
              onClick={() => { setMenuOpen(false); onMove(task.id); }}
              className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-right text-[12px] text-dash-text transition hover:bg-white/5 sm:text-[13px]"
            >
              <CalendarClock size={13} className="shrink-0" />
              انتقال به یک روز دیگر
            </div>
            <div
              onClick={() => { setMenuOpen(false); onDelete(task.id); }}
              className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-right text-[12px] text-[#E05252] transition hover:bg-[#E05252]/10 sm:text-[13px]"
            >
              <Trash2 size={13} className="shrink-0" />
              حذف کامل برنامه
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* تگ باید بچسبد به *نامِ برنامه*، نه به ساعت‌ها. قبلاً کانتینرِ نام
          `flex-1` بود، پس نام تمامِ فضای خالی را می‌گرفت و تگ را هل می‌داد
          تا کنارِ ساعت — روی نامِ بلند این خیلی واضح بود. حالا نام و تگ
          به‌اندازه‌ی محتوایشان کنارِ هم می‌مانند و فضای خالی با
          justify-between بینشان و ساعت می‌افتد. */}
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 text-right sm:gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {/* ردیفِ ورزش یک ProgramCardِ واقعی برای بازکردن ندارد — نامش فقط
              متن است، نه دکمه. */}
          {task.exercise ? (
            <span className="min-w-0 truncate text-right text-[13px] font-medium text-dash-text sm:text-[15px]">
              {task.name}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onOpen(task.name)}
              className="min-w-0 truncate text-right text-[13px] font-medium text-dash-text transition hover:text-dash-green sm:text-[15px]"
            >
              {task.name}
            </button>
          )}
          {task.tag && (
            <span className="max-w-[64px] shrink-0 truncate rounded-full border border-dash-border bg-white/[0.03] px-2 py-0.5 text-center text-[9px] font-semibold text-dash-muted sm:max-w-[92px] sm:px-2.5 sm:py-1 sm:text-[11px]">
              {task.tag}
            </span>
          )}
          {/* نشانِ اهمیت هم همین‌جا کنارِ نام می‌نشیند، نه چسبیده به ساعت.
              سمتِ چپِ ردیف فقط ساعت می‌ماند. */}
          <DashImportanceBadge importance={task.importance} />
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* برنامه می‌تواند بی‌ساعت باشد («امروز ورزش دارم»). به‌جای یک جای
              خالیِ مبهم، صریح می‌گوییم بی‌ساعت است. */}
          {task.time ? (
            <span className="shrink-0 font-mono text-[10.5px] text-dash-muted sm:text-[13px]" dir="ltr">
              {toEnDigits(task.time)}
            </span>
          ) : (
            <span className="shrink-0 text-[10.5px] text-dash-muted sm:text-[12px]">بدون ساعت</span>
          )}
        </div>
      </div>

      {task.exercise && !task.done ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.94, transition: { duration: 0.1 } }}
          disabled={!editable || starting}
          onClick={() => {
            if (starting) return;
            setStarting(true);
            onStart?.(task.id);
          }}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors sm:text-[12.5px]",
            (!editable || starting) && "cursor-not-allowed opacity-60"
          )}
          style={{ background: "rgba(var(--accent-rgb),.14)", color: "var(--accent)" }}
        >
          <Play className="h-3 w-3 sm:h-[13px] sm:w-[13px]" fill="currentColor" />
          شروع
        </motion.button>
      ) : (
      <motion.button
        type="button"
        whileTap={{ scale: 0.85, transition: { duration: 0.1 } }}
        disabled={!editable}
        onClick={() => onToggle(task.id)}
        aria-pressed={task.done}
        aria-label={
          task.done
            ? "علامت‌زدن به‌عنوان انجام‌نشده"
            : task.dayPast
            ? "این برنامه انجام نشده و روزش گذشته"
            : "علامت‌زدن به‌عنوان انجام‌شده"
        }
        animate={task.done ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className={cn(
          "relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors sm:h-6 sm:w-6",
          !editable && "cursor-not-allowed opacity-50",
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
      )}
    </motion.div>
  );
}
