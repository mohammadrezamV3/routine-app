"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ExercisePanel } from "@/components/ExercisePanel";
import { CaloriePanel } from "@/components/CaloriePanel";
import { ModuleGate } from "@/components/ModuleGate";
import { PanelSkeleton } from "@/components/PanelSkeleton";
import { ICONS } from "@/components/NavDrawer";

// انتخاب برنامه‌ی تمرینی/غذایی دیگه تب روی صفحه نداره — طبق درخواست
// صریح کاربر فقط از منوی «بدنسازی» ← «برنامه تمرینی»/«برنامه غذایی» ممکنه؛
// یعنی این‌جا باید هر تغییر ?tab= (حتی وقتی از قبل توی همین صفحه‌ای و فقط
// کوئری‌استرینگ عوض می‌شه، نه کل صفحه) رو زنده ببینه — برای همینم برخلاف
// قاعده‌ی معمول پروژه (خوندن مستقیم window.location برای دورزدن Suspense)
// این‌جا از useSearchParams واقعی استفاده شده، چون فقط اون به تغییر کوئری
// بعد ناوبری سمت کلاینت (بدون ریمانت شدن کامپوننت) واکنش نشون می‌ده.
function BodybuildingTabContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "calorie" ? "calorie" : "exercise";

  return (
    <div style={{ marginTop: 14 }}>
      {tab === "exercise" ? (
        <ModuleGate module="EXERCISE"><ExercisePanel /></ModuleGate>
      ) : (
        <ModuleGate module="CALORIE"><CaloriePanel /></ModuleGate>
      )}
    </div>
  );
}

export default function BodybuildingPage() {
  return (
    <section className="bodybuilding-glass exercise-dash-breakout">
      {/* قبلاً این صفحه هیچ عنوانی نداشت — با اینکه «بدنسازی» عنوانِ
          واقعیِ همین صفحه‌ست (هم در منو، هم در هاب ترید مشابهش). تب
          فعلی (برنامه‌ی تمرینی/کالری‌شمار) روی همین عنوان تأثیری ندارد. */}
      <div className="trade-head-row">
        <span className="page-title-icon">{ICONS.exercise}</span>
        <h1>بدنسازی</h1>
      </div>
      <Suspense fallback={<PanelSkeleton />}>
        <BodybuildingTabContent />
      </Suspense>
    </section>
  );
}
