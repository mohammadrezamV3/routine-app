// خودترمیمی لود دارایی‌ها (CSS/JS چانک‌ها) — فقط سمت کلاینت، بدون پولینگ.
//
// چرا لازمه: روی موبایل (خصوصا آیفون با شبکه‌ی ناپایدار یا بعد از دیپلوی جدید که
// چانک‌های بیلد قبلی از سرور رفتن) یک <link rel=stylesheet> یا چانک JS ممکنه شکست
// بخوره. React/نکست در این حالت برای استایل‌شیت فقط «ادامه می‌ده» (صفحه بدون CSS
// می‌مونه، آیکون‌های SVG تمام‌عرض می‌شن) و برای چانک JS خطای ChunkLoadError می‌ده؛
// هیچ‌کدوم خودشون ترمیم نمی‌شن تا کاربر دستی رفرش کنه.
//
// استراتژی: ۱) برای CSS اول یک دوباره‌تلاش درجا (بدون از دست رفتن حالت صفحه)،
// ۲) در غیر این صورت یک ریلود کامل *نگهبان‌دار* (sessionStorage) تا حلقه نشه.

export const RELOAD_KEY = "arion:assetReload";
/** حداکثر ریلود خودکار در هر پنجره‌ی زمانی */
export const MAX_RELOADS = 2;
export const RELOAD_WINDOW_MS = 5 * 60_000;
/** حداقل فاصله‌ی دو ریلود خودکار */
export const MIN_GAP_MS = 8_000;

type GuardState = { n: number; t: number; first: number };

function parseGuard(raw: string | null): GuardState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<GuardState>;
    if (typeof v.n === "number" && typeof v.t === "number") {
      return { n: v.n, t: v.t, first: typeof v.first === "number" ? v.first : v.t };
    }
  } catch { /* مقدار خراب = بدون سابقه */ }
  return null;
}

/** آیا الان اجازه‌ی یک ریلود خودکار دیگه هست؟ (خالص، تست‌دار) */
export function canAutoReload(raw: string | null, now: number): boolean {
  const g = parseGuard(raw);
  if (!g) return true;
  if (now - g.t < MIN_GAP_MS) return false;
  if (now - g.first > RELOAD_WINDOW_MS) return true; // پنجره‌ی قبلی تموم شده
  return g.n < MAX_RELOADS;
}

/** مقدار جدید نگهبان بعد از ثبت یک ریلود */
export function nextGuard(raw: string | null, now: number): string {
  const g = parseGuard(raw);
  if (!g || now - g.first > RELOAD_WINDOW_MS) return JSON.stringify({ n: 1, t: now, first: now });
  return JSON.stringify({ n: g.n + 1, t: now, first: g.first });
}

/** پیام/نام خطای مربوط به شکست لود چانک (وبپک و نکست) */
export function isChunkErrorLike(x: unknown): boolean {
  if (!x) return false;
  const o = x as { name?: unknown; message?: unknown };
  const name = typeof o.name === "string" ? o.name : "";
  const msg = typeof o.message === "string" ? o.message : typeof x === "string" ? x : "";
  if (name === "ChunkLoadError" || name === "CSSChunkLoadError") return true;
  return /Loading (CSS )?chunk [\w\-./]+ failed|ChunkLoadError|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(msg);
}

/** آدرس دارایی ساکن همین سایت (چانک/استایل/فونت نکست)؟ */
export function isStaticAssetUrl(href: string | null | undefined, origin: string): boolean {
  if (!href) return false;
  try {
    const u = new URL(href, origin);
    return u.origin === origin && u.pathname.startsWith("/_next/static/");
  } catch {
    return false;
  }
}

/** پاسخ دوباره‌تلاش CSS سالمه؟ (status و content-type) */
export function isGoodCssResponse(status: number, contentType: string | null): boolean {
  return status >= 200 && status < 300 && /text\/css/i.test(contentType || "");
}

/** آدرس‌هایی که SW باید پیش‌گرم کنه (فونت و CSS هش‌دار) — از اسم‌های resource timing */
export function warmableUrls(names: string[], origin: string): string[] {
  const out = new Set<string>();
  for (const n of names) {
    try {
      const u = new URL(n, origin);
      if (u.origin !== origin) continue;
      if (/^\/_next\/static\/(?:media\/.+\.(?:woff2?|ttf|otf)|css\/.+\.css)$/.test(u.pathname)) out.add(u.pathname + u.search);
    } catch { /* نامعتبر */ }
  }
  return Array.from(out).slice(0, 24);
}

// ───────────────────────── بخش مرورگر ─────────────────────────

