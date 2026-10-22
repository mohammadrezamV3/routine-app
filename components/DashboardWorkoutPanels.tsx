"use client";

// پنل‌های واقعی تمرین و تغذیه برای «فضای تمرین» داشبورد بخش ورزش. این ماژول
// فقط با next/dynamic (ssr:false) از DashboardWorkoutSpace لود می‌شه؛ CSS مسیر
// بدنسازی هم همراه همین چانک میاد تا داشبورد روتین/ترید هیچ بایتی از اون نکشه.
import "@/app/_area/exercise.css";
import { ExercisePanel } from "./ExercisePanel";
import { CaloriePanel } from "./CaloriePanel";
import { ModuleGate } from "./ModuleGate";

export default function DashboardWorkoutPanels({ tab }: { tab: "exercise" | "calorie" }) {
  return (
    <div className="bodybuilding-glass db-space-body">
      {tab === "exercise" ? (
        <ModuleGate module="EXERCISE"><ExercisePanel /></ModuleGate>
      ) : (
        <ModuleGate module="CALORIE"><CaloriePanel /></ModuleGate>
      )}
    </div>
  );
}
