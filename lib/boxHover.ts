// نور هاور دور همه‌ی باکس‌ها — همان افکت کارت‌های بنتو داشبورد (BentoCard،
// `.db-card::before` در app/dashboard/dashboard.css) برای کل اپ.
//
// فهرست باکس‌ها فقط یک جا هست: بلاک «نور هاور دور باکس‌ها» در
// app/globals.css. آن قانون روی هر باکس مارکر `--box-hover:1` می‌گذارد
// (@property با inherits:false، پس فرزندان صفر می‌مانند). این‌جا فقط با یک
// شنونده‌ی pointermove روی document، جد(های) مارک‌شده‌ی زیر موس پیدا و
// مختصات موس نسبت به هرکدام در --mx/--my نوشته می‌شود — دقیقا همان کاری که
// BentoCard برای کارت خودش می‌کند. هیچ کامپوننتی لازم نیست چیزی بداند.
//
// فقط روی دستگاه با هاور واقعی (hover:hover و pointer:fine)؛ روی لمسی
// شنونده اصلا کاری نمی‌کند. با rAF محدود می‌شود و نتیجه‌ی getComputedStyle
// هر عنصر کش می‌شود، پس هر حرکت موس فقط چند getBoundingClientRect است.

const MARK = "--box-hover";

export function installBoxHover(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  const mq = window.matchMedia("(hover:hover) and (pointer:fine)");
  const cache = new WeakMap<Element, boolean>();
  let raf = 0;
  let lastTarget: EventTarget | null = null;
  let boxes: HTMLElement[] = [];
  let x = 0;
  let y = 0;

  const isBox = (el: Element): boolean => {
    let v = cache.get(el);
    if (v === undefined) {
      v = getComputedStyle(el).getPropertyValue(MARK).trim() === "1";
      cache.set(el, v);
    }
    return v;
  };

  const collect = (target: EventTarget | null): HTMLElement[] => {
    const out: HTMLElement[] = [];
    let n = target instanceof Element ? target : null;
    while (n && n !== document.body && n !== document.documentElement) {
      if (n instanceof HTMLElement && isBox(n)) out.push(n);
      n = n.parentElement;
    }
    return out;
  };

  const flush = () => {
    raf = 0;
    for (const el of boxes) {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${x - r.left}px`);
      el.style.setProperty("--my", `${y - r.top}px`);
    }
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || !mq.matches) return;
    x = e.clientX;
    y = e.clientY;
    if (e.target !== lastTarget) {
      lastTarget = e.target;
      boxes = collect(e.target);
    }
    if (boxes.length && !raf) raf = requestAnimationFrame(flush);
  };

  document.addEventListener("pointermove", onMove, { passive: true });
  return () => {
    document.removeEventListener("pointermove", onMove);
    if (raf) cancelAnimationFrame(raf);
  };
}
