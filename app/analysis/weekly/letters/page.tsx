import type { Metadata } from "next";
import { WeeklyLetterArchive } from "@/components/WeeklyLetterArchive";

// آرشیو آنالیز هفتگی؛ صفحه‌ی شخصیه و ایندکس نمی‌شه.
export const metadata: Metadata = {
  title: "آرشیو آنالیز هفتگی",
  robots: { index: false, follow: false },
};

export default function WeeklyLettersPage() {
  return <WeeklyLetterArchive />;
}
