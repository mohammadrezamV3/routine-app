"use client";

import { useRouter } from "next/navigation";
import { SegmentedTabs } from "./SegmentedTabs";
import { useT } from "./LanguageProvider";

export function AuthTabs({ active }: { active: "login" | "signup" }) {
  const router = useRouter();
  const t = useT();

  return (
    <SegmentedTabs
      active={active}
      onChange={(v) => router.push(v === "login" ? "/auth/login" : "/auth/signup")}
      options={[
        { value: "login", label: t({ fa: "ورود", en: "Sign in" }) },
        { value: "signup", label: t({ fa: "ثبت‌نام", en: "Sign up" }) },
      ]}
    />
  );
}
