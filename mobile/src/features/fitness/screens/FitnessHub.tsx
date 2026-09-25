import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { SegmentedTabs } from "../components/ui";
import WorkoutTab from "./WorkoutTab";
import CalorieTab from "./CalorieTab";

type Tab = "workout" | "calorie";

// صفحه‌ی هابِ /exercise — همون دو زیرماژولِ وب (ExercisePanel + CaloriePanel)
// این‌جا زیرِ یک تبِ segment جمع شدن، چون در موبایل جای دو تب جداگانه‌ی
// بالای صفحه (مثل وب) رو نداریم.
export default function FitnessHub() {
  const [tab, setTab] = useState<Tab>("workout");

  return (
    <div>
      <AppHeader title="بدنسازی" />
      <div className="px-4 pt-3">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "workout", label: "تمرین" },
            { value: "calorie", label: "کالری" },
          ]}
        />
      </div>
      {tab === "workout" ? <WorkoutTab /> : <CalorieTab />}
    </div>
  );
}
