import type { Metadata } from "next";
import { StreakClient } from "@/components/StreakClient";

// استریک و اچیومنت‌ها — با زدن شعله‌ی استریک (هدر/داشبورد) باز می‌شه.
export const metadata: Metadata = {
  title: "استریک و اچیومنت‌ها",
  robots: { index: false, follow: false },
};

export default function StreakPage() {
  return <StreakClient />;
}
