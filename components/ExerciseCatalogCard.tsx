"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ListChecks } from "lucide-react";
import { DashCard } from "./DashCard";
import dynamic from "next/dynamic";

// این مودال کلِ EXERCISE_CATALOG (~۸۵KB سورس) رو import می‌کنه، ولی فقط وقتی
// کاربر روی «مشاهده حرکات» بزنه رندر می‌شه. بدونِ dynamic، اون حجم توی باندلِ
// خودِ صفحه‌ی /exercise می‌نشست و برای *هر* بازدیدکننده دانلود می‌شد — حتی
// کسی که هیچ‌وقت این دکمه رو نمی‌زنه. ssr:false چون فقط با کلیک باز می‌شه و
// هیچ‌وقت بخشی از HTMLِ اولِ سرور نیست.
const ExerciseCatalogModal = dynamic(
  () => import("./ExerciseCatalogModal").then((m) => m.ExerciseCatalogModal),
  { ssr: false }
);

// «مشاهده حرکات» — ستونِ وسطِ داشبورد (هم‌جای DashReminderCard توی روتین)،
// فقط یک دکمه‌ی وسط‌چین که کاتالوگِ کاملِ حرکات رو باز می‌کنه — بدون
// پیش‌نمایشِ لیست.
export function ExerciseCatalogCard({ delay }: { delay?: number }) {
  const [open, setOpen] = useState(false);

  return (
    <DashCard delay={delay} className="flex h-full items-center justify-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-2.5 py-6 text-[13px] font-bold text-dash-text sm:text-[15px]"
      >
        <ListChecks className="h-6 w-6 text-dash-green sm:h-7 sm:w-7" />
        مشاهده حرکات
      </button>

      <AnimatePresence>{open && <ExerciseCatalogModal onClose={() => setOpen(false)} />}</AnimatePresence>
    </DashCard>
  );
}
