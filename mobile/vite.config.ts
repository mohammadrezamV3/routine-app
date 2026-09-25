import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// اپ موبایل مستقل از اپ وب (Next.js) است — این config کاملا جدا از
// next.config.js ریشه‌ی پروژه است و هیچ فرضی درباره‌ی سرور Next نمی‌کند.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
