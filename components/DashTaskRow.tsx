"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MoreVertical, Pencil, Play, Trash2, CalendarClock } from "lucide-react";
import { TickButton } from "./TickButton";
import { cn } from "@/lib/utils";
import { useMenuPresence } from "@/lib/useMenuPresence";
import { Importance } from "@/lib/storage";
import { toEnDigits } from "@/lib/schedule";
import { tr, isEn, dirSign } from "@/lib/i18n";

export type DashTaskItem = {
  id: string; name: string; time: string; importance?: Importance; tag?: string; done: boolean;
  isPast?: boolean; dayPast?: boolean; notStarted?: boolean; isFuture?: boolean;
  /** «وقتش گذشته» و انجام نشده — روزش گذشته یا ساعت امروزش رد شده
   * (lib/schedule.ts → isTaskTimePassed). منبع ✕ و لیبل وضعیت. */
  missed?: boolean;
  /** ردیف سنتتیک «برنامه تمرینی امروز» — بجای چک‌باکس، دکمه‌ی «شروع»
   * دارد که با کلیک هم تیک می‌خورد هم به صفحه‌ی بدنسازی می‌برد. سه‌نقطه
   * (ویرایش/انتقال/حذف) برایش نیست چون یک occurrence واقعی نیست. */
  exercise?: boolean;
  /** برنامه‌ی لیستی (lib/routineChecklist.ts): آیتم‌ها با وضعیت تیک همین روز */
  items?: { id: string; name: string; done: boolean }[];
};

