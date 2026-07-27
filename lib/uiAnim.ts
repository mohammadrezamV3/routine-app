import { animate, stagger } from "animejs";

/** ورود مرحله‌ای فیلدهای فرم هنگام mount — هر فیلد کمی دیرتر از قبلی */
export function staggerFieldsIn(container: HTMLElement | null) {
  if (!container) return;
  const fields = container.querySelectorAll<HTMLElement>("[data-anim-field]");
  if (!fields.length) return;
  animate(fields, {
    opacity: [0, 1],
    translateY: [14, 0],
    duration: 420,
    delay: stagger(55),
    ease: "outQuad",
  });
}

/** لرزش کوتاه برای فیلدهای نامعتبر بعد از تلاش ثبت فرم */
export function shakeFields(els: (HTMLElement | null | undefined)[]) {
  const targets = els.filter(Boolean) as HTMLElement[];
  if (!targets.length) return;
  animate(targets, {
    translateX: [0, -6, 6, -4, 4, 0],
    duration: 420,
    ease: "inOutQuad",
  });
}
