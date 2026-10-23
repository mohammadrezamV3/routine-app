"use client";

// پنل واقعی تمرین یا تغذیه برای بخش‌های داشبورد ورزش. این ماژول فقط با
// next/dynamic (ssr:false) از DashboardWorkoutSection لود می‌شه؛ CSS مسیر
// بدنسازی هم همراه همین چانک میاد تا داشبورد روتین/ترید هیچ بایتی از اون نکشه.
import "@/app/_area/exercise.css";
import { ExercisePanel } from "./ExercisePanel";
import { CaloriePanel } from "./CaloriePanel";
import { ModuleGate } from "./ModuleGate";

export default function DashboardWorkoutPanels({ part }: { part: "exercise" | "calorie" }) {
  return (
    <div className="bodybuilding-glass db-space-body">
      {part === "exercise" ? (
        <ModuleGate module="EXERCISE"><ExercisePanel inSpace layout="quick" /></ModuleGate>
      ) : (
        <ModuleGate module="CALORIE"><CaloriePanel inSpace layout="quick" /></ModuleGate>
      )}
    </div>
  );
}
