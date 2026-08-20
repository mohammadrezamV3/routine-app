"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashCard } from "./DashCard";
import { getImportantUpcoming, ImportantOccurrence } from "@/lib/routineStats";
import { WEEK_ORDER, toEnDigits } from "@/lib/schedule";
import { getCustomOccurrences, setCustomOccurrences } from "@/lib/storage";
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications";

// برنامه‌های «خیلی زیاد»/«زیاد»ِ همین هفته — واقعاً از customOccurrences
// (با تگِ اهمیتی که موقع افزودن/ویرایش برنامه انتخاب می‌شه) فیلتر می‌شه،
// دیگه یادآوریِ mock نیست. عمداً هیچ‌جای این کارت کلیک‌پذیر برای بازکردنِ
// ProgramCard نیست — تنها تعاملِ ممکن روی هر ردیف، زنگوله‌ست: «این برنامه
// ۳۰ دقیقه قبل شروعش بهم اطلاع بده» — اگه اجازه‌ی نوتیف مرورگر هنوز گرفته
// نشده باشه همینجا درخواستش می‌ره (خودِ یادآوری واقعی توسط NotificationEngine
// و ۳۰ دقیقه مونده به شروع فرستاده می‌شه).
export function DashReminderCard({ delay }: { delay?: number }) {
  const [items, setItems] = useState<ImportantOccurrence[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // `typeof document !== "undefined"` جواب می‌ده true حتی توی همون رندرِ اولِ
  // کلاینت که برای هیدریشن استفاده می‌شه (چون document موقعِ اجرای جاوااسکریپتِ
  // مرورگر از قبل وجود داره) — درحالی‌که سمتِ سرور همیشه false بوده؛ همین
  // اختلاف باعثِ ارورِ هیدریشن می‌شد. با یه state که فقط توی useEffect (بعدِ
  // هیدریشن) true می‌شه، رندرِ اولِ سرور و کلاینت هر دو false می‌مونن.
  const [mounted, setMounted] = useState(false);

  useEffect(() => { getImportantUpcoming().then(setItems); }, []);
  useEffect(() => { setMounted(true); }, []);

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
      {mounted && createPortal(
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
        <h2 className="text-[13px] font-bold text-dash-text sm:text-[15px]">یادآوری‌ها</h2>

        <div className="no-scrollbar mt-3 flex max-h-[300px] flex-col gap-2 overflow-y-auto sm:mt-4 sm:max-h-[360px] sm:gap-2.5">
          {items === null ? (
            <div className="text-[11px] text-dash-muted sm:text-[12px]">در حال بارگذاری…</div>
          ) : list.length === 0 ? (
            <div className="text-[11px] text-dash-muted sm:text-[12px]">
              برنامه‌ای با تگ «خیلی زیاد» یا «زیاد» توی این هفته ثبت نشده.
            </div>
          ) : (
            list.map((r) => {
              const dayName = WEEK_ORDER.find((w) => w.jsDay === r.jsDay)?.name ?? "";
              return (
                <div
                  key={`${r.id}-${r.jsDay}`}
                  className="flex min-h-[64px] items-center justify-between gap-2.5 rounded-2xl border border-dash-border bg-white/[0.02] px-3 py-2.5 text-right sm:min-h-[74px] sm:gap-3 sm:px-3.5 sm:py-3"
                >
                  <div className="min-w-0 flex-1 text-right">
                    <div className="truncate text-[11.5px] font-semibold text-dash-text sm:text-[13.5px]">{r.name}</div>
                    <div className="mt-1 flex items-center gap-1.5 truncate text-[9.5px] text-dash-muted sm:text-[11.5px]">
                      <span className="truncate">{dayName}</span>
                      <span className="mono shrink-0" dir="ltr">{toEnDigits(r.time)}</span>
                    </div>
                  </div>
                  <span
                    role="button"
                    aria-label={r.notify ? `خاموش‌کردنِ یادآوریِ ${r.name}` : `روشن‌کردنِ یادآوریِ ${r.name}`}
                    onClick={(e) => handleBellClick(e, r)}
                    className={cn(
                      "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-xl transition hover:brightness-125 sm:h-9 sm:w-9",
                      r.notify
                        ? r.importance === "veryHigh" ? "bg-dash-green/25 text-dash-green" : "bg-dash-green/15 text-dash-green"
                        : "bg-white/5 text-dash-muted"
                    )}
                  >
                    <Bell className="h-[13px] w-[13px] sm:h-[15px] sm:w-[15px]" fill={r.notify ? "currentColor" : "none"} />
                  </span>
                </div>
              );
            })
          )}
        </div>
      </DashCard>
    </>
  );
}
