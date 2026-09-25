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
  },
};

export default config;
