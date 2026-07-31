import type { Config } from "tailwindcss";

// در این پروژه بیشترِ ظاهر از استایل اصلی پورت‌شده (app/globals.css) می‌آید،
// نه از یوتیلیتی‌های Tailwind — پس این کانفیگ عمداً مینیمال نگه داشته شده.
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // پالتِ داشبورد «روتین من» (app/dashboard) — namespace جدا (dash-*)
        // تا با رنگ‌های بقیه‌ی اپ (که عمدتاً از globals.css می‌آن) قاطی نشه.
        "dash-bg": "#090B0D",
        "dash-card": "#111418",
        "dash-border": "rgba(255,255,255,0.05)",
        "dash-green": "#2EE66B",
        "dash-green-glow": "rgba(46,230,107,.25)",
        "dash-text": "#FFFFFF",
        "dash-muted": "#9AA3AF",
      },
      borderRadius: {
        dash: "18px",
      },
    },
  },
  plugins: [],
};

export default config;