// تگ برنامه (اگه داشت) همیشه کنار اسم برنامه‌ست (نه زیرش). فقط کلیک روی خود متن اسم
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
  onDeleteAll,
  onMove,
  onStart,
}: {
  task: DashTaskItem;
  editable: boolean;
  /** itemId = تیک یک آیتم برنامه‌ی لیستی؛ بدونش = کل برنامه (لیستی: همه با هم) */
  onToggle: (id: string, itemId?: string) => void;
  onOpen: (name: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteAll?: (id: string) => void;
  onMove: (id: string) => void;
  onStart?: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const items = task.items ?? [];
  const isList = items.length > 0;
  const doneCount = items.filter((i) => i.done).length;
  const [expanded, setExpanded] = useState(false);
  const canTick = editable && !task.isFuture && !task.dayPast;
  const [menuPos, setMenuPos] = useState<{ top: number; x: number } | null>(null);
  // خروج نرم منو (حرکت مشترک menu-motion)
  const menuPresence = useMenuPresence(menuOpen);
  const btnWrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // جلوگیری از باگ تپ‌استرایک: با اولین کلیک «شروع» بلافاصله دکمه غیرفعال
  // می‌شود، وگرنه یک دابل‌تپ سریع می‌توانست دوبار onStart را صدا بزند
  // (دوبار ناوبری به صفحه‌ی بدنسازی، یا ریس روی نوشتن وضعیت تیک).
  const [starting, setStarting] = useState(false);
  // اگه onStart به هر دلیلی (خطای شبکه هنگام ثبت تیک) done رو true نکنه،
  // دکمه نباید برای همیشه قفل بمونه — این یعنی خود همون باگی که قرار بود
  // جلوش گرفته بشه، فقط برعکس (به‌جای دوبار زدن، دیگه اصلا نمی‌شه زد).
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
    if (rect) setMenuPos({ top: rect.bottom + 6, x: isEn() ? rect.left : window.innerWidth - rect.right });
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
    <motion.div className="rounded-2xl transition-colors hover:bg-white/[0.03]">
    <div className="flex items-center gap-2 px-2.5 py-3 sm:gap-4 sm:px-3 sm:py-3.5">
      {/* دکمه‌ی سه‌نقطه باید دقیقا هم‌ردیف خط متن اسم برنامه بشینه. قبلا
          یه <button> inline بود که ارتفاعش از line-height خودش می‌اومد و
          مرکز آیکون چند پیکسل بالاتر از مرکز متن می‌افتاد. حالا خودش یه
          فلکس مربعی هم‌ارتفاع ردیفه، پس مرکزش دقیقا روی مرکز ردیفه. */}
      <div className="flex h-6 w-6 shrink-0 items-center sm:h-[17px] sm:w-[17px]" ref={btnWrapRef}>
        {/* ردیف سنتتیک ورزش یک occurrence واقعی نیست — ویرایش/انتقال/حذف
            روی آن معنا ندارد، پس سه‌نقطه‌اش اصلا رندر نمی‌شود (نه فقط
            غیرفعال) تا هم‌تراز بماند ولی گمراه‌کننده نباشد. */}
        {!task.exercise && (
          <button
            type="button"
            aria-label={tr("گزینه‌های برنامه", "Program options")}
            onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-transparent p-0 text-dash-muted transition hover:text-dash-text"
          >
            <MoreVertical className="h-[15px] w-[15px] sm:h-[17px] sm:w-[17px]" />
          </button>
        )}
        {menuPresence.present && menuPos && createPortal(
          <div
            ref={menuRef}
            data-state={menuPresence.state}
            style={{ top: menuPos.top, [isEn() ? "left" : "right"]: menuPos.x }}
            className="mm-menu dash-context-menu fixed z-[70] min-w-[150px] overflow-hidden rounded-2xl border border-dash-border p-1.5 shadow-[0_16px_40px_rgba(0,0,0,.5)]"
          >
            <div
              onClick={() => { if (task.isPast) return; setMenuOpen(false); onEdit(task.id); }}
              aria-disabled={task.isPast}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-start text-[12px] transition sm:text-[13px]",
                task.isPast ? "cursor-not-allowed text-dash-muted opacity-50" : "cursor-pointer text-dash-text hover:bg-white/5"
              )}
            >
              <Pencil size={13} className="shrink-0" />
              {tr("ویرایش برنامه", "Edit program")}{task.isPast ? tr(" (گذشته)", " (past)") : ""}
            </div>
            <div
              onClick={() => { if (task.isPast) return; setMenuOpen(false); onMove(task.id); }}
              aria-disabled={task.isPast}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-start text-[12px] transition sm:text-[13px]",
                task.isPast ? "cursor-not-allowed text-dash-muted opacity-50" : "cursor-pointer text-dash-text hover:bg-white/5"
              )}
            >
              <CalendarClock size={13} className="shrink-0" />
              {tr("انتقال به یک روز دیگر", "Move to another day")}{task.isPast ? tr(" (گذشته)", " (past)") : ""}
            </div>
            <div
              onClick={() => { if (task.isPast) return; setMenuOpen(false); onDelete(task.id); }}
              aria-disabled={task.isPast}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-start text-[12px] transition sm:text-[13px]",
                task.isPast ? "cursor-not-allowed text-dash-muted opacity-50" : "cursor-pointer text-[#E05252] hover:bg-[#E05252]/10"
              )}
            >
              <Trash2 size={13} className="shrink-0" />
              {tr("حذف همین روز", "Delete this day")}{task.isPast ? tr(" (گذشته)", " (past)") : ""}
            </div>
            {onDeleteAll && (
              <div
                onClick={() => { if (task.isPast) return; setMenuOpen(false); onDeleteAll(task.id); }}
                aria-disabled={task.isPast}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-start text-[12px] transition sm:text-[13px]",
                  task.isPast ? "cursor-not-allowed text-dash-muted opacity-50" : "cursor-pointer text-[#E05252] hover:bg-[#E05252]/10"
                )}
              >
                <Trash2 size={13} className="shrink-0" />
                {tr("حذف همه‌ی تکرارها", "Delete all repeats")}
              </div>
            )}
          </div>,
          document.body
        )}
      </div>

      {/* تگ باید بچسبد به *نام برنامه*، نه به ساعت‌ها. قبلا کانتینر نام
          `flex-1` بود، پس نام تمام فضای خالی را می‌گرفت و تگ را هل می‌داد
          تا کنار ساعت — روی نام بلند این خیلی واضح بود. حالا نام و تگ
          به‌اندازه‌ی محتوایشان کنار هم می‌مانند و فضای خالی با
          justify-between بینشان و ساعت می‌افتد. */}
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 text-start sm:gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {/* ردیف ورزش یک ProgramCard واقعی برای بازکردن ندارد — نامش فقط
              متن است، نه دکمه. */}
          {task.exercise ? (
            <span className="min-w-0 truncate text-start text-[13px] font-medium text-dash-text sm:text-[15px]">
              {task.name}
            </span>
          ) : (
            <button
              type="button"
              // برنامه‌ی لیستی: زدن اسم لیست رو باز/بسته می‌کنه (کارت برنامه از منو هم هست)
              onClick={() => (isList ? setExpanded((v) => !v) : onOpen(task.name))}
              aria-expanded={isList ? expanded : undefined}
              className="min-w-0 truncate text-start text-[13px] font-medium text-dash-text transition hover:text-dash-green sm:text-[15px]"
            >
              {task.name}
            </button>
          )}
          {isList && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? tr("بستن لیست", "Close list") : tr("بازکردن لیست", "Open list")}
              className="checklist-chip"
            >
              <span dir="ltr">{doneCount}/{items.length}</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", expanded && "rotate-180")} />
            </button>
          )}
          {/* تگ برنامه به‌جای نشان اهمیت: بی‌پس‌زمینه، فقط بردر نازک و متن.
              برنامه‌ی بی‌تگ هیچ چیپی نمی‌گیره. اهمیت فقط برای یادآوری‌ها در
              داده می‌مونه و این‌جا نمایش داده نمی‌شه. */}
          {task.tag?.trim() && (
            <span
              title={task.tag.trim()}
              className="max-w-[72px] shrink-0 truncate whitespace-nowrap rounded-full border border-dash-border px-2 py-0.5 text-center text-[9.5px] font-semibold text-dash-muted sm:max-w-[110px] sm:px-2.5 sm:py-1 sm:text-[11px]"
            >
              {task.tag.trim()}
            </span>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {/* برنامه می‌تواند بی‌ساعت باشد («امروز ورزش دارم»). به‌جای یک جای
              خالی مبهم، صریح می‌گوییم بی‌ساعت است. */}
          {task.time ? (
            <span className="shrink-0 font-mono text-[10.5px] text-dash-muted sm:text-[13px]" dir="ltr">
              {toEnDigits(task.time)}
            </span>
          ) : (
            <span className="shrink-0 text-[10.5px] text-dash-muted sm:text-[12px]">{tr("بدون ساعت", "No time")}</span>
          )}
          {/* وضعیت برنامه، زیر ساعت و فقط متن (بی‌پس‌زمینه). ردیف ورزش
              وضعیتش را روی خود دکمه‌اش می‌گوید، این‌جا تکرار نمی‌شود.
              برای انجام‌شده‌ها دیگه زیرنویس ننمایش تا تکراری/اضافه نباشه؛
              فقط «وقتش گذشته» (انجام‌نشده و زمانش گذشته) باقی می‌مونه. */}
          {!task.exercise && task.missed && (
            <span
              className="shrink-0 text-[9.5px] font-semibold leading-none sm:text-[11px]"
              style={{ color: "#E05252" }}
            >
              {tr("وقتش گذشته", "Overdue")}
            </span>
          )}
        </div>
      </div>

      {task.exercise ? (
        // دکمه‌ی ردیف ورزش وضعیتش را خودش می‌گوید: «انجام دادی» وقتی تمرین
        // همان روز واقعا «تمام» ثبت شده (ExerciseLog.completed)، «وقتش گذشته»
        // وقتی روزش بی‌تمام‌شدن گذشته، و در غیر این صورت همان «شروع».
        task.done ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.94, transition: { duration: 0.1 } }}
            disabled={!editable || task.dayPast}
            onClick={() => { if (!task.dayPast) onStart?.(task.id); }}
            aria-label={tr("تمرین این روز انجام شده", "This day's workout is done")}
            className="flex shrink-0 items-center rounded-full px-2.5 py-1.5 text-[11px] font-bold transition-colors sm:px-3 sm:text-[12.5px]"
            style={{ background: "rgba(var(--accent-rgb),.14)", color: "var(--accent)" }}
          >
            {tr("انجام دادی", "Done")}
          </motion.button>
        ) : task.missed ? (
          <button
            type="button"
            disabled
            aria-label={tr("روز این تمرین گذشته و انجام نشده", "This workout day has passed and was not done")}
            className="flex shrink-0 cursor-not-allowed items-center rounded-full px-2.5 py-1.5 text-[11px] font-bold sm:px-3 sm:text-[12.5px]"
            style={{ background: "rgba(224,82,82,.14)", color: "#E05252" }}
          >
            {tr("وقتش گذشته", "Overdue")}
          </button>
        ) : task.isFuture ? (
          // روز آینده: هنوز قابل شروع نیست، پس «شروع» نشون داده نمی‌شه.
          <button
            type="button"
            disabled
            aria-label={tr("روز این تمرین هنوز نرسیده", "This workout day has not arrived yet")}
            className="flex shrink-0 cursor-not-allowed items-center rounded-full px-2.5 py-1.5 text-[11px] font-bold sm:px-3 sm:text-[12.5px]"
            style={{ background: "rgba(59,130,246,.14)", color: "#3B82F6" }}
          >
            {tr("وقتش نرسیده", "Not yet")}
          </button>
        ) : (
        <motion.button
          type="button"
          whileTap={{ scale: 0.94, transition: { duration: 0.1 } }}
          disabled={!editable || starting || task.isFuture || task.dayPast}
          onClick={() => {
            if (starting || task.isFuture || task.dayPast) return;
            setStarting(true);
            onStart?.(task.id);
          }}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors sm:text-[12.5px]",
            (!editable || starting || task.isFuture || task.dayPast) && "cursor-not-allowed opacity-60"
          )}
          style={{ background: "rgba(var(--accent-rgb),.14)", color: "var(--accent)" }}
        >
          <Play className="h-3 w-3 sm:h-[13px] sm:w-[13px]" fill="currentColor" />
          {tr("شروع", "Start")}
        </motion.button>
        )
      ) : (
      <TickButton
        checked={task.done}
        state={task.missed ? "missed" : "idle"}
        size={24}
        disabled={!canTick}
        onToggle={() => onToggle(task.id)}
        label={
          task.isFuture
            ? tr("این برنامه هنوز نرسیده — قابل تیک‌زدن نیست", "This program has not arrived yet — cannot be ticked")
            : isList
            ? task.done ? tr("برداشتن تیک همه‌ی آیتم‌ها", "Untick all items") : tr("تیک‌زدن همه‌ی آیتم‌ها", "Tick all items")
            : task.done
            ? tr("انجام دادی — علامت‌زدن به‌عنوان انجام‌نشده", "Done — mark as not done")
            : task.missed
            ? tr("وقتش گذشته — علامت‌زدن به‌عنوان انجام‌شده", "Overdue — mark as done")
            : tr("علامت‌زدن به‌عنوان انجام‌شده", "Mark as done")
        }
      />
      )}
    </div>

    {/* لیست آیتم‌ها — هرکدوم همون تیک داشبورد؛ تیک بالا (عنوان) همه رو با هم می‌زنه */}
    <AnimatePresence initial={false}>
      {isList && expanded && (
        <motion.ul
          key="items"
          className="checklist-items"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {items.map((it, i) => (
            <motion.li
              key={it.id}
              className={cn("checklist-item", it.done && "is-done")}
              initial={{ opacity: 0, x: -dirSign() * 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.25 }}
            >
              <span className="checklist-item-name">{it.name}</span>
              <TickButton
                checked={it.done}
                size={20}
                disabled={!canTick}
                onToggle={() => onToggle(task.id, it.id)}
                label={`${it.done ? tr("برداشتن تیک", "Untick") : tr("تیک‌زدن", "Tick")} ${it.name}`}
              />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </AnimatePresence>
    </motion.div>
  );
}
