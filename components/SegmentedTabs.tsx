"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

// کنترل دوتکه‌ی شیشه‌ای با نشانگر لغزنده — همون کامپوننتی که زیر تب
// ورود/ثبت‌نام صفحه‌ی لاگینه، فقط عمومی‌شده تا هرجای دیگه‌ی اپ که «یکی از
// چند گزینه» انتخاب می‌شه عینا همون ظاهر و انیمیشن رو داشته باشه.
//
// بهینه‌سازی: نشانگر قبلا `left`/`width` رو با transition CSS می‌برد — هر دو
// prop layout ـن، پس هر فریم انیمیشن یک reflow کامل می‌داد. حالا نشانگر
// ثابت روی left:0 می‌شینه و فقط با `transform` (translate3d، و وقتی عرض دو
// گزینه فرق داره یک scaleX به روش FLIP) جابه‌جا می‌شه؛ یعنی کل انیمیشن روی
// compositor اجرا می‌شه و در حالت سکون (scaleX(1)) پیکسل‌به‌پیکسل همون قبلیه.
//
// RTL: offsetLeft و translateX هر دو فیزیکی (از چپ) هستن و نشانگر صریحا
// left:0 داره، پس جهت متن هیچ اثری روی محاسبه نداره.
//
// active می‌تونه null باشه (هنوز چیزی انتخاب نشده، مثلا «کجا تمرین
// می‌کنی؟») — نشانگر پنهان می‌مونه و با اولین انتخاب همون‌جا محو-ظاهر می‌شه.
export function SegmentedTabs<T extends string>({
  options,
  active,
  onChange,
  className,
  disabled = false,
  ariaLabel,
}: {
  // label معمولا متن است؛ ReactNode فقط برای موردی مثل نشان شمارنده کنار متن
  options: { value: T; label: React.ReactNode }[];
  active: T | null;
  onChange: (value: T) => void;
  /** کلاس اضافه روی ظرف (برای اندازه/فاصله‌ی مخصوص هر جا) */
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<T, HTMLButtonElement>>(new Map());
  const indicatorRef = useRef<HTMLSpanElement>(null);
  // آخرین جای نوشته‌شده‌ی نشانگر؛ null یعنی هنوز جای‌گیری نشده/پنهانه
  const last = useRef<{ x: number; w: number } | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  const place = useCallback((animate: boolean) => {
    const ind = indicatorRef.current;
    if (!ind) return;
    const cur = activeRef.current;
    const target = cur != null ? btnRefs.current.get(cur) : undefined;
    if (!target) {
      ind.style.opacity = "0";
      last.current = null;
      return;
    }
    // عمدا به‌جای getBoundingClientRect از offsetLeft/offsetWidth استفاده
    // می‌شه — پاپ‌آپ‌های میزبان (.modal-panel) موقع باز شدن انیمیشن
    // transform:scale دارن؛ getBoundingClientRect مقیاس کوچیک همون لحظه
    // رو می‌گیره، ولی offset* مقادیر layout واقعی‌ان و از transform والد
    // اثر نمی‌گیرن.
    const x = target.offsetLeft;
    const w = target.offsetWidth;
    const prev = last.current;
    if (prev && prev.x === x && prev.w === w) return;
    last.current = { x, w };

    if (!animate || !prev) {
      // اولین جای‌گیری/تغییر اندازه نباید انیمیشن بخوره (وگرنه نشانگر از
      // گوشه‌ی صفر پرواز می‌کنه سر جاش). خواندن offsetWidth یک reflow
      // اجباری می‌سازه تا با برداشتن no-anim، مقدار بالا «قدیمی» حساب نشه.
      ind.classList.add("no-anim");
      ind.style.width = `${w}px`;
      ind.style.transform = `translate3d(${x}px,0,0)`;
      void ind.offsetWidth;
      ind.classList.remove("no-anim");
      // از حالت پنهان (null) — فقط محو-ظاهر می‌شه، بدون لغزیدن
      ind.style.opacity = "";
      return;
    }
    if (prev.w === w) {
      ind.style.transform = `translate3d(${x}px,0,0)`;
      return;
    }
    // FLIP: عرض جدید یک‌جا نوشته می‌شه، ولی با scaleX دقیقا به شکل قبلی
    // برگردونده می‌شه و بعد فقط transform به حالت نهایی transition می‌خوره.
    ind.classList.add("no-anim");
    ind.style.width = `${w}px`;
    ind.style.transform = `translate3d(${prev.x}px,0,0) scaleX(${prev.w / w})`;
    void ind.offsetWidth;
    ind.classList.remove("no-anim");
    ind.style.transform = `translate3d(${x}px,0,0)`;
  }, []);

  const optionsKey = options.map((o) => o.value).join("\u0000");
  useLayoutEffect(() => {
    place(true);
  }, [active, optionsKey, place]);

  // عوض‌شدن عرض ظرف/برچسب‌ها (چرخش صفحه، لود دیرتر فونت، تغییر متن
  // گزینه) نشانگر رو از جاش درمی‌آورد — حالا بی‌انیمیشن دوباره جا می‌افته.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => place(false));
    ro.observe(container);
    btnRefs.current.forEach((b) => ro.observe(b));
    return () => ro.disconnect();
  }, [optionsKey, place]);

  return (
    <div
      className={`auth-tabs${className ? ` ${className}` : ""}`}
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      data-active={active ?? undefined}
    >
      <span className="auth-tab-indicator" ref={indicatorRef} aria-hidden />
      {options.map((opt) => (
        <button
          key={opt.value}
          ref={(el) => {
            if (el) btnRefs.current.set(opt.value, el);
            else btnRefs.current.delete(opt.value);
          }}
          type="button"
          role="radio"
          aria-checked={active === opt.value}
          disabled={disabled}
          className={`auth-tab${active === opt.value ? " active" : ""}`}
          onClick={() => opt.value !== active && onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
