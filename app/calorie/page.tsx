import { CaloriePanel } from "@/components/CaloriePanel";
import { ModuleGate } from "@/components/ModuleGate";

export const dynamic = "force-dynamic";

// «کالری‌شمار»: صفحه‌ی کامل و مستقل.
export default function CaloriePage() {
  return (
    <section className="bodybuilding-glass exercise-dash-breakout">
      <ModuleGate module="CALORIE"><CaloriePanel /></ModuleGate>
    </section>
  );
}
