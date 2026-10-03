import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WeeklyLetterReader } from "@/components/WeeklyLetterReader";
import { WEEK_PARAM_RE } from "@/components/WeeklyLetterUtils";

// یک شماره‌ی هفته‌نامه؛ [week] = شنبه‌ی همون هفته (YYYY-MM-DD).
export const metadata: Metadata = {
  title: "هفته‌نامه",
  robots: { index: false, follow: false },
};

export default function WeeklyLetterPage({ params }: { params: { week: string } }) {
  if (!WEEK_PARAM_RE.test(params.week)) notFound();
  return <WeeklyLetterReader week={params.week} />;
}
