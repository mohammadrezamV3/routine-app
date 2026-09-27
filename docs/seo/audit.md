# ممیزی سئوی فنی و on-page آریون

تاریخ: ۱۴۰۵ (مهر). این سند خروجی یک پاس فنی/on-page روی کد فعلی است — نه یک
پلن آینده. هرچه پایین آمده یا از قبل درست بود (و این‌جا فقط ثبت شده)، یا در
همین پاس اصلاح شده (با توضیح تغییر).

> نکته‌ی مهم: هم‌زمان با این پاس، یک ایجنت دیگر مشغول ساختن صفحه‌های فرود و
> مقاله‌های جدید بود (`app/q/*`, `lib/qa/*`, چند `opengraph-image.tsx` بدون
> `page.tsx` کنارشون مثل `habit-streak`, `sleep-tracker`, `todo-list`,
> `workout-tracker`, `weekly-planner`, `persian-calendar-planner`,
> `metatrader-journal`, `prop-firm-journal`, `trading-checklist`). این پاس
> عمدا آن‌ها را دست‌نخورده گذاشته — هم چون مالکشان نیستم، هم چون صریحا
> خواسته شده بود صفحه‌ی جدید نسازم. خطای بیلد فعلی (`lib/qa/index.ts` به
> `./routine`/`./trading`/`./fitness` که هنوز وجود ندارند) مال همان کار
> ناتمام است، نه این پاس.

## ۱. جدول مسیرها

| مسیر | نوع | وضعیت ایندکس | چه چیزی اصلاح شد |
|---|---|---|---|
| `/` | عمومی (لندینگ) | ایندکس | `BRAND_TITLE` کوتاه‌تر و با کلیدواژه‌ی «اپلیکیشن روتین» + `alternates.languages` |
| `/routine` | عمومی | ایندکس | از قبل کامل بود (title/desc/canonical/OG/Twitter/Breadcrumb/FAQ) — دست‌نخورده |
| `/habit-tracker` | عمومی | ایندکس | از قبل کامل بود — دست‌نخورده |
| `/daily-planner` | عمومی | ایندکس | از قبل کامل بود — دست‌نخورده |
| `/trading-journal` | عمومی | ایندکس | از قبل کامل بود — دست‌نخورده |
| `/bodybuilding-program` | عمومی | ایندکس | از قبل کامل بود — دست‌نخورده |
| `/calorie-counter` | عمومی | ایندکس | از قبل کامل بود — دست‌نخورده |
| `/ai-planner` | عمومی | ایندکس | از قبل کامل بود — دست‌نخورده |
| `/economic-calendar` | عمومی | ایندکس | از قبل کامل بود — دست‌نخورده |
| `/forex-sessions` | عمومی | ایندکس | از قبل کامل بود — دست‌نخورده |
| `/learning-roadmap` | عمومی (اما ماژول پشت فلگ `roadmaps: off`) | ایندکس، محتوا صادقانه «به‌زودی» | از قبل درست بود — دست‌نخورده |
| `/blog` | عمومی | ایندکس | دست‌نخورده |
| `/blog/[slug]` | عمومی | ایندکس | prev/next بین مقاله‌ها اضافه شد (در `BlogArticle`) |
| `/faq` | عمومی | ایندکس | از `Metadata` دستی به `pageMetadata` (twitter card جا افتاده بود) + `breadcrumbJsonLd` اضافه شد |
| `/about` | عمومی | ایندکس | همان‌طور + `breadcrumbJsonLd` |
| `/terms` | عمومی | ایندکس | همان‌طور + `breadcrumbJsonLd` |
| `/weekly` | خصوصی (داشبورد) | noindex,nofollow (هدر) | بدون تغییر — از قبل توسط `next.config.js`/`robots.ts` پوشش داده می‌شد |
| `/exercise` | خصوصی | noindex,nofollow (هدر) | بدون تغییر |
| `/trade`, `/trade/*` | خصوصی | noindex,nofollow (هدر) | بدون تغییر |
| `/roadmaps`, `/roadmaps/*` | خصوصی (پشت فلگ + auth) | noindex,nofollow (هدر) | بدون تغییر |
| `/account`, `/account/*` | خصوصی | noindex,nofollow (هدر) | بدون تغییر |
| `/admin`, `/admin/*` | خصوصی | noindex,nofollow (هدر + `metadata` سرور در `app/admin/layout.tsx`) | بدون تغییر |
| `/analysis/weekly` | خصوصی | **قبلا هیچ‌جا disallow/noindex نبود** → اضافه شد به `NOINDEX_NOFOLLOW_PATH_PREFIXES` (`next.config.js`) و `disallow` (`robots.ts`) |
| `/subscription`, `/subscription/checkout` | خصوصی/تراکنشی | noindex,nofollow (هدر) | بدون تغییر |
| `/auth/login`, `/auth/signup`, `/auth/forgot-password` | یوتیلیتی | **قبلا noindex,nofollow بود** → به `noindex, follow` تغییر کرد (طبق دستورالعمل: auth باید follow باشد) |
| `/offline` | یوتیلیتی (PWA fallback) | noindex,nofollow (خودِ صفحه `robots: {index:false, follow:false}` دارد) | بدون تغییر |
| `app/not-found.tsx` (۴۰۴) | یوتیلیتی | noindex,nofollow | از قبل درست بود — دست‌نخورده |

