import { redirect } from "next/navigation";
import { TradeHub } from "@/components/TradeHub";
import { getSessionFast } from "@/lib/serverSession";
import { isFeatureEnabled } from "@/lib/featureFlagsServer";

export const dynamic = "force-dynamic";

// هاب قدیمی ترید توی داشبورد بخش ترید ادغام شده (/dashboard: عملکرد، بازار و ابزارها).
// /trade فقط ریدایرکته و ?share=1 حفظ می‌شه. اگه فلگ داشبورد برای این کاربر خاموشه،
// هاب قدیمی همین‌جا رندر می‌شه تا کاربر ترید هیچ‌وقت بی‌صفحه نمونه.
// کوکی بخش (arion_section) رو middleware روی همین پاسخ ست می‌کنه و با ریدایرکت هم می‌مونه.
export default async function TradePage({ searchParams }: { searchParams?: { share?: string | string[] } }) {
  const session = await getSessionFast();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (await isFeatureEnabled("dashboard", userId)) {
    const share = Array.isArray(searchParams?.share) ? searchParams?.share[0] : searchParams?.share;
    redirect(share === "1" ? "/dashboard?share=1" : "/dashboard");
  }
  return <TradeHub />;
}
