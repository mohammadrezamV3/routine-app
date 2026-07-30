"use client";

import { useState } from "react";
import { ExercisePanel } from "@/components/ExercisePanel";
import { CaloriePanel } from "@/components/CaloriePanel";
import { ModuleGate } from "@/components/ModuleGate";
import { SegmentedTabs } from "@/components/SegmentedTabs";

export default function BodybuildingPage() {
  const [tab, setTab] = useState<"exercise" | "calorie">("exercise");

  return (
    <section className="bodybuilding-glass">
      <h1>بدنسازی</h1>

      <div style={{ marginTop: 10 }}>
        <SegmentedTabs
          active={tab}
          onChange={setTab}
          options={[
            { value: "exercise", label: "ورزش" },
            { value: "calorie", label: "کالری" },
          ]}
        />
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
