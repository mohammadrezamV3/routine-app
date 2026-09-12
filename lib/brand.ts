// نام برند، در یک‌جا. چرا lib و نه هرجا که لازم شد:
//
// قبل از این، «آریون» صفر بار در متن واقعی صفحه‌ی اصلی بود و فقط «Arion»
// نوشته شده بود. گوگل تطابق برند رو روی محتوای واقعی صفحه انجام می‌ده، پس
// جست‌وجوی «آریون» یا «آریون اپ» هیچ چیزی برای تطابق پیدا نمی‌کرد. حالا که
// این رشته‌ها توی title/description/JSON-LD/h1 پخش شدن، اگه هرکدوم جدا
// نوشته بشن مرور زمان از هم واگرا می‌شن (همون درسی که با لیست کلیدهای
// تنظیمات گرفتیم) — پس یک منبع واحد.
export const BRAND_FA = "آریون";
export const BRAND_EN = "Arion";

/** هردو املا کنار هم — هرجا که نام برند به‌تنهایی می‌آید */
export const BRAND_BOTH = `${BRAND_EN} (${BRAND_FA})`;

/**
 * دسته‌ی محصول، به همان شکلی که کاربر فارسی‌زبان تایپش می‌کند.
 *
 * این فقط یک رشته‌ی سئویی نیست — «روتین اپ» واقعا توصیف درستِ کاری‌ست که
 * آریون انجام می‌دهد (برنامه‌ریزی روزانه و پیگیری عادت‌ها)، پس بدون اینکه
 * برند عوض شود، رابطه‌ی «آریون = یک روتین اپ» در عنوان، H1، توضیحات و
 * JSON-LD یک‌دست تکرار می‌شود. نام محصول همچنان «آریون/Arion» است.
 */
export const BRAND_CATEGORY_FA = "روتین اپ";

export const BRAND_TITLE = `${BRAND_CATEGORY_FA} ${BRAND_FA} | برنامه‌ریزی روزانه و مدیریت عادت‌ها`;

export const BRAND_DESC =
  `${BRAND_FA} (${BRAND_EN}) یک ${BRAND_CATEGORY_FA} فارسی است: روتین روزانه و هفتگی بساز، ` +
  `عادت‌هایت را پیگیری کن و کارها، ورزش، تغذیه و ژورنال ترید را یک‌جا مدیریت کن.`;

// املاهایی که کاربر فارسی‌زبان واقعا تایپ می‌کنه. alternateName همون
// چیزیه که گوگل برای وصل‌کردن یک موجودیت (entity) به املاهای دیگه‌اش
// استفاده می‌کنه؛ بدونش «آریون» و «Arion» از نظر گوگل دو چیز بی‌ربطن.
// «روتین اپ»/«روتین‌اپ» هم این‌جاست چون کاربر با همین عبارت دنبال این
// دسته می‌گردد و آریون واقعا مصداقش است — نه یک نام جعلی برای برند.
export const BRAND_ALT_NAMES = [
  BRAND_FA, BRAND_EN, `${BRAND_FA} اپ`, `اپ ${BRAND_FA}`, `${BRAND_EN} App`,
  BRAND_CATEGORY_FA, "روتین‌اپ", `${BRAND_CATEGORY_FA} ${BRAND_FA}`, "Routine App",
];

// پایه‌ی OpenGraph — باید توی *هر* صفحه‌ای که openGraph خودش رو تعریف
// می‌کنه spread بشه.
//
// چرا لازمه: نکست فیلد openGraph رو بین layout و page **ادغام نمی‌کنه**،
// جایگزین می‌کنه. یعنی هر صفحه‌ای که فقط `openGraph: { url: "/faq" }`
// می‌نوشت، بی‌سروصدا og:image و og:type و og:locale و og:site_name رو از
// دست می‌داد — و دقیقا همین شده بود: هیچ‌کدوم از صفحه‌های عمومی og:image
// نداشتن، پس هر لینکی که در تلگرام/واتساپ/توییتر به‌اشتراک گذاشته می‌شد
// یه کارت بی‌تصویر می‌شد.
export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: BRAND_BOTH };

export const OG_BASE = {
  type: "website" as const,
  locale: "fa_IR",
  siteName: BRAND_BOTH,
  images: [OG_IMAGE],
};

// شبکه‌های اجتماعی — در سه جا استفاده می‌شوند (صفحه‌ی «درباره ما»، صفحه‌ی
// پشتیبانی پنل، و `sameAs` در JSON-LD)، پس مثل بقیه‌ی نام برند یک منبع
// واحد دارند.
export const SOCIAL = {
  telegram: { handle: "@Arionapp", url: "https://t.me/Arionapp" },
  instagram: { handle: "@Arionapp", url: "https://instagram.com/Arionapp" },
} as const;

export const SUPPORT_EMAIL = "smm881517@gmail.com";

// sameAs همان چیزی است که گوگل برای وصل‌کردن یک موجودیت به پروفایل‌های
// رسمی‌اش استفاده می‌کند. برای دامنه‌ای که هیچ بک‌لینکی ندارد این یکی از
// معدود سیگنال‌هایی است که می‌شود از داخل خود سایت داد.
export const BRAND_SAME_AS = [SOCIAL.telegram.url, SOCIAL.instagram.url];
