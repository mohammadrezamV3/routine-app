// سرویس‌ورکر آریون — دو کار جدا:
//   ۱) Web Push (نمایش نوتیف و باز کردن تب)
//   ۲) کش app shell تا اپ بعد از اولین باز شدن، دیگه همه‌چیز رو از شبکه
//      نگیره و مثل یه اپ نصب‌شده سریع بالا بیاد.
//
// ── هشدار امنیتی (دلیل اصلی شکل این فایل) ─────────────────────────────
// این اپ احراز هویت دارد. اگر HTML صفحه‌های خصوصی (برنامه‌ی هفتگی، ترید،
// حساب کاربری) کش شود، روی یک موبایل مشترک صفحه‌ی کاربر قبلی به کاربر
// بعدی نشان داده می‌شود — یک نشت واقعی داده، نه یک ریسک تئوریک. برای
// همین:
//   • `/api/*` و `/auth/*` هیچ‌وقت کش نمی‌شوند (network-only).
//   • HTML فقط برای فهرست مشخصی از صفحه‌های *عمومی* کش می‌شود.
//   • بقیه‌ی HTML از شبکه می‌آید و اگر شبکه نبود، صفحه‌ی آفلاین.
//
// چیزی که واقعا سرعت را می‌سازد و کاملا امن است، `/_next/static/*` است:
// نام این فایل‌ها هش محتواست، پس برای همه‌ی کاربرها یکی‌ست و هیچ‌وقت
// بیات نمی‌شود (فایل عوض‌شده اسم جدید می‌گیرد).

// v2: صفحه‌هایی که سرور no-store/private فرستاده دیگه کش نمی‌شن؛ بالا بردن نسخه
// کش صفحه‌های قبلی (که ممکن بود HTML حالت واردشده یا مهمان باشن) رو پاک می‌کنه.
// v3: پاک‌کردن کش‌های قبلی که ممکن بود پاسخ‌های خراب (HTML پورتال/فیلترینگ با کد 200 زیر
// آدرس css/js) رو برای همیشه نگه داشته باشن؛ از این نسخه به بعد هر دارایی قبل از کش‌شدن
// و قبل از سرو از کش با content-type اعتبارسنجی می‌شه (isValidAsset).
const VERSION = "v3";
const SHELL_CACHE = `arion-shell-${VERSION}`;
const ASSET_CACHE = `arion-assets-${VERSION}`;
const PAGE_CACHE = `arion-pages-${VERSION}`;
const OFFLINE_URL = "/offline";

// فهرست کوتاه و ثابت — عمدا فقط چیزهایی که همیشه لازم‌اند
const PRECACHE = [OFFLINE_URL, "/icon.png", "/apple-icon.png", "/images/logo-icon.png"];

// صفحه‌های عمومی که کش‌کردن HTMLشان بی‌خطر است (هیچ داده‌ی کاربری ندارند)
const PUBLIC_PAGES = [
  "/", "/routine", "/habit-tracker", "/daily-planner", "/trading-journal",
  "/blog", "/faq", "/about", "/terms", OFFLINE_URL,
];

function isPublicPage(pathname) {
  return PUBLIC_PAGES.includes(pathname) || pathname.startsWith("/blog/");
}

// ── نصب: فقط پیش‌کش حداقلی ─────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // addAll اگر *یکی* از آدرس‌ها ۴۰۴ بدهد کل نصب را شکست می‌دهد و
      // سرویس‌ورکر هیچ‌وقت فعال نمی‌شود — یک خطای بی‌صدا که دیباگش سخت
      // است. پس تک‌تک و با تحمل خطا.
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

// ── فعال‌سازی: پاک‌کردن کش نسخه‌های قبلی ────────────────────────────────
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

  // ناوبری (درخواست یک صفحه‌ی HTML)
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  // دارایی‌های هش‌دار نکست: cache-first (نام فایل هش محتواست، هیچ‌وقت بیات نمی‌شه).
  // در dev نکست فایل‌ها هش ندارن (page.css، main-app.js)؛ اون‌ها رو دست نمی‌زنیم تا
  // نسخه‌ی بیات سرو نشه.
  if (isImmutableAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // بقیه‌ی فایل‌های ساکن (لوگو، آیکون، …) اسم هش‌دار ندارن و ممکنه عوض بشن:
  // stale-while-revalidate، یعنی سریع از کش و بی‌سروصدا تازه می‌شه.
  if (!url.pathname.startsWith("/_next/") && (url.pathname.startsWith("/images/") || STATIC_EXT.test(url.pathname))) {
    event.respondWith(staleWhileRevalidate(event));
  }
});

