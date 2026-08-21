"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getThemeSetting, setThemeSetting } from "@/lib/storage";
import { applyThemeAttribute, syncThemeColorMeta, readThemeFromDom } from "@/lib/themeColor";

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
  // آخرین مقداری که *واقعاً* ذخیره شده (چه از سرور خونده شده، چه خودمون
  // نوشتیمش). افکتِ پایین فقط وقتی می‌نویسه که تمِ فعلی با این فرق داشته
  // باشه — بدونِ این، بعد از خوندنِ تمِ ذخیره‌شده همون مقدار دوباره نوشته
  // می‌شد، یعنی یک نوشتنِ دیتابیس اضافه به‌ازای *هر* بازدیدِ *هر* صفحه.
  //
  // این‌جا عمداً یه فلگِ یک‌بارمصرف («تازه لود شد») استفاده نشده: اگه مقدارِ
  // ذخیره‌شده با stateِ فعلی یکی باشه، setTheme اصلاً رندرِ جدیدی نمی‌سازه،
  // پس افکت اجرا نمی‌شه و اون فلگ گیر می‌کنه — و *تغییرِ بعدیِ خودِ کاربر*
  // رو بی‌صدا می‌بلعه (تمِ عوض‌شده بعد از ریلود برمی‌گشت به قبلی).
  const persisted = useRef<Theme | null>(null);
  // اگه کاربر قبل از رسیدنِ مقدارِ ذخیره‌شده خودش تم رو عوض کرده باشه، اون
  // مقدارِ ذخیره‌شده دیگه نباید انتخابش رو پس بزنه.
  const userChose = useRef(false);

  useEffect(() => {
    getThemeSetting().then((saved) => {
      if (saved !== "light" && saved !== "dark") return;
      persisted.current = saved;
      // اگه کاربر قبل از رسیدنِ این مقدار خودش تم رو عوض کرده، انتخابش
      // نباید پس زده بشه (ولی persisted بالا بازم درست ست شده، تا انتخابِ
      // کاربر در افکتِ بعدی واقعاً نوشته بشه).
      if (!userChose.current) setTheme(saved);
    });
  }, []);

  useEffect(() => {
    // اجرای اول رو کامل نادیده می‌گیریم — اسکریپتِ inline از قبل data-theme
    // درستو روی body گذاشته؛ اگه این‌جا بی‌قیدوشرط با stateِ اولیه‌ی "dark"
    // بنویسیم، دقیقاً همون چیزی که اسکریپت درست کرده بود (مثلاً "light") رو
    // برای یه لحظه (تا resolve شدنِ افکتِ بالا) بازنویسی می‌کنه.
    // اجرای اول یه حالتِ خاصه: stateِ ری‌اکت هنوز مقدارِ اولیه‌ی "dark"ـه
    // (که عمداً با چیزی که سرور رندر کرده یکیه)، ولی اسکریپتِ inline از قبل
    // تمِ *واقعی* رو از روی کوکی روی DOM گذاشته. پس این‌جا نباید stateِ ری‌اکت
    // رو روی DOM بنویسیم — برعکس، باید همون چیزی که روی DOMه رو مرجع بگیریم.
    // (نسخه‌ی اولِ این فیکس همین رو رعایت نکرد و تمِ روشن رو موقعِ لود به
    // تاریک برمی‌گردوند.)
    if (!mounted.current) {
      mounted.current = true;
      // متا حتی در اجرای اول هم هم‌گام می‌شه — اگه چیزی بعدِ هیدریت یه متای
      // دومِ بیات تزریق کرده باشه، syncThemeColorMeta همین‌جا پاکش می‌کنه.
      syncThemeColorMeta(readThemeFromDom());
      return;
    }

    applyThemeAttribute(theme);
    syncThemeColorMeta(theme);
    // فقط وقتی می‌نویسیم که با چیزی که واقعاً ذخیره‌ست فرق داشته باشه
    if (persisted.current !== theme) {
      persisted.current = theme;
      setThemeSetting(theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggle: () => {
          userChose.current = true;
          setTheme((t) => (t === "light" ? "dark" : "light"));
        },
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
