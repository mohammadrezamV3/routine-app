"use client";

// سمت پایان هدر دسکتاپ (هر دو زبان): سوییچ روز/شب (مشترک با کشو) برای همه + برای مهمان «ورود» و «شروع رایگان».
// انتخاب زبان عمدا اینجا نیست (فقط در تنظیمات و صفحه‌های ورود). به‌علاوه
// سایه/بلور قوی‌تر هدر بعد از چند پیکسل اسکرول (data-scrolled روی هدر، با یک
// لیسنر passive؛ روی دستگاه ضعیف lib/perfTier.ts هیچ لیسنری نمی‌ذاره).
// زیر 1024px با CSS مخفیه.
import { useEffect, useRef } from "react";
import { SmartLink as Link } from "./SmartLink";
import { isLowPerfDevice } from "@/lib/perfTier";
import { tr } from "@/lib/i18n";
import ThemeSwitch from "./ThemeSwitch";

export default function DesktopNavEnd({ guest }: { guest: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLowPerfDevice()) return;
    const header = wrapRef.current?.closest<HTMLElement>(".app-topbar");
    if (!header) return;
    let on = false;
    const onScroll = () => {
      const next = window.scrollY > 6;
      if (next !== on) { on = next; header.toggleAttribute("data-scrolled", next); }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={wrapRef} className="dnav-end">
      <ThemeSwitch />
      {guest && (
        <>
          <Link href="/auth/login" className="dnav-login">{tr("ورود", "Log in")}</Link>
          <Link href="/auth/signup" className="topbar-signin-btn dnav-cta">{tr("شروع رایگان", "Start free")}</Link>
        </>
      )}
    </div>
  );
}
