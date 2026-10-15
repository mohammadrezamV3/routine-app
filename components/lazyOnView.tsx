"use client";

import { useEffect, useId, useRef, useState, type ComponentType } from "react";

// هیدریشن تنبل بخش‌های زیر صفحه (لندینگ، درباره ما، ...): HTML کامل بخش از
// سرور میاد (سئو + اولین نقاشی + بدون پرش چیدمان)، ولی JS اون بخش فقط وقتی
// دانلود و اجرا می‌شه که نزدیک صفحه‌ی نمایش برسه (یا کاربر بهش دست بزنه).
//
// چطور کار می‌کنه: سرور بخش رو عادی رندر می‌کنه. کلاینت در هیدریشن اولیه به‌جای
// بخش، یک div با dangerouslySetInnerHTML خالی + suppressHydrationWarning
// رندر می‌کنه؛ ری‌اکت در این حالت بچه‌های DOM سرور رو دست‌نخورده می‌ذاره و
// هیچ JSی از اون بخش لازم نداره. وقتی نزدیک دید شد، ماژول با import پویا
// میاد و بخش واقعی جایگزین HTML ساکن می‌شه (همون خروجی، پس بدون پرش).
// (React.lazy + Suspense اینجا جواب نمی‌ده: ری‌اکت 18 مرز خشک رو که اولین
// تلاشش معلق بشه دور می‌ریزه و فال‌بک کلاینتی نشون می‌ده.)

function whenNear(el: HTMLElement, margin: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof IntersectionObserver === "undefined") return resolve();
    let io: IntersectionObserver | null = null;
    const fin = () => {
      io?.disconnect();
      window.removeEventListener("hashchange", fin);
      el.removeEventListener("pointerdown", fin);
      el.removeEventListener("focusin", fin);
      resolve();
    };
    io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) fin(); }, { rootMargin: margin });
    io.observe(el);
    window.addEventListener("hashchange", fin);
    el.addEventListener("pointerdown", fin, { passive: true });
    el.addEventListener("focusin", fin);
  });
}

/**
 * `load`: import پویا (فقط کلاینت). `sync`: require فقط سرور که باید داخل
 * شاخه‌ی `typeof window === "undefined"` ساخته بشه تا webpack اون رو از باندل
 * کلاینت حذف کنه (null روی کلاینت). `minHeight` فقط برای ناوبری کلاینتی.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComp = ComponentType<any>;
export function lazySection<P extends object = object>(load: () => Promise<{ default: AnyComp }>, sync: (() => AnyComp) | null, minHeight: number, margin = "350px 0px") {
  return function LazySectionBody(props: P) {
    const ref = useRef<HTMLDivElement>(null);
    const uid = useId();
    // HTML سروریِ همین بخش (فقط هنگام هیدریشن موجوده). اگه ری‌اکت innerHTML رو
    // دوباره بنویسه، همین رشته نوشته می‌شه و محتوا نمی‌پره.
    const [html] = useState(() =>
      typeof document === "undefined" ? "" : document.querySelector(`[data-lz="${uid}"]`)?.innerHTML ?? "");
    const [Body, setBody] = useState<AnyComp | null>(null);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      // ناوبری کلاینتی (HTML سروری در کار نیست): جاگیر تا همه‌ی بخش‌ها با هم فعال نشن
      if (!el.firstChild) el.style.minHeight = `${minHeight}px`;
      let alive = true;
      whenNear(el, margin)
        .then(load)
        .then((m) => { if (alive) { el.style.minHeight = ""; setBody(() => m.default); } })
        .catch(() => {});
      return () => { alive = false; };
    }, []);

    if (sync) {
      const S = sync();
      return <div ref={ref} data-lz={uid}><S {...props} /></div>;
    }
    if (!Body) return <div ref={ref} data-lz={uid} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
    return <div ref={ref} data-lz={uid}><Body {...props} /></div>;
  };
}
