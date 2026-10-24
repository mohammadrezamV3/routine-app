// سرویس‌ورکر آریون — سه کار:
//   ۱) Web Push (نمایش نوتیف و باز کردن تب)
//   ۲) کش app shell و دارایی‌ها تا اپ سریع بالا بیاد
//   ۳) حالت آفلاین: اپ نصب‌شده برای کاربر واردشده بدون اینترنت باز بشه و بین
//      صفحه‌هایی که قبلا دیده (یا پیش‌گرم شده) جابه‌جا بشه. داده‌ی خود صفحه‌ها
//      (JSON /api) کار این فایل نیست؛ لایه‌ی کلاینت (lib/offline/*) از IndexedDB پرشون می‌کنه.
//
// ── قرارداد امنیتی (دلیل اصلی شکل این فایل) ─────────────────────────────
// HTML صفحه‌های خصوصی هیچ‌وقت در کش مشترک نمی‌ره. قانون قدیمی «no-store/private
// کش نمی‌شه» برای این بود که صفحه‌ی مهمان یا کاربر دیگه بعد از عوض‌شدن هویت نشون
// داده نشه. این قانون حالا با ساختار زیر حفظ می‌شه، نه با نادیده‌گرفتن هدر سرور:
//   • کش صفحه‌ها *به‌ازای هر کاربر* جداست (`arion-user-pages-<userId>`)؛ کاربر B
//     عملا به کش کاربر A دسترسی نداره.
//   • فقط وقتی کاربر فعلی از صفحه اعلام شده (پیام `arion-user`) چیزی نوشته یا
//     خونده می‌شه؛ مهمان (null) = هیچ صفحه‌ی خصوصی نه نوشته می‌شه نه سرو می‌شه.
//   • کش فقط وقتی شبکه نیست (یا خیلی کنده) سرو می‌شه؛ آنلاین همیشه نسخه‌ی تازه‌ی سرور.
//   • عوض‌شدن کاربر، null شدن (خروج تاییدشده) و `arion-wipe` همه‌ی کش‌های کاربری رو
//     پاک می‌کنن؛ یک fetch نیمه‌کاره‌ی قبل از پاک‌سازی هم دیگه چیزی نمی‌نویسه (epoch).
//   • فقط یک فهرست سفید از مسیرهای اپ کش می‌شه (ادمین، پرداخت، ورود، منتور و صفحه‌های
//     امنیتی حساب نه)؛ پاسخ ریدایرکت‌شده (مثلا نشست منقضی → صفحه‌ی ورود) هیچ‌وقت کش نمی‌شه.
//   • `/api/*` و `/auth/*` و هر غیر GET هیچ‌وقت لمس نمی‌شن.
//
// محدودیت شناخته‌شده: SW هویت واقعی کوکی رو نمی‌بینه و به پیام `arion-user` صفحه اعتماد
// می‌کنه. اگه کوکی نشست بدون خروج عوض بشه، تا رسیدن پیام بعدی صفحه (چند ثانیه بعد از لود)
// یک صفحه ممکنه زیر کاربر قبلی بنشینه؛ اون پیام کش رو پاک می‌کنه و چون سرو فقط آفلاین
// اتفاق می‌افته، عملا قابل بهره‌برداری نیست.
//
// ── چرخه‌ی به‌روزرسانی ──────────────────────────────────────────────────
// skipWaiting + clients.claim نگه داشته شده و ایمنه چون: کش دارایی‌های هش‌دار و کش
// کاربر بین نسخه‌ها پاک نمی‌شن (فقط کش‌های ناشناس/قدیمی)، منطق SW بی‌حالته (کاربر فعلی
// از کش meta خونده می‌شه)، و Next خودش اختلاف buildId رو با ناوبری کامل جواب می‌ده.
// پس نسخه‌ی جدید بی‌صدا و بدون ریلود فعال می‌شه و هیچ UI مزاحمی نداره.

