"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ظرف مشترک صفحه‌های auth (ورود/ثبت‌نام/فراموشی‌رمز) — طبق طراحی، باکس
 * باید وسط ویوپورت بمونه (`.auth-shell{justify-content:center}`).
 *
 * باگ: `justify-content:center` هر بار که *ارتفاع محتوای داخل باکس* عوض
 * بشه (مثلا فیلد کد پیامک بعد از زدن «ارسال کد» ظاهر می‌شه، یا خطایی
 * زیر یه فیلد میاد) کل گروه (تب‌ها + باکس) رو دوباره وسط‌چین می‌کنه —
 * یعنی حتی عناصری که خودشون هیچ تغییری نکردن (مثل خودِ دکمه‌ی «ارسال کد»
 * یا دکمه‌ی نمایش/مخفی‌کردن رمز) چون کل باکس جابه‌جا می‌شه، روی صفحه
 * می‌پرن. (تایید شده با اندازه‌گیری واقعی: ~57px پرش موقع ظاهرشدن فیلد
 * کد در ثبت‌نام.)
 *
 * راه‌حل: همون موقعیت اولیه‌ای که `justify-content:center` طبیعتا
 * می‌ساخت رو یک‌بار (بلافاصله بعد از اولین رندر پایدار، قبل از هر
 * تعامل کاربر) اندازه می‌گیریم و به‌جای وسط‌چینِ همیشه-دوباره‌محاسبه‌شونده،
 * با `padding-top` ثابت قفلش می‌کنیم. نتیجه: باکس دقیقا همون‌جایی
 * می‌مونه که اول بود، محتوای پویا فقط به سمت پایین رشد می‌کنه (نه اینکه
 * کل گروه بالا/پایین بپره). با تغییر اندازه‌ی ویوپورت (resize/چرخش
 * صفحه) دوباره اندازه‌گیری می‌شه تا روی صفحه‌های مختلف درست بمونه.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pinnedTop, setPinnedTop] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !el.parentElement) return;

    function measure() {
      if (!el || !el.parentElement) return;
      // قبل از اندازه‌گیری، وسط‌چین طبیعی رو برای یک فریم برمی‌گردونیم
      // (اگه از resize قبلی pin شده بود) تا نقطه‌ی شروعِ درست دوباره
      // محاسبه بشه، نه روی افستِ قدیمی.
      setPinnedTop(null);
    }

    function pin() {
      if (!el || !el.parentElement) return;
      const shellRect = el.getBoundingClientRect();
      const parentRect = el.parentElement.getBoundingClientRect();
      setPinnedTop(Math.max(0, shellRect.top - parentRect.top));
    }

    // دو فریم فاصله: مطمئن بشیم فونت/چیدمان اولیه قبل از قفل‌کردن کاملا
    // پایدار شده (انیمیشن ورود فیلدها opacity/translateY‌ه، ارتفاع رو
    // عوض نمی‌کنه، پس نیازی به صبر بیشتر نیست).
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(pin);
      (el as any)._raf2 = raf2;
    });

    function onResize() {
      measure();
      requestAnimationFrame(() => requestAnimationFrame(pin));
    }
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf1);
      if ((el as any)._raf2) cancelAnimationFrame((el as any)._raf2);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="auth-shell"
      style={pinnedTop != null ? { justifyContent: "flex-start", paddingTop: pinnedTop } : undefined}
    >
      {children}
    </div>
  );
}
