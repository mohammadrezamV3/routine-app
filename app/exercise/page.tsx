import { redirect } from "next/navigation";
import { ExercisePanel } from "@/components/ExercisePanel";
import { ModuleGate } from "@/components/ModuleGate";
import { getSessionFast } from "@/lib/serverSession";
import { isFeatureEnabled } from "@/lib/featureFlagsServer";

export const dynamic = "force-dynamic";

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
      <ModuleGate module="EXERCISE"><ExercisePanel /></ModuleGate>
    </section>
  );
}