const STATIC_EXT = /\.(?:js|css|woff2?|png|jpg|jpeg|svg|webp|ico)$/;

/** /_next/static/ و اسم فایل هش‌دار (حداقل ۸ هگز) — فقط همین‌ها «تا ابد معتبر»ن */
function isImmutableAsset(pathname) {
  if (!pathname.startsWith("/_next/static/") || pathname.includes(".hot-update.")) return false;
  const base = pathname.slice(pathname.lastIndexOf("/") + 1);
  return /[0-9a-f]{8,}/.test(base);
}

/**
 * پاسخ واقعا همون چیزیه که آدرس ادعا می‌کنه؟ روی موبایل (پورتال وای‌فای، فیلترینگ
 * اپراتور، پروکسی) گاهی یه HTML با کد 200 زیر آدرس css/js برمی‌گرده؛ مرورگر با
 * nosniff ردش می‌کنه و اگه کش می‌شد، صفحه برای همیشه بدون استایل می‌موند.
 */
function isValidAsset(pathname, response) {
  if (!response || !response.ok || response.type !== "basic" || response.status !== 200) return false;
  const ct = (response.headers.get("content-type") || "").toLowerCase();
  if (/\.css$/.test(pathname)) return ct.includes("text/css");
  if (/\.js$/.test(pathname)) return ct.includes("javascript") || ct.includes("ecmascript");
  if (/\.(?:woff2?|ttf|otf)$/.test(pathname)) return !ct.includes("text/html") && !ct.includes("text/plain");
  if (/\.(?:png|jpe?g|webp|ico|svg)$/.test(pathname)) return ct.startsWith("image/");
  return !ct.includes("text/html");
}

/**
 * ناوبری: network-first.
 *
 * چرا network-first و نه cache-first: محتوای صفحه‌ها عوض می‌شود و کاربر
 * نباید نسخه‌ی بیات ببیند. کش فقط تور ایمنی نبود شبکه است — و برای
 * صفحه‌های عمومی، نسخه‌ی تازه بی‌سروصدا جایگزین می‌شود.
 */
