import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { serverOnlyGuard, webModuleRedirects, webPublicImages } from "./tooling/webCompat";

// اپ موبایل صفحه‌ها/کامپوننت‌های *خودِ وب* (app/ components/ lib/ ریشه) رو
// مستقیم کامپایل می‌کنه — mobile/PORT_PLAN.md. `@/…` یعنی ریشه‌ی ریپو (دقیقا
// مثل tsconfigِ وب)، و کدِ خودِ اپ با `@m/…` (mobile/src).
const MOBILE = __dirname;
const REPO = path.resolve(__dirname, "..");
const SHIMS = path.resolve(__dirname, "src/shims");
const opts = { repoRoot: REPO, shimsDir: SHIMS };

// وابستگی‌هایی که کدِ وب import می‌کنه. کدِ وب بیرونِ mobile/ است، پس Vite
// بدونِ dedupe اون‌ها رو از node_modulesِ *ریشه* می‌خوند (دو نسخه‌ی React ←
// hooks می‌شکنن؛ و روی CI که فقط mobile/ نصب می‌شه اصلا پیدا نمی‌شدن).
const DEDUPE = [
  "react",
  "react-dom",
  "react-router-dom",
  "framer-motion",
  "lucide-react",
  "animejs",
  "clsx",
  "tailwind-merge",
  "zxcvbn",
  "dexie",
  "@capacitor/core",
];

const env = (k: string) => (process.env[k] !== undefined ? JSON.stringify(process.env[k]) : "undefined");

export default defineConfig({
  plugins: [
    serverOnlyGuard(opts),
    // درزهای پلتفرم: همون ماژولِ وب با نسخه‌ی Capacitor عوض می‌شه
    webModuleRedirects(opts, {
      "lib/pushClient": "pushClient.ts",
    }),
    webPublicImages(opts),
    react(),
  ],
  // public/ِ وب (sw.js، ea/، og.png) عمدا سرو نمی‌شه — فقط /images با پلاگینِ بالا
  publicDir: false,
  resolve: {
    alias: [
      { find: /^@m\//, replacement: `${path.join(MOBILE, "src")}/` },
      { find: /^next\/link$/, replacement: path.join(SHIMS, "next-link.tsx") },
      { find: /^next\/navigation$/, replacement: path.join(SHIMS, "next-navigation.ts") },
      { find: /^next\/image$/, replacement: path.join(SHIMS, "next-image.tsx") },
      { find: /^next\/dynamic$/, replacement: path.join(SHIMS, "next-dynamic.tsx") },
      { find: /^next-auth\/react$/, replacement: path.join(SHIMS, "next-auth-react.tsx") },
      { find: /^next-auth$/, replacement: path.join(SHIMS, "next-auth.ts") },
      { find: /^next$/, replacement: path.join(SHIMS, "next.ts") },
      { find: /^@prisma\/client$/, replacement: path.join(SHIMS, "prisma-client.ts") },
      { find: /^@\//, replacement: `${REPO}/` },
    ],
    dedupe: DEDUPE,
  },
  define: {
    "process.env.NEXT_PUBLIC_SITE_URL": env("NEXT_PUBLIC_SITE_URL"),
    "process.env.NEXT_PUBLIC_APP_VERSION": env("NEXT_PUBLIC_APP_VERSION"),
    "process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY": env("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // تنها چانکِ بالای ۵۰۰KB همون zxcvbnِ lazy ـه (بالا)
    chunkSizeWarningLimit: 850,
    rollupOptions: {
      onwarn(warning, warn) {
        // "use client" در کدِ وب برای Next معنا داره؛ این‌جا بی‌اثر و بی‌خطره
        if (warning.code === "MODULE_LEVEL_DIRECTIVE" && /use client/.test(warning.message)) return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) return "vendor-motion";
          if (id.includes("/dexie")) return "vendor-dexie";
          // دیکشنریِ zxcvbn (~۸۰۰KB) — فقط با import پویای lib/passwordStrength.ts
          // (صفحه‌های ثبت‌نام/بازیابی) لود می‌شه، هیچ‌وقت در شروعِ اپ
          if (id.includes("/zxcvbn/")) return "zxcvbn";
          if (id.includes("react-router") || id.includes("/react/") || id.includes("/react-dom/") || id.includes("scheduler")) {
            return "vendor-react";
          }
          if (id.includes("@capacitor")) return "vendor-capacitor";
          // بقیه (آیکون‌های lucide، animejs، …) دستِ Rollup: هر کدوم کنارِ صفحه‌ای
          // که لازمش داره می‌ره، نه در یک چانکِ eager ِ مشترک
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    fs: { allow: [REPO] },
  },
});
