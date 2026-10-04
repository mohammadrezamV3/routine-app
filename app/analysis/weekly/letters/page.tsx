import type { Metadata } from "next";
import { WeeklyLetterArchive } from "@/components/WeeklyLetterArchive";

// آرشیو شماره‌های هفته‌نامه؛ صفحه‌ی شخصیه و ایندکس نمی‌شه.
export const metadata: Metadata = {
  title: "هفته‌نامه",
  robots: { index: false, follow: false },
};

export default function WeeklyLettersPage() {
  return <WeeklyLetterArchive />;
}
