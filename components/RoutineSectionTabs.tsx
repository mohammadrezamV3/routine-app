"use client";

import { usePathname, useRouter } from "next/navigation";
import { SegmentedTabs } from "./SegmentedTabs";

// «روتین من» دو بخش داره: برنامه‌ها (/weekly) و خواب (/weekly/sleep). خواب
// عمدا آیتم جدا در منو نیست (درخواست صاحب محصول) — این تب‌ها تنها ورودی
// اصلی‌شن، به‌علاوه‌ی کارت کوچک خواب در روتین و داشبورد.
type Section = "routine" | "sleep";

export function RoutineSectionTabs({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const active: Section = pathname?.startsWith("/weekly/sleep") ? "sleep" : "routine";
  return (
    <SegmentedTabs<Section>
      className={className}
      ariaLabel="بخش‌های روتین من"
      options={[
        { value: "routine", label: "برنامه‌ها" },
        { value: "sleep", label: "خواب" },
      ]}
      active={active}
      onChange={(v) => {
        if (v === active) return;
        router.push(v === "sleep" ? "/weekly/sleep" : "/weekly");
      }}
    />
  );
}
