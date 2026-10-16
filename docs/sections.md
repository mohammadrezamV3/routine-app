# بخش‌ها روی زیردامنه‌ها (routine / trade / workout)

یک اپ Next.js واحد، سه زیردامنه‌ی متمرکز. فقط همین سه بخش وجود دارد: حالت «همه‌ی بخش‌ها» نیست و بخش موثر همیشه یکی از سه بخش است (دامنه‌ی اصلی `arionapp.ir`، `www` بدون کوکی = `DEFAULT_SECTION` = روتین).
منطق خالص: `lib/sections.ts`؛ سرور: `lib/sectionServer.ts`؛ کلاینت: `components/SectionProvider.tsx`؛
زیرساخت (این سند): `middleware.ts`، `lib/authCookies.ts`، `lib/clientCookie.ts`، `lib/seo.ts`،
`app/robots.ts`، `app/sitemap.ts`، `app/manifest.ts`، `next.config.js`، `deploy/`.

**هر سه بخش روی هر میزبان در دسترس‌اند (بدون عوض‌شدن دامنه).** دلیل: اپ نصب‌شده روی صفحه‌ی اصلی گوشی (PWA)
با رفتن به زیردامنه‌ی دیگر از scope بیرون می‌افتاد. حالا **بخش موثر** = کوکی host-only `arion_section`
(routine|trade|workout، معتبر) وگرنه بخش میزبان، وگرنه `DEFAULT_SECTION` (`routine`؛ دامنه‌ی اصلی بدون کوکی). جداسازی بخش‌ها
(منو، داشبورد، آنالیز، منتورها، درباره، تم) همچنان برقرار است؛ فقط «کدام بخش فعال است» از کوکی می‌آید.
دامنه فقط هویت اپ نصب‌شده (manifest، آیکون)، سئو (canonical، robots، sitemap) و بخش پیش‌فرض مهمان/خزنده را تعیین می‌کند.

بدون `NEXT_PUBLIC_SECTION_BASE_DOMAIN` میزبان بخشی ندارد (هیچ ریدایرکت سئو، کوکی دامنه‌دار و تفاوت در
manifest/robots/sitemap/canonical/CSP نیست)، ولی کوکی `arion_section` هنوز کار می‌کند: کاربر روی یک دامنه
هم می‌تواند بخش را عوض کند. بدون کوکی بخش موثر روتین است (`getSection()` = `DEFAULT_SECTION`، هرگز `null`).

## 1. میزبان‌ها و env

| env | کجا | معنی |
|---|---|---|
| `NEXT_PUBLIC_SECTION_BASE_DOMAIN` | **build** (build arg داکر) + runtime | دامنه‌ی پایه بدون https و بدون پورت: `arionapp.ir`. میزبان‌ها: `routine.` / `trade.` / `workout.` + پایه. خالی = خاموش |
| `AUTH_COOKIE_DOMAIN` | runtime | دامنه‌ی کوکی نشست مشترک (`.arionapp.ir`). خالی = خودکار `.<پایه>`؛ روی `localhost` و IP هیچ (کوکی host-only) |
| `NEXTAUTH_URL` | runtime | **همچنان آدرس دامنه‌ی اصلی** (زیردامنه نمی‌شود). next-auth فقط مسیرهای نسبی استفاده می‌شود |
| `NEXT_PUBLIC_SITE_URL` | build | همچنان دامنه‌ی اصلی؛ پایه‌ی `metadataBase`، JSON-LD و منبع پروتکل/پورت آدرس‌های زیردامنه در sitemap/canonical |

⚠️ `NEXT_PUBLIC_*` موقع build داخل کد جایگزین می‌شود. با docker compose، `.env` به‌عنوان build arg
(`docker-compose.yml` → `Dockerfile`) می‌رسد؛ بعد از تغییرش باید دوباره `build` شود (`deploy/update.sh`).

## 2. DNS، nginx و گواهی

- DNS: سه رکورد `routine`, `trade`, `workout` (یا یک `*` wildcard) به همان سرور/Cloudflare که `arionapp.ir` را می‌دهد (proxied).
- nginx: `deploy/nginx.arionapp.ir.conf` و `deploy/nginx.conf.example` در `server_name` سه زیردامنه را دارند
  و همه‌ی locationها `proxy_set_header X-Forwarded-Host $host;` می‌گذارند. **این مهم است**: `middleware.ts`
  میزبان را از `x-forwarded-host` (و بعد `host`) می‌خواند؛ nginx بدون این خط هدر ارسالی کلاینت را عبور می‌دهد.
