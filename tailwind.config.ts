import type { Config } from "tailwindcss";

// در این پروژه بیشترِ ظاهر از استایل اصلی پورت‌شده (app/globals.css) می‌آید،
// نه از یوتیلیتی‌های Tailwind — پس این کانفیگ عمداً مینیمال نگه داشته شده.
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // پالتِ داشبورد — namespace جدا (dash-*) فقط برای اینکه اسم کلاس‌ها
        // خوانا بمونه، ولی مقدارِ هرکدوم مستقیماً روی متغیرهای CSSِ تمِ اصلیِ
        // اپ (app/globals.css) سوار شده — یعنی با تغییر تم (روشن/تاریک) خودکار
        // آپدیت می‌شن، برخلاف نسخه‌ی قبلی که رنگ‌های ثابتِ هاردکدشده داشت.
        "dash-bg": "var(--bg)",
        "dash-card": "var(--card-bg)",
        "dash-input": "var(--input-bg)",
        "dash-border": "var(--line)",
        "dash-green": "var(--accent)",
        "dash-green-hover": "var(--accent-hover)",
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
};

export default config;
