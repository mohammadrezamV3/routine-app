"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ListChecks } from "lucide-react";
import { DashCard } from "./DashCard";
import dynamic from "next/dynamic";
import { tr } from "@/lib/i18n";

// این مودال کل EXERCISE_CATALOG (~۸۵KB سورس) رو import می‌کنه، ولی فقط وقتی
// کاربر روی «مشاهده حرکات» بزنه رندر می‌شه. بدون dynamic، اون حجم توی باندل
// خود صفحه‌ی /exercise می‌نشست و برای *هر* بازدیدکننده دانلود می‌شد — حتی
// کسی که هیچ‌وقت این دکمه رو نمی‌زنه. ssr:false چون فقط با کلیک باز می‌شه و
// هیچ‌وقت بخشی از HTML اول سرور نیست.
const ExerciseCatalogModal = dynamic(
  () => import("./ExerciseCatalogModal").then((m) => m.ExerciseCatalogModal),
  { ssr: false }
);

// «مشاهده حرکات» — ستون وسط داشبورد (هم‌جای DashReminderCard توی روتین)،
// فقط یک دکمه‌ی وسط‌چین که کاتالوگ کامل حرکات رو باز می‌کنه — بدون
// پیش‌نمایش لیست.
export function ExerciseCatalogCard({ delay, compact = false, open: controlledOpen, onOpenChange }: { delay?: number; compact?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [inner, setInner] = useState(false);
  // کنترل‌شده از بیرون (باکس «حرکات» داشبورد ورزش) یا مستقل مثل قبل
  const open = controlledOpen ?? inner;
  const setOpen = (v: boolean) => { setInner(v); onOpenChange?.(v); };

  return (
    <DashCard delay={delay} className={compact ? "flex items-center justify-center !p-0" : "flex h-full items-center justify-center"}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={compact
          ? "flex w-full items-center justify-center gap-2.5 px-4 py-3.5 text-[13px] font-bold text-dash-text"
          : "flex flex-col items-center gap-2.5 py-6 text-[13px] font-bold text-dash-text sm:text-[15px]"}
      >
        <ListChecks className={compact ? "h-5 w-5 text-dash-green" : "h-6 w-6 text-dash-green sm:h-7 sm:w-7"} />
        {tr("مشاهده حرکات", "Browse exercises")}
      </button>

      <AnimatePresence>{open && <ExerciseCatalogModal onClose={() => setOpen(false)} />}</AnimatePresence>
    </DashCard>
  );
}
