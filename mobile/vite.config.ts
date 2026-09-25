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
    rollupOptions: {
      output: {
        // وندورهای همیشه-eager (react/framer-motion/dexie/…) از چانکِ اصلی
        // جدا می‌شن تا خودِ چانکِ index (کدِ اپ) زیرِ ۲۵۰KB بمونه — این
        // چانک‌ها هنوز eager لود می‌شن (لازمِ App.tsx خودشه)، فقط فایلِ
        // جدا و قابلِ کش‌شدنِ مستقلن.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("/dexie")) return "vendor-dexie";
          if (id.includes("react-router") || id.includes("/react/") || id.includes("/react-dom/") || id.includes("scheduler")) {
            return "vendor-react";
          }
          if (id.includes("@capacitor")) return "vendor-capacitor";
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
