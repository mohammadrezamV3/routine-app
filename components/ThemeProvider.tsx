"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getThemeSetting, setThemeSetting } from "@/lib/storage";

type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

// از این به بعد از همون لایه داده مشترک (lib/storage.ts) استفاده می‌کنه —
// یعنی برای کاربر لاگین‌کرده تم روی حساب کاربری‌اش ذخیره می‌شه (بین دستگاه‌ها
// همگام می‌مونه)، و برای مهمان‌ها هنوز روی localStorage همین دستگاهه.
//
// مقدار اولیه از همون کوکی‌ای خونده می‌شه که اسکریپتِ inline توی layout.tsx
// قبل از هیدریت روی body اعمال کرده — این‌جوری stateِ خودِ ری‌اکت هم از همون
// اول با DOM هم‌خون می‌مونه، وگرنه افکتِ پایین با مقدارِ پیش‌فرضِ "dark"
// دوباره رو چیزی که اسکریپت درست کرده بود می‌نوشت.
function readThemeCookie(): Theme {
  if (typeof document === "undefined") return "dark";
  const m = document.cookie.match(/(?:^|; )theme=(dark|light)/);
  return (m?.[1] as Theme) || "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readThemeCookie);
  const mounted = useRef(false);

  useEffect(() => {
    getThemeSetting().then((saved) => {
      if (saved === "light" || saved === "dark") setTheme(saved);
    });
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    // اولین اجرای این افکت فقط همونی رو که سرور از قبل ست کرده تکرار می‌کنه —
    // نیازی به نوشتنِ دوباره‌ش (کوکی/DB) نیست؛ فقط از تغییرات واقعیِ بعدی
    // (تاگل دستی یا sync شدن از دستگاه دیگه) ذخیره می‌کنیم.
    if (!mounted.current) { mounted.current = true; return; }
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
