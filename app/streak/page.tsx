import type { Metadata } from "next";
import { tr } from "@/lib/i18n";
import { StreakClient } from "@/components/StreakClient";

// استریک و اچیومنت‌ها — با زدن شعله‌ی استریک (هدر/داشبورد) باز می‌شه.
export function generateMetadata(): Metadata {
  return {
    title: tr("استریک و اچیومنت‌ها", "Streak and achievements"),
    robots: { index: false, follow: false },
  };
}

export default function StreakPage() {
  return <StreakClient />;
}