// v4: کش صفحه‌ی خصوصی به‌ازای کاربر، RSC، پیش‌گرم، تصویر و manifest.
const VERSION = "v4";
const SHELL_CACHE = `arion-shell-${VERSION}`;
// کش دارایی‌ها عمدا نسخه‌ی کم‌تغییر داره: محتوای هش‌دار تا ابد معتبره و پاک‌شدنش هنگام
// به‌روزرسانی یعنی صفحه‌ی باز قدیمی آفلاین چانکش رو گم می‌کنه. فقط اگه منطق اعتبارسنجی
// عوض شد اسمش رو بالا ببر.
const ASSET_CACHE = "arion-assets-v4";
const PAGE_CACHE = `arion-pages-${VERSION}`; // صفحه‌های عمومی (بدون داده‌ی کاربر)
const IMG_CACHE = "arion-img-v4";
const META_CACHE = "arion-meta"; // کاربر فعلی؛ باید با lib/offline/swBridge.ts یکی بمونه
const USER_CACHE_PREFIX = "arion-user-pages-"; // + userId؛ پیشوند `arion-user-` در swBridge
const USER_KEY = "/__arion/user";
const OFFLINE_URL = "/offline";

const NAV_TIMEOUT_MS = 4000; // بعد از این مدت اگه نسخه‌ی کش‌شده داریم، همون رو نشون می‌دیم
const MAX_HTML_ENTRIES = 60;
const MAX_RSC_ENTRIES = 120;
const MAX_ASSET_ENTRIES = 700;
const MAX_IMG_ENTRIES = 60;
const WARM_FRESH_MS = 6 * 3600 * 1000; // صفحه‌ی تازه‌تر از این دوباره پیش‌گرم نمی‌شه
const WARM_MAX_URLS = 24;
const WARM_ASSET_CONCURRENCY = 4;
const WARM_MAX_ASSETS_PER_PAGE = 160;

// فهرست کوتاه و ثابت — عمدا فقط چیزهایی که همیشه لازم‌اند
const PRECACHE = ["/icon.png", "/apple-icon.png", "/images/logo-icon.png"];

// صفحه‌های عمومی که کش‌کردن HTMLشان بی‌خطر است (هیچ داده‌ی کاربری ندارند)
const PUBLIC_PAGES = [
  "/", "/routine", "/habit-tracker", "/daily-planner", "/trading-journal",
  "/blog", "/faq", "/about", "/terms", OFFLINE_URL,
];

function isPublicPage(pathname) {
  return PUBLIC_PAGES.includes(pathname) || pathname.startsWith("/blog/");
}

// ── مسیرهای اپ که برای کاربر واردشده آفلاین کش می‌شن (فهرست سفید) ──────────
const USER_ROUTE_ALLOW = [
  /^\/dashboard(?:\/|$)/, /^\/weekly(?:\/|$)/, /^\/sleep(?:\/|$)/, /^\/analysis(?:\/|$)/,
  /^\/account(?:\/|$)/, /^\/trade(?:\/|$)/, /^\/roadmaps(?:\/|$)/, /^\/streak(?:\/|$)/,
  /^\/exercise(?:\/|$)/, /^\/friends(?:\/|$)/,
];
// استثناها: امنیت و پرداخت حساب، گفت‌وگوهای رمزگذاری‌شده‌ی منتور. (ادمین، /subscription،
// /auth، /mentor* اصلا در فهرست سفید نیستن.)
const USER_ROUTE_DENY = [/^\/account\/(?:security|subscription)(?:\/|$)/, /^\/account\/general\/(?:chats|mentors)(?:\/|$)/];

function isUserRoute(pathname) {
  if (/\.[a-z0-9]{2,5}$/i.test(pathname)) return false;
  return USER_ROUTE_ALLOW.some((r) => r.test(pathname)) && !USER_ROUTE_DENY.some((r) => r.test(pathname));
}

// ── نصب: فقط پیش‌کش حداقلی ─────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll اگر *یکی* از آدرس‌ها ۴۰۴ بدهد کل نصب را شکست می‌دهد و سرویس‌ورکر هیچ‌وقت
      // فعال نمی‌شود؛ پس تک‌تک و با تحمل خطا.
      await Promise.allSettled(PRECACHE.map((u) => cache.add(u)));
      // صفحه‌ی آفلاین بدون کوکی (حالت مهمان) گرفته می‌شه تا هیچ داده‌ی نشست کاربری داخلش نباشه
      try {
        const res = await fetch(new Request(OFFLINE_URL, { credentials: "omit" }));
        if (res.ok && res.status === 200) {
          const html = await res.clone().text();
          await cache.put(OFFLINE_URL, res);
          // چانک‌های خود صفحه‌ی آفلاین هم باید آفلاین در دسترس باشن، وگرنه هیدریت می‌شکنه
          await cacheAssetPaths(extractAssetPaths(html), WARM_ASSET_CONCURRENCY);
        }
      } catch { /* آفلاین نصب شد: نسخه‌ی قبلی (اگه بود) می‌مونه */ }
      await self.skipWaiting();
    })()
  );
});

