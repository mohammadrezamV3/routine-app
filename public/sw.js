// سرویس‌ورکر آریون — دو کار جدا:
//   ۱) Web Push (نمایش نوتیف و باز کردن تب)
//   ۲) کشِ app shell تا اپ بعد از اولین باز شدن، دیگه همه‌چیز رو از شبکه
//      نگیره و مثل یه اپ نصب‌شده سریع بالا بیاد.
//
// ── هشدار امنیتی (دلیلِ اصلیِ شکلِ این فایل) ─────────────────────────────
// این اپ احراز هویت دارد. اگر HTML صفحه‌های خصوصی (برنامه‌ی هفتگی، ترید،
// حساب کاربری) کش شود، روی یک موبایلِ مشترک صفحه‌ی کاربرِ قبلی به کاربرِ
// بعدی نشان داده می‌شود — یک نشتِ واقعیِ داده، نه یک ریسکِ تئوریک. برای
// همین:
//   • `/api/*` و `/auth/*` هیچ‌وقت کش نمی‌شوند (network-only).
//   • HTML فقط برای فهرستِ مشخصی از صفحه‌های *عمومی* کش می‌شود.
//   • بقیه‌ی HTML از شبکه می‌آید و اگر شبکه نبود، صفحه‌ی آفلاین.
//
// چیزی که واقعا سرعت را می‌سازد و کاملا امن است، `/_next/static/*` است:
// نامِ این فایل‌ها هشِ محتواست، پس برای همه‌ی کاربرها یکی‌ست و هیچ‌وقت
// بیات نمی‌شود (فایلِ عوض‌شده اسمِ جدید می‌گیرد).

const VERSION = "v1";
const SHELL_CACHE = `arion-shell-${VERSION}`;
const ASSET_CACHE = `arion-assets-${VERSION}`;
const PAGE_CACHE = `arion-pages-${VERSION}`;
const OFFLINE_URL = "/offline";

// فهرستِ کوتاه و ثابت — عمدا فقط چیزهایی که همیشه لازم‌اند
const PRECACHE = [OFFLINE_URL, "/icon.png", "/apple-icon.png", "/images/logo-icon.png"];

// صفحه‌های عمومی که کش‌کردنِ HTMLشان بی‌خطر است (هیچ داده‌ی کاربری ندارند)
const PUBLIC_PAGES = [
  "/", "/routine", "/habit-tracker", "/daily-planner", "/trading-journal",
  "/blog", "/faq", "/about", "/terms", OFFLINE_URL,
];

function isPublicPage(pathname) {
  return PUBLIC_PAGES.includes(pathname) || pathname.startsWith("/blog/");
}

// ── نصب: فقط پیش‌کشِ حداقلی ─────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // addAll اگر *یکی* از آدرس‌ها ۴۰۴ بدهد کلِ نصب را شکست می‌دهد و
      // سرویس‌ورکر هیچ‌وقت فعال نمی‌شود — یک خطای بی‌صدا که دیباگش سخت
      // است. پس تک‌تک و با تحملِ خطا.
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

// ── فعال‌سازی: پاک‌کردن کشِ نسخه‌های قبلی ────────────────────────────────
self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, ASSET_CACHE, PAGE_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("arion-") && !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── واکشی ───────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // دامنه‌های دیگر (مثلا اینماد) را دست نمی‌زنیم
  if (url.origin !== self.location.origin) return;

  // داده‌ی کاربر و مسیرهای auth: همیشه از شبکه، هیچ‌وقت کش
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // ناوبری (درخواستِ یک صفحه‌ی HTML)
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  // فایل‌های ساکن: cache-first. این‌جا همان جایی‌ست که سرعت به دست می‌آید.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/images/") || /\.(?:js|css|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

/**
 * ناوبری: network-first.
 *
 * چرا network-first و نه cache-first: محتوای صفحه‌ها عوض می‌شود و کاربر
 * نباید نسخه‌ی بیات ببیند. کش فقط تورِ ایمنیِ نبودِ شبکه است — و برای
 * صفحه‌های عمومی، نسخه‌ی تازه بی‌سروصدا جایگزین می‌شود.
 */
async function handleNavigation(request, url) {
  try {
    const response = await fetch(request);
    if (response.ok && isPublicPage(url.pathname)) {
      const copy = response.clone();
      caches.open(PAGE_CACHE).then((c) => c.put(request, copy)).catch(() => {});
    }
    return response;
  } catch {
    // شبکه نبود
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("آفلاین هستید.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/** فایل ساکن: اول کش، بعد شبکه (و نتیجه را برای دفعه‌ی بعد نگه می‌دارد) */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    // فقط پاسخ‌های سالم و کاملِ خودِ همین دامنه کش می‌شوند (نه opaque/partial)
    if (response.ok && response.type === "basic") {
      const copy = response.clone();
      caches.open(ASSET_CACHE).then((c) => c.put(request, copy)).catch(() => {});
    }
    return response;
  } catch (err) {
    const fallback = await caches.match(request, { ignoreSearch: true });
    if (fallback) return fallback;
    throw err;
  }
}

// ── Web Push (دست‌نخورده از نسخه‌ی قبل) ─────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Arion", body: event.data.text() };
  }
  const title = payload.title || "Arion";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/images/logo-icon.png",
      badge: "/images/logo-icon.png",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
