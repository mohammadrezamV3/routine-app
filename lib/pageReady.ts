// «صفحه واقعا آماده‌ست؟» — برای اسپلش (BootSplash و lib/navSplash.ts): اسپلش نباید
// بره و پشتش هنوز اسپینر/اسکلت داده‌ی خود صفحه دیده بشه (درخواست صاحب محصول).
//
// صفحه «مشغول»ه وقتی داخل محتوای اصلی (.wrap) یکی از لودرهای داخل صفحه *دیده* بشه:
// PageLoader، LoadingBlock (.app-loading-block)، بخش‌های .is-loading، اسکلت‌ها
// (هر کلاسی که «skel» داره: db-skel، mg-skel-*، ts-skel، ...) یا Spinner خارج از
// دکمه/لینک. اسپینر داخل دکمه (مثلا «ذخیره...») لودینگ صفحه نیست و حساب نمی‌شه.
// آماده = SETTLE_MS پشت‌سرهم هیچ‌کدوم دیده نشه (تا لودر بعدی که بلافاصله جاش میاد
// هم شمرده بشه). همیشه سقف زمانی داره تا یک لودر گیرکرده اسپلش رو نگه نداره.

const BUSY_SELECTOR = [
  ".page-loader",
  ".app-loading-block",
  ".is-loading",
  '[class*="skel"]',
  '[aria-busy="true"]',
  ".tg-spinner",
].join(",");

const SETTLE_MS = 220;

function visible(el: Element): boolean {
  if (el.closest("button, a, [role=button], .tick-btn")) return false;
  const rects = el.getClientRects();
  if (!rects.length) return false;
  const r = rects[0];
  return r.width > 0 && r.height > 0;
}

/** همین الان لودری از خود صفحه دیده می‌شه؟ */
export function pageBusy(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.querySelector(".wrap") || document.body;
  const nodes = root.querySelectorAll(BUSY_SELECTOR);
  for (let i = 0; i < nodes.length; i++) if (visible(nodes[i])) return true;
  return false;
}

/**
 * وقتی صفحه SETTLE_MS پشت‌سرهم بدون لودر بود resolve می‌شه (حداکثر capMs).
 * signal برای لغو (مثلا ناوبری تازه قبل از آماده‌شدن قبلی).
 */
export function whenPageReady(capMs = 8000, signal?: { cancelled: boolean }): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve();
    const started = Date.now();
    let quietSince = 0;
    let raf = 0;
    const tick = () => {
      if (signal?.cancelled) return resolve();
      const now = Date.now();
      if (now - started >= capMs) return resolve();
      if (pageBusy()) quietSince = 0;
      else if (!quietSince) quietSince = now;
      else if (now - quietSince >= SETTLE_MS) return resolve();
      // هر ~100ms یک بار؛ ارزون‌تر از MutationObserver روی کل درخت در وسط رندر سنگین
      raf = window.setTimeout(tick, 100) as unknown as number;
    };
    tick();
    void raf;
  });
}