- گواهی: Cloudflare Origin CA با Hostnames `arionapp.ir` و `*.arionapp.ir` از قبل هر سه را پوشش می‌دهد.
  با Let's Encrypt باید `-d routine.… -d trade.… -d workout.…` را اضافه کنی (یا wildcard با DNS-01).
- HSTS (`includeSubDomains; preload`) از قبل در `next.config.js` هست؛ هر سه زیردامنه باید https داشته باشند.
- CSP (`next.config.js`): `connect-src` هاست‌های `wss://` سه زیردامنه را هم دارد (Safari قدیمی `'self'` را برای ws اجرا نمی‌کند).
  `form-action` تعریف نشده، `frame-ancestors 'none'` و `img-src https:` بدون تغییر.
- WebSocket (`/ws`): Origin باید با Host یکی باشد؛ چون nginx `Host $host` را عبور می‌دهد، هر زیردامنه روی خودش وصل می‌شود.

## 3. مالکیت مسیرها (`lib/sections.ts`)

| مسیر | مالک |
|---|---|
| `/weekly`, `/roadmaps` | routine |
| `/sleep` | routine + workout |
| `/exercise` | workout |
| `/trade/*` | trade |
| صفحه‌های فرود سئو: `/routine`, `/habit-tracker`, `/daily-planner`, `/ai-planner`, `/learning-roadmap` | routine |
| `/trading-journal`, `/economic-calendar`, `/forex-sessions` | trade |
| `/bodybuilding-program`, `/calorie-counter` | workout |
| بقیه (داشبورد، حساب، ورود، ادمین، منتورها، آنالیز، بلاگ، درباره، قوانین، اشتراک، استریک، API) | مشترک: روی همه‌ی میزبان‌ها باز |

## 4. بخش موثر، تعویض خودکار و ریدایرکت (`middleware.ts`)

**هیچ ریدایرکتی بین زیردامنه‌ها وجود ندارد.** هدر `x-arion-section` همیشه از درخواست ورودی پاک و دوباره ساخته
می‌شود (کلاینت نمی‌تواند جعل کند): مقدار = بخش موثر (کوکی معتبر `arion_section`، وگرنه بخش میزبان؛ دامنه‌ی اصلی
بدون کوکی = `DEFAULT_SECTION`؛ هدر همیشه ست می‌شود). کوکی نامعتبر نادیده گرفته می‌شود. روی `/api` هم هدر از کوکی ساخته می‌شود.

1. **تعویض خودکار:** درخواست `GET`/`HEAD` صفحه (نه `/api`، نه پیش‌واکشی با `next-router-prefetch`/`purpose`) به مسیری که
   روی بخش موثر بسته است (`!pathAllowedIn`) → بخش موثر می‌شود **اولین صاحب مسیر** (`sectionToSwitchTo`)،
   هدر درخواست فورواردشده همان را می‌گیرد، کوکی `arion_section` روی پاسخ ست می‌شود و صفحه روی **همان میزبان**
   سرو می‌شود. پیش‌واکشی هیچ‌وقت بخش را عوض نمی‌کند (hover روی یک لینک نباید کاربر را جابه‌جا کند).
2. **تنها ریدایرکت (دامنه‌ی اصلی، سئو):** `GET`/`HEAD`، هرگز `/api`، کد **308**، مسیر و query حفظ، پروتکل و پورت از
   درخواست (`x-forwarded-proto` و میزبان): روی دامنه‌ی اصلی اگر `seoLandingOwner(path)` → زیردامنه‌ی صاحبش (یکی‌شدن سئو).
   مسیرهای غیر فرود (مثل `/trade`) روی دامنه‌ی اصلی باز می‌مانند. روی زیردامنه هیچ ریدایرکتی نیست.
3. آیکون‌های اپ (`/icon.png`، `/apple-icon.png`، ...) و `manifest` **تابع میزبان‌اند، نه کوکی** (هویت PWA به دامنه بسته است).

کوکی `arion_section`: **host-only** (عمدا بدون `Domain` تا هر اپ نصب‌شده انتخاب خودش را یادش بماند)، `Path=/`،
`SameSite=Lax`، یک سال، `Secure` روی https. توابع خالص و یکتا در `lib/sections.ts`:
`SECTION_COOKIE`, `resolveEffectiveSection`, `sectionToSwitchTo`, `serializeSectionCookie`.

