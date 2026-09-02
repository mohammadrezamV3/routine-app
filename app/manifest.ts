import type { MetadataRoute } from "next";

// بدون این فایل، اصلا هیچ Web App Manifestی وجود نداشت — یعنی «افزودن به
// صفحه‌ی اصلی» (که خود اپ توی پنل اعلانیه‌ها به کاربر پیشنهادش می‌ده) فقط
// یه بوکمارک معمولی مرورگر می‌ساخت، نه یه اپ واقعی standalone — دقیقا
// همون دلیل باگ «موقع ناوبری بین صفحه‌ها، نوار آدرس/بارگذاری مرورگر
// دوباره نشون داده می‌شه»: بدون display:"standalone"، مرورگر (خصوصا
// اندروید/کروم) کل رابط خودش (نوار آدرس، دکمه‌ی رفرش) رو نگه می‌داره.
// Next.js با همین فایل (app/manifest.ts) خودش تگ <link rel="manifest">
// رو توی <head> تزریق می‌کنه — نیازی به کار دستی نیست.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arion",
    short_name: "Arion",
    description: "روتین، خواب، ترید، ورزش و رودمپ‌های شخصی — همه‌جا یکجا",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0f0d",
    theme_color: "#0a0f0d",
    dir: "rtl",
    lang: "fa",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
