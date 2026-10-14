// انیمیشن‌های کوچک UI با Web Animations API (به‌جای anime.js — ۳۵ کیلوبایت در باندل هر صفحه بود).
// رفتار انیمیشن‌ها با نسخه‌ی قبلی (anime.js) یکسانه: همون مدت و ایزینگ؛ مقدار نهایی بعد از
// پایان روی style اینلاین می‌مونه (مثل anime.js) و انیمیشن آزاد می‌شه.

/** ایزینگ‌های anime.js معادل cubic-bezier */
export const EASE = {
  outQuad: "cubic-bezier(0.5, 1, 0.89, 1)",
  outBack: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

type Fx = { opacity?: [number, number]; translateY?: [number, number]; scale?: [number, number] };

function frame(fx: Fx, i: 0 | 1): Keyframe {
  const k: Keyframe = {};
  if (fx.opacity) k.opacity = String(fx.opacity[i]);
  const t: string[] = [];
  if (fx.translateY) t.push(`translateY(${fx.translateY[i]}px)`);
  if (fx.scale) t.push(`scale(${fx.scale[i]})`);
  if (t.length) k.transform = t.join(" ");
  return k;
}

/** یک انیمیشن from→to روی عنصر؛ مقدار نهایی رو اینلاین نگه می‌داره (مثل anime.js). */
export function animateIn(el: HTMLElement, fx: Fx, opts: { duration: number; delay?: number; easing?: string }) {
  const to = frame(fx, 1);
  const apply = () => {
    if (to.opacity !== undefined) el.style.opacity = String(to.opacity);
    if (to.transform !== undefined) el.style.transform = String(to.transform);
  };
  if (typeof el.animate !== "function") { apply(); return; }
  const a = el.animate([frame(fx, 0), to], {
    duration: opts.duration,
    delay: opts.delay ?? 0,
    easing: opts.easing ?? EASE.outQuad,
    fill: "backwards",
  });
  apply();
  a.onfinish = () => a.cancel();
  a.oncancel = () => undefined;
}

/** ورود مرحله‌ای فیلدهای فرم هنگام mount — هر فیلد کمی دیرتر از قبلی */
export function staggerFieldsIn(container: HTMLElement | null) {
  if (!container) return;
  const fields = container.querySelectorAll<HTMLElement>("[data-anim-field]");
  if (!fields.length) return;
  fields.forEach((f, i) =>
    animateIn(f, { opacity: [0, 1], translateY: [14, 0] }, { duration: 420, delay: 55 * i })
  );
}

/** نمایان‌شدن مرحله‌ای عناصر هنگام اسکرول (برای کارت‌های ویژگی صفحه لندینگ) — یک‌بار برای هر عنصر */
export function revealOnScroll(container: HTMLElement | null) {
  if (!container) return;
  const targets = container.querySelectorAll<HTMLElement>("[data-reveal]");
  if (!targets.length) return;
  targets.forEach((el) => { el.style.opacity = "0"; });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateIn(entry.target as HTMLElement, { opacity: [0, 1], translateY: [22, 0] }, { duration: 560 });
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.2 }
  );
  targets.forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}