// ── فعال‌سازی: پاک‌کردن کش نسخه‌های قبلی (ولی نه کش کاربر/دارایی/meta) ───────
self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, ASSET_CACHE, PAGE_CACHE, IMG_CACHE, META_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("arion-") && !keep.has(k) && !k.startsWith(USER_CACHE_PREFIX))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── کاربر فعلی (حافظه + کش meta تا بعد از ری‌استارت SW هم بمونه) ─────────────
let userState = { loaded: false, id: null };
let epoch = 0; // با هر عوض‌شدن کاربر/پاک‌سازی زیاد می‌شه؛ نوشتن‌های قدیمی دور ریخته می‌شن
let opQueue = Promise.resolve(); // پیام‌های کاربر/پاک‌سازی پشت‌سرهم اجرا می‌شن

function enqueue(fn) {
  const run = opQueue.then(fn, fn);
  opQueue = run.catch(() => {});
  return run;
}

async function getUser() {
  if (userState.loaded) return userState.id;
  let id = null;
  try {
    const c = await caches.open(META_CACHE);
    const r = await c.match(USER_KEY);
    const j = r ? await r.json() : null;
    if (j && typeof j.userId === "string" && j.userId) id = j.userId;
  } catch { /* بدون کاربر */ }
  // اگه وسط خوندن پیام کاربر رسیده، اون برنده‌ست
  if (!userState.loaded) userState = { loaded: true, id };
  return userState.id;
}

async function persistUser(id) {
  const c = await caches.open(META_CACHE);
  if (id) {
    await c.put(USER_KEY, new Response(JSON.stringify({ userId: id }), { headers: { "content-type": "application/json" } }));
  } else {
    await c.delete(USER_KEY);
  }
}

async function wipeUserCaches() {
  epoch++;
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k.startsWith(USER_CACHE_PREFIX)).map((k) => caches.delete(k)));
}

function userCacheName(userId) {
  return USER_CACHE_PREFIX + userId;
}

// نسخه‌ی صفحه به بخش (کوکی arion_section) و زبان وابسته‌ست؛ کلید کش اون‌ها رو هم دارد
async function variant() {
  let section = "";
  let lang = "";
  try {
    if (self.cookieStore) {
      const [s, l] = await Promise.all([self.cookieStore.get("arion_section"), self.cookieStore.get("arion_lang")]);
      section = (s && s.value) || "";
      lang = (l && l.value) || "";
    }
  } catch { /* کوکی‌استور نیست: بدون نسخه */ }
  return `${section || "-"}.${lang || "-"}`.replace(/[^a-z0-9.\-]/gi, "");
}

/** فقط پارامترهایی که محتوا رو عوض می‌کنن (هفته‌نامه) */
function keptQuery(pathname, search) {
  if (!pathname.startsWith("/analysis/weekly")) return "";
  const sp = new URLSearchParams(search);
  const out = new URLSearchParams();
  for (const k of ["week", "offset"]) if (sp.has(k)) out.set(k, sp.get(k));
  const s = out.toString();
  return s ? `&q=${encodeURIComponent(s)}` : "";
}

function normPath(pathname) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function htmlKey(v, pathname, search) {
  return new Request(`${self.location.origin}/__arion/html/${v}${normPath(pathname)}?k=1${keptQuery(pathname, search)}`);
}

/** بخش بعد از نسخه‌ی کلید (نوع + مسیر + پارامترها)؛ برای پیدا کردن همان صفحه با نسخه‌ی دیگر */
function keySuffix(u) {
  const m = /\/__arion\/(html|rsc)\/[^/]*(\/.*)$/.exec(u);
  return m ? m[1] + m[2] : u;
}

