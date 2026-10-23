"use client";

// بخش «تمرین» یا «تغذیه» داشبورد بخش ورزش: دو بخش جدا (area ex و cal) که کنار هم
// (دسکتاپ) یا زیر هم (موبایل/تبلت) میان. هر کدوم سرتیتر بی‌قاب دارن و پنل واقعی
// خودشون رو تنبل لود می‌کنن؛ بخش‌های داخلی پشت QuickPanels عوض می‌شن.
//
// ?tab=exercise|calorie لنگره: با لود یا ناوبری کلاینتی منو، بخش مربوط رو به دید
// می‌یاره (useSearchParams واقعی تا به ناوبری بدون ریمانت واکنش نشون بده).

import { Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { BentoCard, CardHead, Skel } from "./DashboardKit";
import { scrollToWorkoutSection, workoutSectionId, type WorkoutPart } from "@/lib/workoutAnchor";
import { tr } from "@/lib/i18n";

function SectionSkeleton() {
  return (
    <div className="db-space-skel" aria-hidden="true">
      <Skel w="46%" h={14} />
      <Skel w="100%" h={88} r={16} />
      <Skel w="100%" h={140} r={16} />
    </div>
  );
}

// پنل‌ها فقط بعد از هیدریت لازمن؛ چانک جدا، بدون لودر بزرگ
const Panels = dynamic(() => import("./DashboardWorkoutPanels"), { ssr: false, loading: () => <SectionSkeleton /> });

function TabAnchor({ part }: { part: WorkoutPart }) {
  const wanted = useSearchParams().get("tab");
  useEffect(() => {
    if (wanted !== part) return;
    let touched = false;
    const mark = () => { touched = true; };
    window.addEventListener("wheel", mark, { passive: true });
    window.addEventListener("touchmove", mark, { passive: true });
    const raf = requestAnimationFrame(() => { scrollToWorkoutSection(part); });
    // محتوای بالاتر تنبل لود می‌شه و ارتفاع عوض می‌کنه؛ یک بار دیگه، اگه کاربر خودش اسکرول نکرده
    const t = setTimeout(() => { if (!touched) scrollToWorkoutSection(part); }, 900);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchmove", mark);
    };
  }, [wanted, part]);
  return null;
}

export function DashboardWorkoutSection({ part }: { part: WorkoutPart }) {
  const exercise = part === "exercise";
  return (
    <BentoCard area={exercise ? "ex" : "cal"} className={`db-space db-ws db-ws-${part}`} label={exercise ? tr("تمرین", "Workout") : tr("تغذیه", "Nutrition")}>
      <span id={workoutSectionId(part)} className="db-ws-anchor" aria-hidden="true" />
      <CardHead icon={exercise ? "dumbbell" : "apple"} title={exercise ? tr("تمرین", "Workout") : tr("تغذیه", "Nutrition")} />
      <Panels part={part} />
      <Suspense fallback={null}><TabAnchor part={part} /></Suspense>
    </BentoCard>
  );
}
