import { defineConfig } from "vitest/config";
import path from "path";

// اولین راه‌اندازیِ تست توی این پروژه — عمداً حداقلی: فقط برای فیچرِ OTP
// ایمیل که صریحاً تست خواسته شده بود. محیط node (نه jsdom) چون فقط منطقِ
// سرور/route handlerها تست می‌شن، نه کامپوننتِ React.
export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    testTimeout: 15000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