/**
 * ورودی دقیق، وگرنه تازه‌ترین ورودی همان صفحه با هر نسخه‌ی دیگر. کوکی بخش (arion_section) بعد از
 * اولین پاسخ سرور ساخته می‌شه، پس نسخه‌ی صفحه‌ی پیش‌گرم‌شده و صفحه‌ی بعدی می‌تونن فرق کنن؛ آفلاین
 * نمایش «یک نسخه‌ی قبلی همین صفحه» بهتر از نشان‌دادن هیچ‌چیزه.
 */
async function matchEntry(cache, key) {
  const hit = await cache.match(key);
  if (hit) return hit;
  const want = keySuffix(key.url);
  const keys = await cache.keys();
  for (let i = keys.length - 1; i >= 0; i--) {
    if (keySuffix(keys[i].url) === want) return cache.match(keys[i]);
  }
  return undefined;
}

function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * کلید RSC: مسیر + هش وضعیت درخت روتر مبدا. محتوای پاسخ RSC به صفحه‌ی مبدا وابسته‌ست
 * (فقط تکه‌ی تغییرکرده‌ی درخت برمی‌گرده)، پس پاسخ فقط برای همون مبدا دوباره استفاده می‌شه؛
 * ناوبری از مبدا دیگه کش‌نخورده می‌شه و Next خودش ناوبری کامل می‌کنه (که از کش HTML میاد).
 * مقدار `_rsc` بی‌اثره چون هش همون هدرهاست.
 */
function rscKey(v, request, pathname, search) {
  const tree = request.headers.get("next-router-state-tree") || "";
  const nextUrl = request.headers.get("next-url") || "";
  return new Request(
    `${self.location.origin}/__arion/rsc/${v}${normPath(pathname)}?t=${hashStr(tree + "|" + nextUrl)}${keptQuery(pathname, search)}`
  );
}

// ── نوشتن در کش کاربر (با کنترل epoch) و سقف تعداد ───────────────────────────
async function storeUserEntry(userId, startEpoch, key, response) {
  if (epoch !== startEpoch || userState.id !== userId) return;
  const headers = new Headers(response.headers);
  // بدنه‌ی دریافتی دیکد شده؛ این هدرها با بازسازی پاسخ ناسازگار می‌شن
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("set-cookie");
  headers.set("x-arion-at", String(Date.now()));
  const body = await response.arrayBuffer();
  if (epoch !== startEpoch || userState.id !== userId) return;
  const cache = await caches.open(userCacheName(userId));
  // هر صفحه فقط یک ورودی دارد (نسخه‌های قدیمی‌تر با بخش/زبان دیگر هم پاک می‌شن) و ورودی تازه
  // آخر ترتیب می‌آید (سقف تعداد، قدیمی‌ترین‌ها رو می‌بره)
  const suffix = keySuffix(key.url);
  for (const k of await cache.keys()) if (keySuffix(k.url) === suffix) await cache.delete(k);
  await cache.put(key, new Response(body, { status: 200, statusText: "OK", headers }));
  await trimCache(cache, "/__arion/html/", MAX_HTML_ENTRIES);
  await trimCache(cache, "/__arion/rsc/", MAX_RSC_ENTRIES);
}

