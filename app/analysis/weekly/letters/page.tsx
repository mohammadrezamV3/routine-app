import type { Metadata } from "next";
import { tr } from "@/lib/i18n";
import { WeeklyLetterArchive } from "@/components/WeeklyLetterArchive";

// آرشیو آنالیز هفتگی؛ صفحه‌ی شخصیه و ایندکس نمی‌شه.
export function generateMetadata(): Metadata {
  return {
    title: tr("آرشیو آنالیز هفتگی", "Weekly review archive"),
    robots: { index: false, follow: false },
  };
}

export default function WeeklyLettersPage() {
  return <WeeklyLetterArchive />;
}
