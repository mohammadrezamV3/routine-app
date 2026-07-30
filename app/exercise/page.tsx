"use client";

import { useState } from "react";
import { ExercisePanel } from "@/components/ExercisePanel";
import { CaloriePanel } from "@/components/CaloriePanel";
import { ModuleGate } from "@/components/ModuleGate";

export default function BodybuildingPage() {
  const [tab, setTab] = useState<"exercise" | "calorie">("exercise");

  return (
    <section className="exercise-calorie-root">
      <h1>بدنسازی</h1>

      <div className="day-picker" style={{ marginTop: 10 }}>
        <span className={`day-pill${tab === "exercise" ? " on" : ""}`} onClick={() => setTab("exercise")}>ورزش</span>
        <span className={`day-pill${tab === "calorie" ? " on" : ""}`} onClick={() => setTab("calorie")}>کالری</span>
      </div>

      <div style={{ marginTop: 14 }}>
        {tab === "exercise" ? (
          <ModuleGate module="EXERCISE"><ExercisePanel /></ModuleGate>
        ) : (
          <ModuleGate module="CALORIE"><CaloriePanel /></ModuleGate>
        )}
      </div>
    </section>
  );
}
