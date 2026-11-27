import { CaloriePanel } from "@/components/CaloriePanel";
import { ModuleGate } from "@/components/ModuleGate";
import { WorkoutRingHero } from "@/components/WorkoutRingHero";

export const dynamic = "force-dynamic";

// «کالری‌شمار»: صفحه‌ی کامل و مستقل؛ بالاش فقط حلقه‌ی کالری امروز، بعد خود پنل.
export default function CaloriePage() {
  return (
    <section className="bodybuilding-glass exercise-dash-breakout">
      <WorkoutRingHero kind="calorie" />
      <ModuleGate module="CALORIE"><CaloriePanel /></ModuleGate>
    </section>
  );
}
