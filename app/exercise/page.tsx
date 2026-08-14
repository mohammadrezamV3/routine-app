"use client";

import { useState } from "react";
import { ExercisePanel } from "@/components/ExercisePanel";
import { CaloriePanel } from "@/components/CaloriePanel";
import { ModuleGate } from "@/components/ModuleGate";
import { SegmentedTabs } from "@/components/SegmentedTabs";

// خوندنِ ?tab= مستقیم از window.location (نه useSearchParams) — هم‌قاعده‌ی
// app/auth/login/page.tsx، چون useSearchParams نیاز به Suspense boundary
// داره و این‌جا لازم نیست؛ فقط برای دیپ‌لینک از منوی «بدنسازی» ← «برنامه
// غذایی»/«برنامه تمرینی» استفاده می‌شه.
function initialTab(): "exercise" | "calorie" {
  if (typeof window === "undefined") return "exercise";
  const t = new URLSearchParams(window.location.search).get("tab");
  return t === "calorie" ? "calorie" : "exercise";
}

export default function BodybuildingPage() {
  const [tab, setTab] = useState<"exercise" | "calorie">(initialTab);

  return (
    <section className="bodybuilding-glass exercise-dash-breakout">
      <div className="exercise-mode-tabs">
        <SegmentedTabs
          active={tab}
          onChange={setTab}
          options={[
            { value: "exercise", label: "برنامه تمرینی" },
            { value: "calorie", label: "برنامه غذایی" },
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