سمت سرور `getSection()` (`lib/sectionServer.ts`) = هدر (بخش موثر)؛ بدون هدر (تست) کوکی و بعد میزبان.
`getHostSection()` فقط بخش میزبان را می‌دهد و برای هر چیزی که هویتش به دامنه بسته است (manifest، robots، sitemap،
فید، canonical) باید استفاده شود. مهمان/خزنده بدون کوکی بخش میزبان را می‌گیرد، پس سئو مثل قبل می‌ماند.

سمت کلاینت: `SectionSwitcher` کوکی را با `document.cookie` ست می‌کند (`lib/sectionClient.ts` → `switchSectionAndGo`)
و ناوبری **کامل** روی همان origin به `/dashboard` (واردشده) یا `/` (مهمان) می‌کند. چون layout ریشه در ناوبری
کلاینتی دوباره رندر نمی‌شود، `SectionSync` (داخل `SectionProvider`) وقتی `pathname` به مسیر بخش دیگری رفت یک
بارگذاری کامل می‌کند (middleware در درخواست RSC کوکی را عوض کرده)؛ نگهبان حلقه: برای یک آدرس در ۱۰ ثانیه یک بار
(`sessionStorage`). خروج/ورود کوکی را نگه می‌دارد (ترجیح ظاهری است). پالت «خودکار» از `data-section` layout تبعیت می‌کند.

matcher: همه‌ی صفحه‌ها و `/api`، به‌جز `_next/static`، `_next/image` و هر مسیر با پسوند فایل؛ `robots.txt`،
`sitemap.xml`، `manifest.webmanifest` و آیکون‌ها صریح اضافه شده‌اند.
چک CSRF (`Origin` روی `/api`) علاوه بر قبل، Originهای خانواده‌ی دامنه (`isOwnHost`) را هم می‌پذیرد.

## 5. کوکی‌ها

| کوکی | رفتار |
|---|---|
| نشست `__Secure-next-auth.session-token` (یا بدون پیشوند بدون https) و `…callback-url` | `Domain=.<پایه>` (`lib/auth.ts` → `cookies`). اسم‌ها همان اسم‌های پیش‌فرض next-auth‌اند (WebSocket و `getSessionFast` اسم را می‌خوانند) |
| `__Host-next-auth.csrf-token` | host-only (پیشوند `__Host-` دامنه را ممنوع می‌کند)؛ هر زیردامنه csrf خودش را دارد |
| `arion_section` | **host-only** (بدون `Domain`، عمدا)، بخش موثر کاربر روی همین میزبان (بخش 4) |
| `theme`, `arion_lang`, `arion-auth` | `Domain=.<پایه>` با `clientCookieDomainAttr()` (`lib/clientCookie.ts`؛ اسکریپت inline تم دامنه را از `location.hostname` حساب می‌کند) |

**مهاجرت (مهم):** کاربر قدیمی کوکی نشست host-only روی دامنه‌ی اصلی دارد. بعد از دیپلوی، همان اسم با
`Domain` هم ست می‌شود و مرورگر هر دو را نگه می‌دارد؛ سرور اولی (قدیمی‌تر) را می‌خواند، و خروج فقط
یکی را پاک می‌کرد. راه‌حل:

- سمت سرور: `app/api/auth/[...nextauth]/route.ts` هر پاسخی را که کوکی نشست دامنه‌دار ست یا پاک می‌کند
  با یک `Set-Cookie` منقضی‌کننده‌ی نسخه‌ی host-only هم‌اسم همراه می‌کند (`lib/authCookies.ts`).
  اولین `GET /api/auth/session` بعد از دیپلوی (هر لود صفحه) نشست قدیمی را به نسخه‌ی دامنه‌دار با همان
  محتوا تبدیل می‌کند؛ کاربر خارج نمی‌شود. خروج (`logoutAndRedirect`) هر دو را پاک می‌کند.
- سمت کلاینت: نوشتن/پاک‌کردن `theme`، `arion_lang`، `arion-auth` همیشه اول نسخه‌ی host-only را منقضی می‌کند
  (`setSharedCookie`/`clearSharedCookie`).
- محدودیت: کاربری که فقط کوکی قدیمی host-only دارد و **اول** یک زیردامنه را باز کند وارد نشده دیده می‌شود
  (کوکی دامنه‌ی اصلی به زیردامنه نمی‌رود) تا یک بار دامنه‌ی اصلی را باز کند یا دوباره وارد شود.
  تعویض بخش دیگر بین میزبان‌ها نیست، پس در عمل رخ نمی‌دهد.

## 6. سئو

