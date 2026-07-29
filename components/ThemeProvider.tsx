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
// stateِ اولیه عمداً همیشه "dark"ه — دقیقاً همون پیش‌فرضی که سرور رندر
// می‌کنه — نه از روی کوکی. اگه این‌جا مستقیم کوکی رو می‌خوندیم، stateِ اولیه‌ی
// کلاینت با چیزی که سرور رندر کرده فرق می‌کرد (mismatch) و React برای هر
// جزئی که مستقیم از این state چیزی رندر می‌کنه (مثل لوگوی NavDrawer که
// src ش به تم بستگی داره) یه warning هیدریت می‌داد. رنگ‌بندیِ سراسریِ صفحه
// از این مسیر نمیاد — از data-theme روی body میاد که اسکریپتِ inline توی
// layout.tsx مستقیم روی DOM (نه از راه ری‌اکت) قبل از هر پینتی درستش می‌کنه.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const mounted = useRef(false);

  useEffect(() => {
    getThemeSetting().then((saved) => {
      if (saved === "light" || saved === "dark") setTheme(saved);
    });
  }, []);

  useEffect(() => {
    // اجرای اول رو کامل نادیده می‌گیریم — اسکریپتِ inline از قبل data-theme
    // درستو روی body گذاشته؛ اگه این‌جا بی‌قیدوشرط با stateِ اولیه‌ی "dark"
    // بنویسیم، دقیقاً همون چیزی که اسکریپت درست کرده بود (مثلاً "light") رو
    // برای یه لحظه (تا resolve شدنِ افکتِ بالا) بازنویسی می‌کنه.
    if (!mounted.current) { mounted.current = true; return; }
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
