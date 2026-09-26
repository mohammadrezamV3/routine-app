import type { Config } from "tailwindcss";
import webConfig from "../tailwind.config";

// اپ همون صفحه‌ها/کامپوننت‌های وب رو رندر می‌کنه، پس کانفیگ همون کانفیگِ
// ریشه‌ست (preset) — فقط مسیرهای content از دیدِ mobile/ نوشته شده‌ن.
const config: Config = {
  presets: [webConfig],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../app/**/*.{ts,tsx}",
    "../components/**/*.{ts,tsx}",
    "../lib/**/*.{ts,tsx}",
  ],
};

export default config;