- `absoluteUrl(path)` (`lib/seo.ts`): با زیردامنه‌های روشن، مسیر صاحب‌دار (فرود سئو یا مسیر دقیقا یک بخش) آدرس **زیردامنه** برمی‌گرداند؛ canonical، `hreflang`، `og:url` و JSON-LD از همین می‌آیند. `sectionHomeUrl(section)` canonical صفحه‌ی اصلی هر بخش است.
- `robots.txt`: برای هر میزبان خط `Sitemap:` همان میزبان.
- `sitemap.xml`: روی زیردامنه فقط صفحه‌ی اصلی بخش + صفحه‌های فرود همان بخش؛ روی دامنه‌ی اصلی صفحه‌های فرودی که حالا مال زیردامنه‌اند حذف می‌شوند (بلاگ و صفحه‌های مشترک روی دامنه‌ی اصلی می‌مانند).
- بدون env، `robots/sitemap/manifest` اصلا `headers()` صدا نمی‌زنند و مثل قبل ایستا می‌مانند.

## 7. اپ نصب‌شده و آیکون رنگی هر بخش

- `app/manifest.ts`: آیکون عمومی/بی‌بخش وجود ندارد؛ بخش آیکون = بخش میزبان، وگرنه (دامنه‌ی اصلی) بخش موثر (کوکی، وگرنه روتین؛ `getIconSection()`). اسم «آریون ترید / Arion Trade» (و routine / workout)، توضیح بخش، میان‌برهای همان بخش و آیکون‌های `public/images/sections/app/<بخش>-{192,512,maskable-512,180}.png` (پس‌زمینه‌ی سرمه‌ای مثل `app/icon.png`، نشان A به رنگ بخش). `start_url` همان `/` قبلی است (کاربر واردشده به داشبورد می‌رود).
- `middleware.ts` روی همه‌ی میزبان‌ها با rewrite (نه ریدایرکت) `/icon.png` → `<بخش>-256.png` و `/apple-icon.png`، `/apple-touch-icon.png`، `/apple-touch-icon-precomposed.png` → `<بخش>-180.png` را می‌دهد؛ پس favicon تب و آیکون «افزودن به صفحه‌ی اصلی» iOS هم به رنگ بخش است. روی زیردامنه بخش میزبان برنده است؛ روی دامنه‌ی اصلی بخش موثر (کوکی، وگرنه روتین) و پاسخ `Vary: Cookie` دارد تا کش مرورگر/CDN آیکون بخش‌ها را قاطی نکند. آدرس زیردامنه‌ها شامل میزبان است، پس آنجا Vary لازم نیست.

- **لوگوی هدر از اولین پینت:** `middleware.ts` علاوه بر `x-arion-section` هدر `x-arion-path` (مسیر درخواست) را هم همیشه خودش می‌سازد؛ `app/layout.tsx` با آن و بخش و تم جاری فقط همان تصویرهای هدر را preload می‌کند (`<link rel="preload" as="image" fetchpriority="high">` با media نقطه‌ی شکست 700px: نشان A موبایل `icon-<بخش>-sm.webp`، حروف ARION دسکتاپ `wordmark-{dark,light}-sm.webp`؛ نام‌ها و media در `lib/sectionAssets.ts`). هدر با `<picture>` فقط تصویر جور با عرض صفحه و تم جاری را می‌گیرد؛ روی `/auth` و `/admin` که هدر ندارند preload نیست. تصویر تم مقابل بعد از اولین پینت در بیکاری گرم می‌شود.

## 8. محدودیت‌های شناخته‌شده

- **تعویض بخش سمت کلاینت وابسته به کوکی است:** اگر مرورگر کوکی را مسدود کند، سوییچر بخش را عوض نمی‌کند (بدون خطا).
  حالت «همه‌ی بخش‌ها» وجود ندارد؛ بدون کوکی بخش روتین است.
  پیوندهای صفحه‌ی لندینگ (`LandingOtherSections`، `LandingFooter`) هنوز به زیردامنه‌ها لینک می‌دهند (فقط مهمان‌ها).