async function trimCache(cache, marker, max) {
  const keys = (await cache.keys()).filter((r) => r.url.includes(marker));
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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
    event.respondWith(handleNavigation(event, url));
    return;
  }

  // ناوبری نرم نکست (RSC): فقط مسیرهای اپ، و پیش‌واکشی‌ها نه
  if (isRscRequest(request, url)) {
    if (isUserRoute(url.pathname) && !request.headers.get("next-router-prefetch")) {
      event.respondWith(handleRsc(event, url));
    }
    return;
  }

  // دارایی‌های هش‌دار نکست: cache-first (نام فایل هش محتواست، هیچ‌وقت بیات نمی‌شه).
  // در dev نکست فایل‌ها هش ندارن (page.css، main-app.js)؛ اون‌ها رو دست نمی‌زنیم تا
  // نسخه‌ی بیات سرو نشه.
  if (isImmutableAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // تصویر بهینه‌شده‌ی نکست: فقط برای تصویرهای ساکن خود سایت (نه آپلود/داده‌ی کاربر)
  if (url.pathname === "/_next/image") {
    const src = url.searchParams.get("url") || "";
    if (src.startsWith("/images/") || src.startsWith("/_next/static/")) {
      event.respondWith(staleWhileRevalidate(event, IMG_CACHE, MAX_IMG_ENTRIES));
    }
    return;
  }

  // manifest و آیکون‌ها: اپ نصب‌شده آفلاین هم باید با اسم و آیکون بالا بیاد
  if (url.pathname === "/manifest.webmanifest" || request.destination === "manifest") {
    event.respondWith(staleWhileRevalidate(event, ASSET_CACHE, MAX_ASSET_ENTRIES));
    return;
  }

  // بقیه‌ی فایل‌های ساکن (لوگو، آیکون، …) اسم هش‌دار ندارن و ممکنه عوض بشن:
  // stale-while-revalidate، یعنی سریع از کش و بی‌سروصدا تازه می‌شه.
  if (!url.pathname.startsWith("/_next/") && (url.pathname.startsWith("/images/") || STATIC_EXT.test(url.pathname))) {
    event.respondWith(staleWhileRevalidate(event, ASSET_CACHE, MAX_ASSET_ENTRIES));
  }
});

function isRscRequest(request, url) {
  return request.headers.get("rsc") === "1" || url.searchParams.has("_rsc");
}

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
  if (/\.(?:png|jpe?g|webp|ico|svg)$/.test(pathname) || pathname === "/_next/image") return ct.startsWith("image/");
  return !ct.includes("text/html");
}

/** پاسخ HTML سالم و بدون ریدایرکت که ارزش ذخیره‌شدن برای کاربر داره */
function isStorableHtml(response) {
  if (!response || response.status !== 200 || response.type !== "basic" || response.redirected) return false;
  return (response.headers.get("content-type") || "").toLowerCase().includes("text/html");
}

function isStorableRsc(response) {
  if (!response || response.status !== 200 || response.type !== "basic" || response.redirected) return false;
  return (response.headers.get("content-type") || "").toLowerCase().includes("text/x-component");
}

/**
 * شبکه اول، کش وقتی شبکه نیست یا بیش از NAV_TIMEOUT_MS کنده یا سرور 502-504 داده.
 * `onOk(response)` برای هر پاسخ 2xx صدا زده می‌شه (ذخیره‌سازی). null = نه شبکه نه کش.
 */
async function networkFirst(event, request, cachedP, onOk) {
  let failed = false;
  const netP = fetch(request)
    .then((res) => {
      if (res.ok) onOk(res);
      return res;
    })
    .catch(() => {
      failed = true;
      return null;
    });
  const first = await Promise.race([netP, sleep(NAV_TIMEOUT_MS)]);
  const gatewayError = first && (first.status === 502 || first.status === 503 || first.status === 504);
  if (first && !gatewayError) return first;
  const cached = await cachedP.catch(() => undefined);
  if (cached) {
    event.waitUntil(netP); // نوشتن نسخه‌ی تازه بعد از پاسخ هم کامل بشه
    return cached;
  }
  if (first) return first;
  if (failed) return null;
  return netP; // کنده ولی کش نداریم: صبر می‌کنیم
}

// ── ناوبری ──────────────────────────────────────────────────────────────
async function handleNavigation(event, url) {
  const request = event.request;
  if (isUserRoute(url.pathname)) {
    const userId = await getUser();
    if (userId) return handleUserNavigation(event, url, userId);
  }
  return handlePublicNavigation(event, url);
}

async function handleUserNavigation(event, url, userId) {
  const request = event.request;
  const v = await variant();
  const key = htmlKey(v, url.pathname, url.search);
  const startEpoch = epoch;
  const cachedP = caches.open(userCacheName(userId)).then((c) => matchEntry(c, key));
  const res = await networkFirst(event, request, cachedP, (r) => {
    if (!isStorableHtml(r)) return;
    event.waitUntil(storeUserEntry(userId, startEpoch, key, r.clone()).catch(() => {}));
  });
  return res || offlineFallback(url);
}

