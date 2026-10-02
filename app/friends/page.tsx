import type { Metadata } from "next";
import { Suspense } from "react";
import { FriendsClient } from "@/components/FriendsClient";

// دوستان — رتبه‌بندی، درخواست‌ها و افزودن دوست (از سرتیتر کارت دوستان و منو).
export const metadata: Metadata = {
  title: "دوستان",
  robots: { index: false, follow: false },
};

export default function FriendsPage() {
  return (
    <Suspense fallback={null}>
      <FriendsClient />
    </Suspense>
  );
}