- **`localStorage` و IndexedDB per-origin‌اند.** داده‌ی مهمان (روتین مهمان، تنظیمات) و هر چیز کلاینتی دیگر بین زیردامنه‌ها جابه‌جا نمی‌شود؛ کاربر واردشده همه‌چیز را از API می‌گیرد، پس فقط مهمان‌ها متوجه می‌شوند (هر زیردامنه برای مهمان یک دستگاه جدا حساب می‌شود). کش‌های `arion:*` (استریک، اشتراک، زبان در localStorage و …) از نو ساخته می‌شوند. ردیاب خواب زنده (`lib/sleepTracker.ts`) فقط روی همان زیردامنه‌ای که شروع شد می‌ماند.
- **منتور و رمزگذاری سرتاسری** (`lib/e2ee/keyStore.ts`: IndexedDB `arion-e2ee`؛ کلیدها غیرقابل‌استخراج‌اند): کاربر واردشده با **رمز عبور** که اولین بار روی یک زیردامنه‌ی تازه بخش منتور را باز می‌کند:
  1. نشست مشترک است، پس وارد است؛ اما IndexedDB آن origin خالی است: نه کلید SYNCED محلی دارد نه KEK (KEK فقط لحظه‌ی ورود با رمز مشتق می‌شود و رمز را در این origin وارد نکرده).
  2. `bootstrap()` در `lib/e2ee/client.ts` بی‌صدا یک کلید `DEVICE` تازه برای این origin می‌سازد و روی سرور ثبت می‌کند (یک «دستگاه» تازه در فهرست دستگاه‌ها، با برچسب مرورگر/سیستم‌عامل). پیام‌های **تازه** فورا کار می‌کنند و برای این کلید هم بسته‌بندی می‌شوند.
  3. پیام‌های **قدیمی** باز نمی‌شوند و `MentorE2EEGate` این خط را نشان می‌دهد: «پیام‌های قبلی بعد از ورود دوباره با رمز عبور، روی این دستگاه هم باز می‌شن» (`history-relogin`).
  4. **بازکردن دوباره با رمز بدون خروج وجود ندارد**: تنها راه، خروج و ورود دوباره با رمز روی همان زیردامنه است (`primeE2EEFromPassword` در `loginAndRedirect` رمز را دریافت می‌کند، KEK می‌سازد، کلید SYNCED را باز می‌کند، سابقه‌ی کلید DEVICE به SYNCED منتقل و DEVICE بازنشسته می‌شود). گزینه‌ی دیگر «آوردن پیام‌های قبلی» با تایید 6 رقمی از دستگاه قدیمی است، که فقط برای حساب بدون رمز نمایش داده می‌شود.
  5. خروج روی یک زیردامنه، کلید SYNCED و KEK را فقط از IndexedDB همان origin پاک می‌کند (`wipeOnLogout`)، ولی نشست مشترک را برای همه‌ی زیردامنه‌ها می‌بندد.
  راهکار احتمالی بعدی (پیاده‌نشده): یک فیلد «رمز عبور برای باز کردن پیام‌های قبلی» در همان خط `history-relogin` که `primeE2EEFromPassword` را مستقیم صدا بزند.
- نشست قدیمی host-only فقط با یک بازدید از دامنه‌ی اصلی به نشست مشترک تبدیل می‌شود (بخش 5).
- `NEXTAUTH_URL` دامنه‌ی اصلی می‌ماند: لینک‌های مطلقی که next-auth خودش می‌سازد (مثل URL برگشتی signout) به دامنه‌ی اصلی اشاره می‌کنند؛ کد اپ فقط مسیرهای نسبی می‌دهد و `logoutAndRedirect` و `loginAndRedirect` به URL برگشتی وابسته نیستند.

## 9. تست محلی

```bash
NEXT_PUBLIC_SECTION_BASE_DOMAIN=localhost npm run dev   # NEXTAUTH_URL=http://localhost:3000
# مرورگرهای مدرن *.localhost را به 127.0.0.1 می‌برند:
#   http://trade.localhost:3000   http://routine.localhost:3000   http://workout.localhost:3000
```

روی `localhost` هیچ کوکی `Domain` ست نمی‌شود (مرورگر نمی‌پذیرد)، پس هر زیردامنه ورود جدا دارد. برای
آزمایش ورود مشترک یک دامنه‌ی ساختگی بگیر: در `/etc/hosts` بنویس `127.0.0.1 arion.test routine.arion.test trade.arion.test workout.arion.test`،
سپس `NEXT_PUBLIC_SECTION_BASE_DOMAIN=arion.test AUTH_COOKIE_SECURE=0 NEXTAUTH_URL=http://arion.test:3000 npm run dev`
(پورت در آدرس‌های ریدایرکت سئو حفظ می‌شود، چون از میزبان درخواست خوانده می‌شود).
env را **بدون پورت** بگذار. تست‌های خودکار: `__tests__/sections.test.ts`، `__tests__/sectionsEffective.test.ts`، `__tests__/sectionsMiddleware.test.ts`.