## ۲. کلیدواژه‌ی اصلیِ هر صفحه‌ی فرود (جلوگیری از cannibalization)

هرکدام یک نیت جستجوی متفاوت دارند — فهرست کامل در `docs/seo/keyword-map.md`.
خلاصه: `/routine` = «روتین روزانه»، `/habit-tracker` = «عادت‌ساز / پیگیری
عادت»، `/daily-planner` = «برنامه‌ریزی روزانه»، `/ai-planner` = «برنامه‌ریزی
با هوش مصنوعی»، `/bodybuilding-program` = «برنامه بدنسازی هوشمند»،
`/calorie-counter` = «کالری‌شمار»، `/trading-journal` = «ژورنال معاملاتی»،
`/economic-calendar` = «تقویم اقتصادی فارکس»، `/forex-sessions` = «ساعت بازار
فارکس»، `/learning-roadmap` = «رودمپ یادگیری». هیچ دو صفحه‌ای روی یک
کلیدواژه‌ی اصلی رقابت نمی‌کنند.

## ۳. تغییرات این پاس، به‌تفکیک فایل

- **`next.config.js`**: `NOINDEX_PATH_PREFIXES` به دو لیست تقسیم شد:
  `NOINDEX_NOFOLLOW_PATH_PREFIXES` (بدون تغییر در محتوا، بجز افزودن
  `/analysis`) و `NOINDEX_FOLLOW_PATH_PREFIXES` (`/auth/:path*` — فقط
  همین یکی، چون auth تنها گروهی بود که follow برایش بی‌ضرر است).
- **`app/robots.ts`**: `disallow` برای `/analysis$` و `/analysis/` اضافه
  شد (قبلا فراموش شده بود — تنها مسیر خصوصی که در هیچ‌کدام از robots.ts/
  next.config.js نبود).
- **`lib/seo.ts`**: `pageMetadata` حالا `alternates.languages` (`fa-IR` +
  `x-default`، هردو به همان canonical) هم برمی‌گرداند. `websiteJsonLd`
  فیلد `about` گرفت (اشاره به همان Organization). `softwareApplicationJsonLd`
  فیلد `keywords` گرفت.
- **`app/layout.tsx`**: `alternates.languages` سراسری اضافه شد (همان دو
  کلید، به `SITE_URL`).
- **`app/page.tsx`**: همان `alternates.languages` برای مسیر ریشه.
- **`lib/brand.ts`**: `BRAND_TITLE` از
  «آریون | برنامه‌ریزی روزانه، بدنسازی، کالری‌شمار و ژورنال ترید» (۶۱
  کاراکتر) به «آریون | اپلیکیشن روتین، برنامه‌ریزی روزانه و ژورنال ترید»
  (۵۶ کاراکتر) تغییر کرد — کلیدواژه‌ی «اپلیکیشن روتین» را که قبلا هیچ‌جای
  عنوان سراسری/صفحه‌ی اصلی نبود اضافه می‌کند و طول را زیر ۶۰ کاراکتر نگه
  می‌دارد. این عنوان هم fallback سراسری سایت است هم عنوان مستقیمِ صفحه‌ی
  اصلی.
- **`app/faq/page.tsx`**, **`app/about/page.tsx`**, **`app/terms/page.tsx`**:
  از ساختن دستیِ `Metadata` به فراخوانی `pageMetadata` تغییر کردند — قبلا
  هیچ‌کدام `twitter` تعریف نمی‌کردند، پس کارت اشتراک‌گذاری در توییتر برای
  این سه صفحه به‌جای عنوان/توضیحِ خودشان، مقدار پیش‌فرض سراسریِ
  `app/layout.tsx` (عنوان برند) را نشان می‌داد. هرسه حالا `breadcrumbJsonLd`
  هم دارند (قبلا نداشتند).
