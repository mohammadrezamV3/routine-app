import type { Config } from "tailwindcss";

// در این پروژه بیشتر ظاهر از استایل اصلی پورت‌شده (app/globals.css) می‌آید،
// نه از یوتیلیتی‌های Tailwind — پس این کانفیگ عمدا مینیمال نگه داشته شده.
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // پالت داشبورد — namespace جدا (dash-*) فقط برای اینکه اسم کلاس‌ها
        // خوانا بمونه، ولی مقدار هرکدوم مستقیما روی متغیرهای CSS تم اصلی
        // اپ (app/globals.css) سوار شده — یعنی با تغییر تم (روشن/تاریک) خودکار
        // آپدیت می‌شن، برخلاف نسخه‌ی قبلی که رنگ‌های ثابت هاردکدشده داشت.
        "dash-bg": "var(--bg)",
        // رنگ توپر سطح (globals.css) — نه شیشه‌ی ۲٪ که فقط با
        // backdrop-blur کارت به‌نظر می‌رسید و روی موبایل (که بلور برداشته
        // می‌شه) عملا نامرئی می‌شد.
        "dash-card": "var(--surface-1)",
        "dash-border": "var(--surface-line)",
        "dash-green": "var(--accent)",
        "dash-green-glow": "rgba(var(--accent-rgb),.25)",
        "dash-text": "var(--text)",
        "dash-muted": "var(--muted)",
      },
      borderRadius: {
        dash: "18px",
      },
    },
  },
  plugins: [],
  // روی دستگاه لمسی، مرورگر :hover را بعد از ضربه *نگه می‌دارد* تا وقتی
  // جای دیگری لمس شود — یعنی دکمه/روزی که زدی رنگ‌عوض‌شده گیر می‌کند و
  // شبیه «انتخاب‌شده» به‌نظر می‌رسد. این فلگ همه‌ی یوتیلیتی‌های hover: را
  // داخل `@media (hover:hover)` می‌برد، پس آن حالت روی لمس اصلا وجود
  // ندارد. (قواعد hoverِ دست‌نویسِ globals.css جدا و به همین شکل
  // پوشانده شده‌اند.)
  future: { hoverOnlyWhenSupported: true },
};

export default config;
