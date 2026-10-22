import { redirect } from "next/navigation";
import { BodybuildingPage } from "@/components/BodybuildingPage";
import { getSessionFast } from "@/lib/serverSession";
import { isFeatureEnabled } from "@/lib/featureFlagsServer";

export const dynamic = "force-dynamic";

// صفحه‌ی بدنسازی توی داشبورد بخش ورزش ادغام شده (/dashboard?tab=exercise|calorie:
// «فضای تمرین»). این‌جا فقط ریدایرکته. اگه فلگ داشبورد برای این کاربر خاموشه (یا
// مهمانه)، صفحه‌ی قدیمی همین‌جا رندر می‌شه تا هیچ‌وقت بی‌صفحه نمونه.
// کوکی بخش (arion_section) رو middleware روی همین پاسخ ست می‌کنه و با ریدایرکت هم می‌مونه.
export default async function ExercisePage({ searchParams }: { searchParams?: { tab?: string | string[] } }) {
  const session = await getSessionFast();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (userId && (await isFeatureEnabled("dashboard", userId))) {
    const tab = Array.isArray(searchParams?.tab) ? searchParams?.tab[0] : searchParams?.tab;
    redirect(`/dashboard?tab=${tab === "calorie" ? "calorie" : "exercise"}`);
  }
  return <BodybuildingPage />;
}