- **`app/blog/[slug]/page.tsx`** + **`components/BlogArticle.tsx`**: لینک
  «مقاله‌ی قبلی/بعدی» (بر اساس ترتیب واقعیِ `sortedPosts`) و فهرست مطالب
  (لینک‌های anchor به تیترهای H2، فقط وقتی حداقل دو H2 وجود دارد) اضافه
  شد. Related posts (۳ مقاله) و breadcrumb از قبل بودند.

## ۴. چیزهایی که از قبل درست بودند و دست‌نخورده ماندند (تایید شد، نه اضافه)

- `Organization`/`WebSite`/`SoftwareApplication` با `@id` مشترک در
  `app/layout.tsx` — بدون `aggregateRating`/`review` ساختگی.
- `siteNavigationJsonLd` برای sitelinks.
- `sitemap.ts`: فقط مسیرهای عمومی، `lastModified` واقعی برای مقاله‌ها (نه
  `now`).
- `robots.ts`: قانون صریح برای خزنده‌های AI (GPTBot، ClaudeBot، …).
- `next/font` برای Vazirmatn/Inter (self-host — نیازی به `preconnect` به
  fonts.googleapis.com نیست چون اصلا درخواستی به آن دامنه نمی‌رود).
- صفحه‌های فرود متنی‌اند (بدون تصویر) — نیازی به alt text اضافه نبود؛
  تنها `<Image>`های عمومی (لوگوی فوتر) از قبل `alt` مناسب داشتند.
- امنیت/عملکرد: `X-Robots-Tag` فقط برای مسیرهای خصوصی، هدرهای امنیتی فقط
  روی production — طبق قانون پروژه دست نخورد.

## ۵. چیزهایی که عمدا تغییر نکرد (خارج از مالکیت یا خارج از حدود این پاس)

- `lib/blogPosts.ts` — به‌صراحت گفته شد ویرایش نشود (مال ایجنت دیگر).
- `app/q/*`, `lib/qa/*`, و صفحه‌های جدیدِ در حال ساخت (`habit-streak`,
  `sleep-tracker`, `todo-list`, `workout-tracker`, `weekly-planner`,
  `persian-calendar-planner`, `metatrader-journal`, `prop-firm-journal`,
  `trading-checklist`) — کاملا دست‌نخورده ماندند، خطای بیلدشان مال همان
  کار ناتمام است.
- `/account/layout.tsx`، `/weekly`، `/exercise`، `/trade`، `/roadmaps` —
  همه Client Component هستند و نمی‌توانند مستقیم `export const metadata`
  بدهند؛ noindex این‌ها فقط از طریق `X-Robots-Tag` (next.config.js) +
  `robots.ts` تامین می‌شود، نه متادیتای per-page. این همان معماریِ از‌قبل
  انتخاب‌شده‌ی پروژه است (مستند در کامنت‌های خودِ `next.config.js`) و
  دوباره‌سازیِ این لایه‌ها به Server+Client جدا یک ریفکتور بزرگ‌تر از حدِ
  یک پاس سئو بود، برای همین دست نخورد. تنها استثنا `app/admin/layout.tsx`
  است که از قبل Server Component بوده و `metadata` مستقیم دارد.

## ۶. Verify

- `npx tsc --noEmit -p .` روی فایل‌های تحت مالکیت این پاس (`app/page.tsx`,
  `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`,
  `app/not-found.tsx`, `app/faq/page.tsx`, `app/about/page.tsx`,
  `app/terms/page.tsx`, `app/blog/**`, `lib/seo.ts`, `lib/brand.ts`,
  `components/BlogArticle.tsx`, `components/LandingFooter.tsx`,
  `components/LandingPage.tsx`, `lib/llmsContent.ts`) بدون خطا.
- `next build` با خطای `lib/qa/index.ts` (ماژول‌های `./routine`/
  `./trading`/`./fitness` که وجود ندارند) شکست می‌خورد — این خطا مالِ
  کارِ هم‌زمانِ ایجنتِ دیگر است (`app/q/*`)، نه این پاس؛ `app/q/` در
  `git status` به‌عنوان untracked ظاهر می‌شود و هیچ فایلی از آن در این
  پاس لمس نشده است.