async function handleNavigation(request, url) {
  try {
    const response = await fetch(request);
    // HTML یک صفحه‌ی «عمومی» هم وقتی layout با کوکی رندر می‌شه برای هر کاربر فرق
    // داره (سشن اولیه، داده‌ی inline کاربر)؛ سرور برای همین no-store/private
    // می‌فرسته. کش‌کردنش یعنی بعدا نسخه‌ی حالت مهمان به کاربر واردشده (یا داده‌ی
    // کاربر قبلی به نفر بعدی) نشون داده بشه — پس به هدر سرور احترام می‌ذاریم.
    if (response.ok && isPublicPage(url.pathname) && isShareableResponse(response)) {
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

function isShareableResponse(response) {
  const cc = (response.headers.get("cache-control") || "").toLowerCase();
  return !/(?:^|[\s,])(?:no-store|private)(?:$|[\s,=])/.test(cc);
}

/** فایل هش‌دار: اول کش (اگه سالم بود)، بعد شبکه؛ پاسخ سالم برای دفعه‌ی بعد کش می‌شه */
async function cacheFirst(request) {
  const pathname = new URL(request.url).pathname;
  const cached = await caches.match(request, { ignoreVary: true });
  if (cached) {
    if (isValidAsset(pathname, cached)) return cached;
    // ورودی خراب (از نسخه‌ی قبلی یا پاسخ بد) — دورش می‌ریزیم
    caches.open(ASSET_CACHE).then((c) => c.delete(request, { ignoreSearch: false })).catch(() => {});
  }
  try {
    const response = await fetch(request);
    if (isValidAsset(pathname, response)) {
      const copy = response.clone();
      caches.open(ASSET_CACHE).then((c) => c.put(request, copy)).catch(() => {});
    }
    return response;
  } catch (err) {
    const fallback = await caches.match(request, { ignoreSearch: true, ignoreVary: true });
    if (fallback && isValidAsset(pathname, fallback)) return fallback;
    throw err;
  }
}

/** فایل بدون هش: همون لحظه از کش، و هم‌زمان نسخه‌ی تازه رو می‌گیره */
async function staleWhileRevalidate(event) {
  const request = event.request;
  const pathname = new URL(request.url).pathname;
  const cached = await caches.match(request, { ignoreVary: true });
  const refresh = fetch(request)
    .then((response) => {
      if (isValidAsset(pathname, response)) {
        const copy = response.clone();
        caches.open(ASSET_CACHE).then((c) => c.put(request, copy)).catch(() => {});
      }
      return response;
    })
    .catch(() => null);
  // بدون این SW ممکنه قبل از نوشتن نسخه‌ی تازه در کش کشته بشه
  event.waitUntil(refresh);
  if (cached && isValidAsset(pathname, cached)) return cached;
  const fresh = await refresh;
  if (fresh) return fresh;
  return Response.error();
}

// ── پیش‌گرم‌کردن فونت و CSS ───────────────────────────────────────────────
// اسم فایل‌های فونت/CSS نکست هش‌دارن و موقع نصب SW معلوم نیستن؛ صفحه بعد از لود
// فهرست چیزهایی که واقعا استفاده کرده رو می‌فرسته (lib/assetRecovery.ts) تا بعدا
// اجرای PWA/آفلاین هیچ‌وقت به فونت دستگاه سقوط نکنه.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "warm" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      for (const raw of data.urls.slice(0, 24)) {
        try {
          const u = new URL(String(raw), self.location.origin);
          if (u.origin !== self.location.origin || !isImmutableAsset(u.pathname)) continue;
          const req = new Request(u.pathname + u.search);
          if (await cache.match(req, { ignoreVary: true })) continue;
          const res = await fetch(req);
          if (isValidAsset(u.pathname, res)) await cache.put(req, res);
        } catch {
          /* یکی نشد، بقیه ادامه */
        }
      }
    })()
  );
});

// ── Web Push ────────────────────────────────────────────────────────────
// هر یادآوری یک `deadline` (لحظه‌ی شروع برنامه، epoch ms) داره. سرور TTL
// پوش رو هم تا همون لحظه می‌ذاره، ولی اگه پیامی به هر دلیل دیر رسید (دستگاه
// تازه آنلاین شد) بعد از شروع برنامه دیگه نشون داده نمی‌شه — درخواست صریح:
// «اگه نتونست بده، بعد از شروع برنامه دیگه بهش نوتیف نده».
// `tag` همون کلید یادآوریه تا نسخه‌ی تب‌باز و پوش سرور دوتا نشن.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Arion", body: event.data.text() };
  }
  if (typeof payload.deadline === "number" && Date.now() >= payload.deadline) return;
  const title = payload.title || "Arion";
  const options = {
    body: payload.body || "",
    icon: "/images/logo-icon.png",
    badge: "/images/logo-icon.png",
    data: { url: payload.url || "/" },
    timestamp: Date.now(),
  };
  if (payload.tag) options.tag = String(payload.tag);
  event.waitUntil(self.registration.showNotification(title, options));
});

// مرورگر گاهی سابسکریپشن رو خودش عوض می‌کنه (انقضا/چرخش کلید). بدون این،
// سرور تا وقتی کاربر دوباره اپ رو باز کنه به endpoint مرده پوش می‌فرستاد و
// هیچ یادآوری‌ای نمی‌رسید.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const old = event.oldSubscription;
      let sub = event.newSubscription;
      const key = old && old.options && old.options.applicationServerKey;
      if (!sub && key) {
        sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      }
      if (!sub) return;
      const json = sub.toJSON();
      let timezone;
      try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch {}
      await fetch("/api/push/subscribe", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, timezone, previousEndpoint: old ? old.endpoint : undefined }),
      });
    })().catch(() => {})
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
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