/**
 * ناوبری صفحه‌های عمومی و مسیرهای غیرکش‌شونده: همان رفتار قبلی — HTML فقط اگه سرور
 * اجازه‌ی اشتراک داده باشه (بدون no-store/private) کش می‌شه. شبکه نبود: نسخه‌ی عمومی یا /offline.
 *
 * چرا network-first و نه cache-first: محتوای صفحه‌ها عوض می‌شود و کاربر نباید نسخه‌ی بیات ببیند.
 */
async function handlePublicNavigation(event, url) {
  const request = event.request;
  try {
    const response = await fetch(request);
    // HTML یک صفحه‌ی «عمومی» هم وقتی layout با کوکی رندر می‌شه برای هر کاربر فرق
    // داره؛ سرور برای همین no-store/private می‌فرسته. کش‌کردنش یعنی بعدا نسخه‌ی
    // حالت مهمان به کاربر واردشده (یا برعکس) نشون داده بشه — پس به هدر سرور احترام می‌ذاریم.
    if (response.ok && url.pathname !== OFFLINE_URL && isPublicPage(url.pathname) && isShareableResponse(response)) {
      const copy = response.clone();
      caches.open(PAGE_CACHE).then((c) => c.put(request, copy)).catch(() => {});
    }
    return response;
  } catch {
    if (url.pathname === OFFLINE_URL) return offlineFallback(url);
    const cached = await caches.match(request, { cacheName: PAGE_CACHE });
    if (cached) return cached;
    return offlineFallback(url);
  }
}

