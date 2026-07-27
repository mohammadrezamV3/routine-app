"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getThemeSetting, setThemeSetting } from "@/lib/storage";

type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

// از این به بعد از همون لایه داده مشترک (lib/storage.ts) استفاده می‌کنه —
// یعنی برای کاربر لاگین‌کرده تم روی حساب کاربری‌اش ذخیره می‌شه (بین دستگاه‌ها
// همگام می‌مونه)، و برای مهمان‌ها هنوز روی localStorage همین دستگاهه.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    getThemeSetting().then((saved) => {
      if (saved === "light" || saved === "dark") setTheme(saved);
    });
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    setThemeSetting(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{ theme, toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")) }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
