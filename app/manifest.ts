import type { MetadataRoute } from "next";
import { BRAND_FA } from "@/lib/brand";
import { THEME_COLORS, themeColorFor } from "@/lib/themeColor";
import { tr } from "@/lib/i18n";
import { getSection } from "@/lib/sectionServer";
import { SECTION_META, isSectionHostingEnabled, type SectionKey } from "@/lib/sections";

// آیکون رنگی هر بخش برای «افزودن به صفحه‌ی اصلی» (public/images/sections/app/، پس‌زمینه‌ی سرمه‌ای
// مثل app/icon.png و نشان A به رنگ بخش). maskable-512 برای اندروید با ناحیه‌ی امن بزرگ‌تره.
function sectionIcons(key: SectionKey): MetadataRoute.Manifest["icons"] {
  const dir = `/images/sections/app/${key}`;
  return [
    { src: `${dir}-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
    { src: `${dir}-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
    { src: `${dir}-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    { src: `${dir}-180.png`, sizes: "180x180", type: "image/png", purpose: "any" },
  ];
}

// فقط میان‌برهای همون بخش؛ مسیرها باید با مالکیت مسیر در lib/sections.ts بخونن
function sectionShortcuts(key: SectionKey): MetadataRoute.Manifest["shortcuts"] {
  if (key === "trade") {
    return [
      { name: tr("ژورنال ترید", "Trade journal"), url: "/trade" },
      { name: tr("تقویم اقتصادی", "Economic calendar"), url: "/trade/calendar" },
    ];
  }
  if (key === "workout") {
    return [
      { name: tr("برنامه‌ی تمرینی", "Workout plan"), url: "/exercise" },
      { name: tr("خواب", "Sleep"), url: "/sleep" },
    ];
  }
  return [
    { name: tr("برنامه‌ی روزانه", "Daily plan"), url: "/weekly" },
    { name: tr("خواب", "Sleep"), url: "/sleep" },
    { name: tr("رودمپ‌ها", "Roadmaps"), url: "/roadmaps" },
  ];
}

// بدون این فایل، اصلا هیچ Web App Manifestی وجود نداشت — یعنی «افزودن به
// صفحه‌ی اصلی» (که خود اپ توی پنل اعلانیه‌ها به کاربر پیشنهادش می‌ده) فقط
// یه بوکمارک معمولی مرورگر می‌ساخت، نه یه اپ واقعی standalone — دقیقا
// همون دلیل باگ «موقع ناوبری بین صفحه‌ها، نوار آدرس/بارگذاری مرورگر
// دوباره نشون داده می‌شه»: بدون display:"standalone"، مرورگر (خصوصا
// اندروید/کروم) کل رابط خودش (نوار آدرس، دکمه‌ی رفرش) رو نگه می‌داره.
// Next.js با همین فایل (app/manifest.ts) خودش تگ <link rel="manifest">
// رو توی <head> تزریق می‌کنه — نیازی به کار دستی نیست.
export default function manifest(): MetadataRoute.Manifest {
  // روی زیردامنه‌ی هر بخش، اپ نصب‌شده اسم و آیکون و میان‌برهای همون بخش رو داره. بدون
  // NEXT_PUBLIC_SECTION_BASE_DOMAIN headers() صدا زده نمی‌شه و خروجی دقیقا مثل قبله.
  const section = isSectionHostingEnabled() ? getSection() : null;
  if (section) {
    const meta = SECTION_META[section];
    const name = `${tr("آریون", "Arion")} ${meta.label}`;
    return {
      id: "/",
      name,
      short_name: name,
      description: meta.tagline,
      start_url: "/",
      display: "standalone",
      // اسپلش و نوار اپ نصب‌شده هم‌رنگ پالت شب همون بخش (ترید/تمرین؛ روتین = رنگ پایه)
      background_color: themeColorFor("dark", section),
      theme_color: themeColorFor("dark", section),
      dir: tr("rtl", "ltr") as "rtl" | "ltr",
      lang: tr("fa", "en"),
      icons: sectionIcons(section),
      shortcuts: sectionShortcuts(section),
    };
  }
  return {
    id: "/",
    name: BRAND_FA,
    short_name: BRAND_FA,
    description:
      "روتین روزانه و هفتگی، پیگیری عادت‌ها و کارها، برنامه‌ی بدنسازی با AI، کالری‌شماری، " +
      "ژورنال معاملات ترید و رودمپ یادگیری — همه در یک اپ فارسی.",
    start_url: "/",
    display: "standalone",
    // اسپلش‌اسکرین اندروید (قبل از اولین پینت صفحه) دقیقا با همین رنگ
    // کشیده می‌شه. قبلا #0a0f0d بود — نه --bg (#0E1011) نه رنگ متای
    // theme-color — یعنی هر بار باز کردن اپ نصب‌شده اول یک پس‌زمینه‌ی
    // دیگه (اسپلش) دیده می‌شد و بعد صفحه با رنگ خودش. حالا از همون منبع
    // واحد رنگ تم می‌آد (تم پیش‌فرض سرور = تاریک).
    background_color: THEME_COLORS.dark,
    theme_color: THEME_COLORS.dark,
    dir: "rtl",
    lang: "fa",
    categories: ["productivity", "lifestyle", "health", "finance", "education"],
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    // فقط مسیرهای واقعا عمومی/مجاز — نه صفحاتی مثل /roadmaps که فعلا
    // کاملا مخصوص سوپریوزرند (lib/requireSuperAdmin.ts).
    shortcuts: [
      { name: "روتین هفتگی", url: "/weekly" },
      { name: "بدنسازی و تغذیه", url: "/exercise" },
      { name: "ژورنال ترید", url: "/trade" },
    ],
  };
}
