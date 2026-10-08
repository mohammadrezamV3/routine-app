"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * ظرف مشترک صفحه‌های auth (ورود/ثبت‌نام/فراموشی‌رمز) — طبق طراحی، باکس
 * باید وسط ویوپورت بمونه (`.auth-shell{justify-content:center}`).
 *
 * باگ: `justify-content:center` هر بار که *ارتفاع محتوای داخل باکس* عوض
 * بشه (مثلا فیلد کد پیامک بعد از زدن «ارسال کد» ظاهر می‌شه، یا خطایی
 * زیر یه فیلد میاد) کل گروه (تب‌ها + باکس) رو دوباره وسط‌چین می‌کنه —
 * یعنی حتی عناصری که خودشون هیچ تغییری نکردن (مثل خود دکمه‌ی «ارسال کد»
 * یا دکمه‌ی نمایش/مخفی‌کردن رمز) چون کل باکس جابه‌جا می‌شه، روی صفحه
 * می‌پرن. (تایید شده با اندازه‌گیری واقعی: ~57px پرش موقع ظاهرشدن فیلد
 * کد در ثبت‌نام.)
 *
 * راه‌حل: همون موقعیت اولیه‌ای که `justify-content:center` طبیعتا
 * می‌ساخت رو یک‌بار (بلافاصله بعد از اولین رندر پایدار، قبل از هر
 * تعامل کاربر) اندازه می‌گیریم و به‌جای وسط‌چین همیشه-دوباره‌محاسبه‌شونده،
 * با `padding-top` ثابت قفلش می‌کنیم. نتیجه: باکس دقیقا همون‌جایی
 * می‌مونه که اول بود، محتوای پویا فقط به سمت پایین رشد می‌کنه (نه اینکه
 * کل گروه بالا/پایین بپره). با تغییر اندازه‌ی ویوپورت (resize/چرخش
 * صفحه) دوباره اندازه‌گیری می‌شه تا روی صفحه‌های مختلف درست بمونه.
 *
 * این شل حالا توی `app/auth/layout.tsx` (از طریق `AuthFrame`) زنده می‌مونه
 * و با سوییچ ورود↔ثبت‌نام از نو mount نمی‌شه — پس قفل حفظ می‌شه و تب‌ها
 * عمودی نمی‌پرن (قبلا با هر سوییچ دوباره وسط‌چین می‌شد و چون ارتفاع دو
 * فرم فرق داره کل گروه جابه‌جا می‌شد). `repinKey` فقط وقتی عوض می‌شه که
 * ساختار واقعا عوض شده (مثلا رفتن به فراموشی رمز که تب نداره) — اون‌وقت
 * قفل آزاد و دوباره اندازه‌گیری می‌شه.
 */
export function AuthShell({ children, repinKey }: { children: React.ReactNode; repinKey?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pinnedTop, setPinnedTop] = useState<number | null>(null);

  // قبل از paint آزاد کن تا اندازه‌گیری بعدی روی وسط‌چین طبیعی ساختار جدید باشه
  const firstRun = useRef(true);
  useLayoutEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setPinnedTop(null);
  }, [repinKey]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !el.parentElement) return;

    function measure() {
      if (!el || !el.parentElement) return;
      // قبل از اندازه‌گیری، وسط‌چین طبیعی رو برای یک فریم برمی‌گردونیم
      // (اگه از resize قبلی pin شده بود) تا نقطه‌ی شروع درست دوباره
      // محاسبه بشه، نه روی افست قدیمی.
      setPinnedTop(null);
    }

    function pin() {
      if (!el || !el.parentElement) return;
      // باگ قبلی: فاصله‌ی *خود شل* از والدش اندازه گرفته می‌شد؛ ولی شل با
      // flex:1 کل `.auth-page` رو پر می‌کنه و تنها فرزندشه، پس این عدد همیشه
      // صفر بود — یعنی دو فریم بعد از هر mount، گروه وسط‌چین‌شده یک‌دفعه به
      // بالای صفحه می‌پرید (بخشی از همون «لود باگی»). چیزی که باید قفل بشه
      // جای *اولین فرزند* (تب‌ها یا باکس) داخل شله. offsetTop به‌جای
      // getBoundingClientRect چون باکس موقع ورود translateY داره.
      const first = el.firstElementChild as HTMLElement | null;
      if (!first) return;
      const marginTop = parseFloat(getComputedStyle(first).marginTop) || 0;
      const sameParent = first.offsetParent === el.offsetParent;
      const top = sameParent ? first.offsetTop - el.offsetTop : first.offsetTop;
      setPinnedTop(Math.max(0, top - marginTop));
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
  }, [repinKey]);

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
