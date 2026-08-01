"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashCard } from "./DashCard";
import { getImportantThisWeek, ImportantOccurrence } from "@/lib/routineStats";
import { WEEK_ORDER } from "@/lib/schedule";
import { getCustomOccurrences, setCustomOccurrences } from "@/lib/storage";
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications";

// برنامه‌های «خیلی زیاد»/«زیاد»ِ همین هفته — واقعاً از customOccurrences
// (با تگِ اهمیتی که موقع افزودن/ویرایش برنامه انتخاب می‌شه) فیلتر می‌شه،
// دیگه یادآوریِ mock نیست. کلیک روی هر ردیف همون برنامه رو باز می‌کنه؛ کلیک
// روی زنگوله یعنی «این برنامه ۳۰ دقیقه قبل شروعش بهم اطلاع بده» — اگه اجازه‌ی
// نوتیف مرورگر هنوز گرفته نشده باشه همینجا درخواستش می‌ره (خودِ یادآوری واقعی
// توسط NotificationEngine و ۳۰ دقیقه مونده به شروع فرستاده می‌شه).
export function DashReminderCard({ delay, onOpenProgram }: { delay?: number; onOpenProgram?: (name: string) => void }) {
  const [items, setItems] = useState<ImportantOccurrence[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { getImportantThisWeek().then(setItems); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleBellClick(e: React.MouseEvent, occ: ImportantOccurrence) {
    e.stopPropagation();
    const nextNotify = !occ.notify;
    if (nextNotify && getNotificationPermission() !== "granted") await requestNotificationPermission();

    setItems((prev) => prev && prev.map((it) => (it.id === occ.id ? { ...it, notify: nextNotify } : it)));
    const all = await getCustomOccurrences();
    await setCustomOccurrences(all.map((c) => (c.id === occ.id ? { ...c, notify: nextNotify } : c)));

    setToast(
      nextNotify
        ? `نیم‌ساعت قبل از شروعِ «${occ.name}» بهت اطلاع داده می‌شه.`
        : `دیگه برای «${occ.name}» یادآوری نمی‌شه.`
    );
  }

  const list = items ?? [];

  return (
    <>
      {typeof document !== "undefined" && createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="pointer-events-auto rounded-2xl border border-dash-border bg-dash-card px-4 py-2.5 text-[12.5px] font-medium text-dash-text shadow-[0_16px_40px_rgba(0,0,0,.45)] backdrop-blur-xl sm:text-[13px]"
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body
      )}

      <DashCard delay={delay}>
        <h2 className="text-[14px] font-bold text-dash-text sm:text-[15px]">یادآوری‌ها</h2>

        <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:gap-2.5">
          {items === null ? (
            <div className="text-[12px] text-dash-muted">در حال بارگذاری…</div>
          ) : list.length === 0 ? (
            <div className="text-[12px] text-dash-muted">
              برنامه‌ای با تگ «خیلی زیاد» یا «زیاد» توی این هفته ثبت نشده.
            </div>
          ) : (
            list.map((r) => {
              const dayName = WEEK_ORDER.find((w) => w.jsDay === r.jsDay)?.name ?? "";
              return (
                <button
                  type="button"
                  key={`${r.id}-${r.jsDay}`}
                  onClick={() => onOpenProgram?.(r.name)}
                  className="flex items-center justify-between gap-2.5 rounded-2xl border border-dash-border bg-white/[0.02] px-3 py-2.5 text-right transition hover:border-white/10 sm:gap-3 sm:px-3.5 sm:py-3"
                >
                  <div className="min-w-0 flex-1 text-right">
                    <div className="truncate text-[12.5px] font-semibold text-dash-text sm:text-[13.5px]">{r.name}</div>
                    <div className="mt-0.5 text-[10.5px] text-dash-muted sm:text-[11.5px]">
                      {dayName} — {r.time}
                    </div>
                  </div>
                  <span
                    role="button"
                    aria-label={r.notify ? `خاموش‌کردنِ یادآوریِ ${r.name}` : `روشن‌کردنِ یادآوریِ ${r.name}`}
                    onClick={(e) => handleBellClick(e, r)}
                    className={cn(
                      "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl transition hover:brightness-125 sm:h-9 sm:w-9",
                      r.notify
                        ? r.importance === "veryHigh" ? "bg-dash-green/25 text-dash-green" : "bg-dash-green/15 text-dash-green"
                        : "bg-white/5 text-dash-muted"
                    )}
                  >
                    {r.notify ? <Bell size={15} /> : <BellOff size={15} />}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </DashCard>
    </>
  );
}
