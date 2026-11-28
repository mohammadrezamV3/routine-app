import type { Metadata } from "next";
import { CaloriePanel } from "@/components/CaloriePanel";
import { ModuleGate } from "@/components/ModuleGate";
import { PageTitle } from "@/components/PageTitle";
import { tr } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return { title: tr("کالری‌شمار", "Calorie counter"), robots: { index: false, follow: false } };
}

// «کالری‌شمار»: صفحه‌ی کامل و مستقل.
export default function CaloriePage() {
  return (
    <section className="bodybuilding-glass exercise-dash-breakout">
      <ModuleGate module="CALORIE">
        <PageTitle icon="food" title={tr("کالری‌شمار", "Calorie counter")} />
        <CaloriePanel />
      </ModuleGate>
    </section>
  );
}
