"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SegmentedTabs } from "./SegmentedTabs";

type Tab = "login" | "signup";
const HREF: Record<Tab, string> = { login: "/auth/login", signup: "/auth/signup" };

/**
 * تب ورود/ثبت‌نام — داخل `AuthFrame` (لایه‌ی مشترک auth) زنده می‌مونه، پس
 * نشانگرش با ناوبری از نو mount نمی‌شه و واقعا بین دو تب می‌لغزه.
 * انتخاب به‌صورت خوش‌بینانه فورا اعمال می‌شه (نشانگر همون لحظه‌ی تپ حرکت
 * می‌کنه، نه بعد از رسیدن صفحه‌ی بعد) و وقتی مسیر واقعا عوض شد، از
 * `active` (مشتق از pathname) هم‌گام می‌شه.
 */
export function AuthTabs({ active }: { active: Tab }) {
  const router = useRouter();
  const [pending, setPending] = useState<Tab | null>(null);

  // صفحه‌ی مقابل از قبل آماده باشه تا سوییچ منتظر شبکه نمونه
  useEffect(() => {
    router.prefetch(HREF.login);
    router.prefetch(HREF.signup);
  }, [router]);

  useEffect(() => { setPending(null); }, [active]);

  return (
    <SegmentedTabs
      active={pending ?? active}
      onChange={(v) => {
        setPending(v);
        // scroll:false — لایه‌ی مشترک ثابت می‌مونه؛ پرش اسکرول به ابتدای سگمنت
        // جدید فقط تب‌ها رو از دید بیرون می‌برد.
        router.push(HREF[v], { scroll: false });
      }}
      options={[
        { value: "login", label: "ورود" },
        { value: "signup", label: "ثبت‌نام" },
      ]}
    />
  );
}
