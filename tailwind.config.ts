import type { Config } from "tailwindcss";

// در این پروژه بیشترِ ظاهر از استایل اصلی پورت‌شده (app/globals.css) می‌آید،
// نه از یوتیلیتی‌های Tailwind — پس این کانفیگ عمداً مینیمال نگه داشته شده.
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
