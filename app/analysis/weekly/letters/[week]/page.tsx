import { notFound, redirect } from "next/navigation";
import { isRealIsoDate } from "@/lib/weeklyLetter/weekParam";

// لینک قدیمی هر شماره (اعلان‌ها، بوکمارک): خواننده الان یکیه و روی
// /analysis/weekly?week=<شنبه> باز می‌شه؛ پارامتر story حفظ می‌شه.
export default function WeeklyLetterLegacyPage({
  params,
  searchParams,
}: {
  params: { week: string };
  searchParams?: { story?: string };
}) {
  if (!isRealIsoDate(params.week)) notFound();
  const story = searchParams?.story === "1" ? "&story=1" : "";
  redirect(`/analysis/weekly?week=${params.week}${story}`);
}
