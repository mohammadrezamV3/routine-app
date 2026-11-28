import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExercisePanel } from "@/components/ExercisePanel";
import { ModuleGate } from "@/components/ModuleGate";
import { getSessionFast } from "@/lib/serverSession";
import { isFeatureEnabled } from "@/lib/featureFlagsServer";
import { PageTitle } from "@/components/PageTitle";
import { tr } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return { title: tr("برنامه تمرینی", "Workout plan"), robots: { index: false, follow: false } };
}

// «برنامه تمرینی»: صفحه‌ی کامل و مستقل (داشبورد ورزش جداست). لینک‌های قدیمی ?tab=calorie به /calorie می‌رن.
export default async function ExercisePage({ searchParams }: { searchParams?: { tab?: string | string[] } }) {
  const tab = Array.isArray(searchParams?.tab) ? searchParams?.tab[0] : searchParams?.tab;
  if (tab === "calorie") {
    const session = await getSessionFast();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (await isFeatureEnabled("calorie", userId)) redirect("/calorie");
  }
  return (
    <section className="bodybuilding-glass exercise-dash-breakout">
      <ModuleGate module="EXERCISE">
        <PageTitle icon="exercise" title={tr("برنامه تمرینی", "Workout plan")} />
        <ExercisePanel />
      </ModuleGate>
    </section>
  );
}
