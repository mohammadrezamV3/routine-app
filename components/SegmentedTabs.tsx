"use client";

import { useLayoutEffect, useRef } from "react";
import { animate } from "animejs";

// کنترل دوتکه‌ی شیشه‌ای با نشانگرِ لغزنده — همون کامپوننتی که زیر تب
// ورود/ثبت‌نام صفحه‌ی لاگینه، فقط عمومی‌شده تا هرجای دیگه‌ی اپ (مثلاً
// چک‌لیست/ژورنال توی ترید) هم عیناً همون ظاهر و انیمیشن رو داشته باشه.
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
    // عمداً به‌جای getBoundingClientRect از offsetLeft/offsetWidth استفاده
    // می‌شه — این پاپ‌آپِ میزبان (.modal-panel) موقعِ باز شدن یک انیمیشنِ
    // CSS با transform:scale داره؛ getBoundingClientRect همون لحظه‌ی
    // رندرِ اول رو که هنوز مقیاس کوچیک‌تره اندازه می‌گیره و نشانگر رو جای
    // اشتباه می‌ذاره. offsetLeft/offsetWidth مقادیرِ layoutِ واقعی‌ان و از
    // transform روی والد اصلاً اثر نمی‌گیرن.
    const left = target.offsetLeft;

    if (!mounted.current) {
      indicator.style.left = `${left}px`;
      indicator.style.width = `${target.offsetWidth}px`;
      mounted.current = true;
      return;
    }
    animate(indicator, { left, width: target.offsetWidth, duration: 380, ease: "inOutQuad" });
  }, [active]);

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
