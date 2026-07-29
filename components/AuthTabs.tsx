"use client";

import { useRouter } from "next/navigation";
import { SegmentedTabs } from "./SegmentedTabs";

export function AuthTabs({ active }: { active: "login" | "signup" }) {
  const router = useRouter();

  return (
    <SegmentedTabs
      active={active}
      onChange={(v) => router.push(v === "login" ? "/auth/login" : "/auth/signup")}
      options={[
        { value: "login", label: "ورود" },
        { value: "signup", label: "ثبت‌نام" },
      ]}
    />
  );
}
