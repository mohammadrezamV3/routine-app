"use client";

import { useLayoutEffect, useRef } from "react";

// کنترل دوتکه‌ی شیشه‌ای با نشانگر لغزنده — همون کامپوننتی که زیر تب
// ورود/ثبت‌نام صفحه‌ی لاگینه، فقط عمومی‌شده تا هرجای دیگه‌ی اپ (مثلا
// چک‌لیست/ژورنال توی ترید) هم عینا همون ظاهر و انیمیشن رو داشته باشه.
//
// نشانگر قبلا با animejs (یعنی یک لوپ جاوااسکریپتی که هر فریم `left` و
// `width` رو دستی می‌نوشت) حرکت می‌کرد. هر دوی این‌ها propهای layout ـن، پس
// هر فریم یک reflow کامل می‌داد — روی موبایل همین باعث همون لگی می‌شد که
// موقع سوییچ‌کردن هر تب اپ (میزان اهمیت، هفتگی/ماهانه‌ی کالری، وعده‌ها، …)
// گزارش شد. حالا فقط یک بار مقدار نهایی نوشته می‌شه و خود مرورگر با یک
// transition CSS می‌بردش — بدون هیچ کار جاوااسکریپتی حین انیمیشن.
export function SegmentedTabs<T extends string>({
  options,
  active,
  onChange,
}: {
  options: { value: T; label: string }[];
  active: T;
  onChange: (value: T) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<T, HTMLButtonElement>>(new Map());
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    const target = btnRefs.current.get(active);
    const indicator = indicatorRef.current;
    if (!target || !indicator) return;
    // عمدا به‌جای getBoundingClientRect از offsetLeft/offsetWidth استفاده
    // می‌شه — این پاپ‌آپ میزبان (.modal-panel) موقع باز شدن یک انیمیشن
    // CSS با transform:scale داره؛ getBoundingClientRect همون لحظه‌ی
    // رندر اول رو که هنوز مقیاس کوچیک‌تره اندازه می‌گیره و نشانگر رو جای
    // اشتباه می‌ذاره. offsetLeft/offsetWidth مقادیر layout واقعی‌ان و از
    // transform روی والد اصلا اثر نمی‌گیرن.
    const left = target.offsetLeft;
    const width = target.offsetWidth;

    // اولین جای‌گیری نباید انیمیشن بخوره (وگرنه نشانگر از گوشه‌ی صفر پرواز
    // می‌کنه سر جاش) — کلاس no-anim transition رو برای همون یک فریم می‌بنده.
    if (!mounted.current) {
      indicator.classList.add("no-anim");
      indicator.style.left = `${left}px`;
      indicator.style.width = `${width}px`;
      // خواندن offsetWidth یک reflow اجباری می‌سازد تا مرورگر مقدار بالا
      // را «قدیمی» حساب نکند و با برداشتن کلاس، انیمیشن از صفر شروع نشود.
      void indicator.offsetWidth;
      indicator.classList.remove("no-anim");
      mounted.current = true;
      return;
    }
    indicator.style.left = `${left}px`;
    indicator.style.width = `${width}px`;
  }, [active, options.length]);

  return (
    <div className="auth-tabs" ref={containerRef}>
      <span className="auth-tab-indicator" ref={indicatorRef} />
      {options.map((opt) => (
        <button
          key={opt.value}
          ref={(el) => { if (el) btnRefs.current.set(opt.value, el); }}
          type="button"
          className={`auth-tab${active === opt.value ? " active" : ""}`}
          onClick={() => opt.value !== active && onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