/** آخرین تور ایمنی وقتی نه شبکه هست نه کش کاربر */
async function offlineFallback(url) {
  // باز کردن اپ نصب‌شده روی "/" برای کاربر واردشده: به اولین صفحه‌ی خانه‌ای که کش داریم می‌ریم
  if (url && url.pathname === "/") {
    const userId = await getUser();
    if (userId) {
      const v = await variant();
      const cache = await caches.open(userCacheName(userId));
      for (const home of ["/dashboard", "/weekly", "/account"]) {
        if (await matchEntry(cache, htmlKey(v, home, ""))) return Response.redirect(`${self.location.origin}${home}`, 302);
      }
    }
  }
  // صفحه‌ی /offline باید روی آدرس خودش باز بشه: HTML اون روی آدرس دیگه (مثلا /weekly) هیدریت
  // نمی‌شه و نکست به‌جاش صفحه‌ی خطا نشون می‌ده. پس ریدایرکت می‌کنیم و آدرس اصلی رو برای دکمه‌ی
  // «تلاش دوباره» توی `from` نگه می‌داریم.
  if (url && url.pathname !== OFFLINE_URL && (await offlinePageAvailable())) {
    return Response.redirect(`${self.location.origin}${OFFLINE_URL}?from=${encodeURIComponent(url.pathname + url.search)}`, 302);
  }
  const offline = await caches.match(OFFLINE_URL, { cacheName: SHELL_CACHE, ignoreSearch: true });
  if (offline) return offline;
  return new Response("آفلاین هستید. / You are offline.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function offlinePageAvailable() {
  return !!(await caches.match(OFFLINE_URL, { cacheName: SHELL_CACHE, ignoreSearch: true }));
}

function isShareableResponse(response) {
  const cc = (response.headers.get("cache-control") || "").toLowerCase();
  return !/(?:^|[\s,])(?:no-store|private)(?:$|[\s,=])/.test(cc);
}

// ── ناوبری نرم (RSC) ─────────────────────────────────────────────────────
// شبکه نبود و کش نبود → Response.error(): نکست `Failed to fetch RSC payload` می‌گیره و
// خودش ناوبری کامل می‌کنه؛ اون درخواست از handleNavigation میاد و از کش HTML سرو می‌شه.
async function handleRsc(event, url) {
  const request = event.request;
  const userId = await getUser();
  if (!userId) return fetch(request);
  const v = await variant();
  const key = rscKey(v, request, url.pathname, url.search);
  const startEpoch = epoch;
  const cachedP = caches.open(userCacheName(userId)).then((c) => matchEntry(c, key));
  const res = await networkFirst(event, request, cachedP, (r) => {
    if (!isStorableRsc(r)) return;
    event.waitUntil(storeUserEntry(userId, startEpoch, key, r.clone()).catch(() => {}));
  });
  return res || Response.error();
}

/** فایل هش‌دار: اول کش (اگه سالم بود)، بعد شبکه؛ پاسخ سالم برای دفعه‌ی بعد کش می‌شه */
async function cacheFirst(request) {
  const pathname = new URL(request.url).pathname;
  const cached = await caches.match(request, { cacheName: ASSET_CACHE, ignoreVary: true });
  if (cached) {
    if (isValidAsset(pathname, cached)) return cached;
    // ورودی خراب (از نسخه‌ی قبلی یا پاسخ بد) — دورش می‌ریزیم
    caches.open(ASSET_CACHE).then((c) => c.delete(request, { ignoreSearch: false })).catch(() => {});
  }
  try {
    const response = await fetch(request);
    if (isValidAsset(pathname, response)) {
      const copy = response.clone();
      caches.open(ASSET_CACHE).then((c) => c.put(request, copy)).then(() => scheduleTrim(ASSET_CACHE, MAX_ASSET_ENTRIES)).catch(() => {});
    }
    return response;
  } catch (err) {
    const fallback = await caches.match(request, { cacheName: ASSET_CACHE, ignoreSearch: true, ignoreVary: true });
    if (fallback && isValidAsset(pathname, fallback)) return fallback;
    throw err;
  }
}

/** فایل بدون هش: همون لحظه از کش، و هم‌زمان نسخه‌ی تازه رو می‌گیره */
async function staleWhileRevalidate(event, cacheName, max) {
  const request = event.request;
  const pathname = new URL(request.url).pathname;
  const cached = await caches.match(request, { cacheName, ignoreVary: true });
  const refresh = fetch(request)
    .then((response) => {
      if (isValidAsset(pathname, response)) {
        const copy = response.clone();
        caches.open(cacheName).then((c) => c.put(request, copy)).then(() => scheduleTrim(cacheName, max)).catch(() => {});
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

// سقف تعداد: قدیمی‌ترین‌ها می‌رن (حداکثر هر ۳۰ ثانیه یک بار برای هر کش، تا هزینه‌ی keys() تکرار نشه)
const trimTimes = {};
function scheduleTrim(cacheName, max) {
  const now = Date.now();
  if (trimTimes[cacheName] && now - trimTimes[cacheName] < 30000) return;
  trimTimes[cacheName] = now;
  caches
    .open(cacheName)
    .then(async (c) => {
      const keys = await c.keys();
      for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
    })
    .catch(() => {});
}

// ── پیام‌ها ───────────────────────────────────────────────────────────────
// قرارداد: lib/offline/types.ts (SwMessage) + پیام قدیمی `warm` (lib/assetRecovery.ts).
// اگه پیام یک MessagePort همراهش داشته باشه، بعد از انجام کار جواب {ok:true} می‌ره.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data.type !== "string") return;
  const port = event.ports && event.ports[0];
  const ack = () => {
    try { if (port) port.postMessage({ ok: true }); } catch { /* بی‌اهمیت */ }
  };

  if (data.type === "arion-user") {
    const next = typeof data.userId === "string" && data.userId ? data.userId : null;
    event.waitUntil(
      enqueue(async () => {
        const prev = await getUser();
        if (prev !== next) {
          // هویت عوض شد (یا مهمان شد): هر چیز کاربر قبلی اول پاک می‌شه
          userState = { loaded: true, id: null };
          await wipeUserCaches();
        }
        userState = { loaded: true, id: next };
        await persistUser(next);
      }).then(ack, ack)
    );
    return;
  }

  if (data.type === "arion-wipe") {
    event.waitUntil(
      enqueue(async () => {
        userState = { loaded: true, id: null };
        await wipeUserCaches();
        await persistUser(null);
      }).then(ack, ack)
    );
    return;
  }

  if (data.type === "arion-warm-shell" && Array.isArray(data.urls)) {
    ack(); // کار طولانیه؛ فرستنده منتظرش نمی‌مونه
    event.waitUntil(enqueue(() => warmShell(data.urls)).catch(() => {}));
    return;
  }

  if (data.type === "warm" && Array.isArray(data.urls)) {
    event.waitUntil(warmAssets(data.urls.slice(0, 24)));
  }
});

// ── پیش‌گرم‌کردن فونت و CSS ───────────────────────────────────────────────
// اسم فایل‌های فونت/CSS نکست هش‌دارن و موقع نصب SW معلوم نیستن؛ صفحه بعد از لود
// فهرست چیزهایی که واقعا استفاده کرده رو می‌فرسته (lib/assetRecovery.ts) تا بعدا
// اجرای PWA/آفلاین هیچ‌وقت به فونت دستگاه سقوط نکنه.
async function warmAssets(urls) {
  const cache = await caches.open(ASSET_CACHE);
  for (const raw of urls) {
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
}

// ── پیش‌گرم‌کردن پوسته‌ی صفحه‌ها برای اولین باز شدن آفلاین ────────────────────
const warmedThisSession = new Set();

function saveDataOn() {
  try {
    return !!(self.navigator && self.navigator.connection && self.navigator.connection.saveData);
  } catch {
    return false;
  }
}

/** مسیرهای هش‌دار نکست رو از HTML (شامل payload درون‌صفحه‌ای RSC) بیرون می‌کشه */
function extractAssetPaths(html) {
  const out = new Set();
  const re = /(?:\/_next\/|["'\\(\s])static\/(?:chunks|css|media)\/[^"'\\\s<>)?]+?\.(?:js|css|woff2?)/g;
  let m;
  while ((m = re.exec(html)) && out.size < 600) {
    const s = m[0].replace(/^(?:\/_next\/|["'\\(\s])/, "");
    const p = "/_next/" + s;
    if (isImmutableAsset(p)) out.add(p);
  }
  return Array.from(out);
}

/** فایل‌های هش‌دار رو (با هم‌زمانی کم) توی کش دارایی می‌ذاره؛ موجودها و خراب‌ها رد می‌شن */
async function cacheAssetPaths(paths, concurrency) {
  const assets = await caches.open(ASSET_CACHE);
  let i = 0;
  const worker = async () => {
    while (i < paths.length) {
      const p = paths[i++];
      try {
        const req = new Request(p);
        if (await assets.match(req, { ignoreVary: true })) continue;
        const r = await fetch(req);
        if (isValidAsset(p, r)) await assets.put(req, r);
      } catch { /* یکی نشد، بقیه ادامه */ }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
}

async function warmShell(rawUrls) {
  if (saveDataOn() || (self.navigator && self.navigator.onLine === false)) return;
  const userId = await getUser();
  if (!userId) return;
  const startEpoch = epoch;
  const v = await variant();
  const cache = await caches.open(userCacheName(userId));

  for (const raw of rawUrls.slice(0, WARM_MAX_URLS)) {
    if (epoch !== startEpoch) return; // وسط کار هویت عوض شد یا پاک‌سازی شد
    let u;
    try { u = new URL(String(raw), self.location.origin); } catch { continue; }
    if (u.origin !== self.location.origin || !isUserRoute(u.pathname)) continue;
    const key = htmlKey(v, u.pathname, u.search);
    const sessionKey = `${userId}|${key.url}`;
    if (warmedThisSession.has(sessionKey)) continue;
    warmedThisSession.add(sessionKey);
    try {
      const existing = await matchEntry(cache, key);
      const age = existing ? Date.now() - Number(existing.headers.get("x-arion-at") || 0) : Infinity;
      if (age < WARM_FRESH_MS) continue;
      const res = await fetch(u.pathname + u.search, {
        credentials: "include",
        headers: { Accept: "text/html,application/xhtml+xml" },
      });
      if (!isStorableHtml(res)) continue;
      const html = await res.clone().text();
      await storeUserEntry(userId, startEpoch, key, res);
      // چانک‌ها و CSSهای همین صفحه، تا بدون هیچ بازدید قبلی هم آفلاین اجرا بشه
      const paths = extractAssetPaths(html).slice(0, WARM_MAX_ASSETS_PER_PAGE);
      await cacheAssetPaths(paths, WARM_ASSET_CONCURRENCY);
      scheduleTrim(ASSET_CACHE, MAX_ASSET_ENTRIES);
    } catch {
      warmedThisSession.delete(sessionKey); // دفعه‌ی بعد دوباره تلاش
    }
  }
}


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
