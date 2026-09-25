import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ir.arion.app",
  appName: "Arion",
  // UI کاملا داخل APK باندل می‌شه (dist/) — بدون server.url به سمت وب‌سایت،
  // یعنی اپ بدون اینترنت هم باز و قابل استفاده‌ست. اتصال به بک‌اند Next.js
  // فقط بعدا برای لاگین/سینک از داخل کد (fetch) اضافه می‌شه، نه از این‌جا.
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0e1011",
  },
  backgroundColor: "#0e1011",
  plugins: {
    // launchShowDuration ~0: خودِ splashِ نیتیو خیلی زود محو می‌شه، و
    // hideSplash (lib/statusBar.ts) بعدِ اولین رندرِ واقعیِ ری‌اکت دستی صداش
    // می‌زنه (App.tsx → useEffect) — یعنی «صفحه‌ی سفید» بینِ این دو دیده نمی‌شه.
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#0e1011",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