let recovering = false;
const retries = new Map<string, number>();

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function whenOnline(): Promise<void> {
  if (typeof navigator === "undefined" || navigator.onLine !== false) return Promise.resolve();
  return new Promise((r) => window.addEventListener("online", () => r(), { once: true }));
}

/** کش دارایی‌های سرویس‌ورکر رو پاک می‌کنه تا ریلود چیز خرابی رو از کش نگیره */
async function purgeAssetCaches(): Promise<void> {
  try {
    if (!("caches" in window)) return;
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("arion-assets-")).map((k) => caches.delete(k)));
  } catch { /* بی‌اهمیت */ }
}

function editingNow(): boolean {
  const a = document.activeElement as HTMLElement | null;
  if (!a) return false;
  const tag = a.tagName;
  return tag === "TEXTAREA" || a.isContentEditable || (tag === "INPUT" && !!(a as HTMLInputElement).value);
}

/** یک ریلود کامل نگهبان‌دار. هیچ‌وقت حلقه نمی‌شه (حداکثر MAX_RELOADS در RELOAD_WINDOW_MS). */
export async function hardRecover(reason: string, opts: { skipIfEditing?: boolean } = {}): Promise<void> {
  if (recovering) return;
  recovering = true;
  try {
    await whenOnline(); // آفلاین ریلود = صفحه‌ی آفلاین؛ منتظر برگشت شبکه می‌مونیم
    if (opts.skipIfEditing && editingNow()) return;
    let raw: string | null = null;
    try { raw = sessionStorage.getItem(RELOAD_KEY); } catch { /* حالت ناشناس */ }
    if (!canAutoReload(raw, Date.now())) {
      // سقف رسید: دیگه ریلود نمی‌کنیم (جلوگیری از حلقه)، فقط اجازه‌ی تلاش بعدی بعد از پنجره
      console.warn("[assets] recovery skipped (reload guard):", reason);
      return;
    }
    try { sessionStorage.setItem(RELOAD_KEY, nextGuard(raw, Date.now())); } catch { /* بی‌اهمیت */ }
    console.info("[assets] recovering with one reload:", reason);
    await Promise.race([purgeAssetCaches(), sleep(1500)]);
    window.location.reload();
  } finally {
    // اگه ریلود انجام نشد (سقف/ویرایش) بعد از مدتی دوباره می‌تونه تلاش کنه
    setTimeout(() => { recovering = false; }, 15_000);
  }
}

/** یک استایل‌شیت شکست‌خورده: اول دوباره‌تلاش درجا، آخرش ریلود نگهبان‌دار */
async function healStylesheet(link: HTMLLinkElement): Promise<void> {
  const href = link.href;
  const tries = retries.get(href) ?? 0;
  if (tries >= 2) { void hardRecover("css:" + href); return; }
  retries.set(href, tries + 1);
  await whenOnline();
  await sleep(700 * (tries + 1));
  try {
    // کش HTTP و کش سرویس‌ورکر هر دو دور زده می‌شن
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith("arion-assets-")).map((k) => caches.open(k).then((c) => c.delete(href))));
      }
    } catch { /* بی‌اهمیت */ }
    const res = await fetch(href, { cache: "reload", credentials: "same-origin" });
    if (isGoodCssResponse(res.status, res.headers.get("content-type"))) {
      const fresh = document.createElement("link");
      fresh.rel = "stylesheet";
      fresh.href = href;
      fresh.setAttribute("data-arion-retry", "1");
      // درست بعد از لینک خراب تا ترتیب کسکید عوض نشه
      link.parentNode?.insertBefore(fresh, link.nextSibling);
      return; // اگه این هم خطا بده، لیسنر capture دوباره صدا می‌زنه (tries بالاتر)
    }
    // فایل از سرور رفته (دیپلوی جدید) یا چیز غیر CSS برگشته → صفحه‌ی بیات
    void hardRecover("css-stale:" + res.status);
  } catch {
    // خطای شبکه: یک نوبت دیگه
    void healStylesheet(link);
  }
}

function hasLoadedSheetFor(href: string): boolean {
  const all = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
  for (let i = 0; i < all.length; i++) if (all[i].href === href && all[i].sheet) return true;
  return false;
}

/** بررسی ارزون: هر استایل‌شیت چانک‌های نکست که بعد از لود هنوز sheet نداره */
function findBrokenStylesheets(): HTMLLinkElement[] {
  const out: HTMLLinkElement[] = [];
  const links = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href*="/_next/static/css/"]');
  for (let i = 0; i < links.length; i++) {
    const l = links[i];
    if (l.sheet || l.disabled || hasLoadedSheetFor(l.href)) continue;
    out.push(l);
  }
  return out;
}

let checkTimer: ReturnType<typeof setTimeout> | null = null;
/** بعد از لود/ناوبری، یک بار (با یک تکرار دیرتر) سلامت استایل‌شیت‌ها رو می‌سنجه */
export function scheduleStyleCheck(delayMs = 4000): void {
  if (typeof window === "undefined") return;
  if (checkTimer) clearTimeout(checkTimer);
  checkTimer = setTimeout(() => {
    checkTimer = null;
    if (document.visibilityState === "hidden") return;
    if (!findBrokenStylesheets().length) return;
    // شاید فقط کنده (شبکه‌ی کند)؛ یک بار دیگه بعد از ۶ ثانیه نگاه می‌کنیم
    setTimeout(() => {
      for (const l of findBrokenStylesheets()) void healStylesheet(l);
    }, 6000);
  }, delayMs);
}

/** چانک‌های همین بیلد هنوز روی سرورن؟ ۴۰۴ یعنی دیپلوی جدید اومده و این صفحه بیاته */
async function checkStaleBuild(): Promise<void> {
  const s = document.querySelector<HTMLScriptElement>('script[src*="/_next/static/chunks/"]');
  if (!s || !s.src) return;
  try {
    const res = await fetch(s.src, { method: "HEAD", cache: "no-store", credentials: "omit" });
    if (res.status === 404) void hardRecover("stale-build", { skipIfEditing: true });
  } catch { /* آفلاین/شبکه: چیزی نمی‌گیم */ }
}

const HIDDEN_STALE_MS = 5 * 60_000;
const WARM_KEY = "arion:swWarm";

/** فونت و CSS الان استفاده‌شده رو به سرویس‌ورکر می‌دیم تا برای اجرای بعدی (آفلاین/PWA) کش باشن */
function warmServiceWorker(): void {
  try {
    if (!("serviceWorker" in navigator)) return;
    if (sessionStorage.getItem(WARM_KEY)) return;
    const names = performance.getEntriesByType("resource").map((e) => e.name);
    const urls = warmableUrls(names, window.location.origin);
    if (!urls.length) return;
    navigator.serviceWorker.ready.then((reg) => {
      if (!reg.active) return;
      reg.active.postMessage({ type: "warm", urls });
      try { sessionStorage.setItem(WARM_KEY, "1"); } catch { /* بی‌اهمیت */ }
    }).catch(() => {});
  } catch { /* بی‌اهمیت */ }
}

/** لیسنرها رو نصب می‌کنه؛ تابع پاک‌سازی برمی‌گردونه */
export function installAssetRecovery(): () => void {
  if (typeof window === "undefined") return () => {};
  const origin = window.location.origin;

  // error روی <link>/<script> حباب نمی‌زنه؛ فقط در فاز capture روی window دیده می‌شه
  const onError = (e: Event) => {
    const t = e.target as Element | null;
    if (t && t !== (window as unknown as Element)) {
      if (t instanceof HTMLLinkElement && t.rel === "stylesheet" && isStaticAssetUrl(t.href, origin)) {
        void healStylesheet(t);
      } else if (t instanceof HTMLScriptElement && isStaticAssetUrl(t.src, origin)) {
        void hardRecover("script:" + t.src);
      }
      return;
    }
    const ee = e as ErrorEvent;
    if (isChunkErrorLike(ee.error) || isChunkErrorLike(ee.message)) void hardRecover("chunk-error");
  };
  const onRejection = (e: PromiseRejectionEvent) => {
    if (isChunkErrorLike(e.reason)) void hardRecover("chunk-rejection");
  };

  let hiddenAt = 0;
  const onVisibility = () => {
    if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > HIDDEN_STALE_MS) void checkStaleBuild();
    hiddenAt = 0;
  };
  // برگشت از bfcache هم مثل ناوبری تازه سنجیده می‌شه
  const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) scheduleStyleCheck(1500); };

  window.addEventListener("error", onError, true);
  window.addEventListener("unhandledrejection", onRejection);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pageshow", onPageShow);

  // پس از لود کامل و در زمان بیکاری
  const idle = (cb: () => void) => {
    const ric = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(cb, { timeout: 6000 }); else setTimeout(cb, 3000);
  };
  const onReady = () => { idle(warmServiceWorker); };
  if (document.readyState === "complete") onReady();
  else window.addEventListener("load", onReady, { once: true });
  scheduleStyleCheck();

  return () => {
    window.removeEventListener("error", onError, true);
    window.removeEventListener("unhandledrejection", onRejection);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("load", onReady);
    if (checkTimer) { clearTimeout(checkTimer); checkTimer = null; }
  };
}
