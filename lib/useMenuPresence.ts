"use client";

import { useEffect, useState } from "react";

// حرکت مشترک منوها و پاپ‌اورها (کلاس .mm-menu در app/globals.css، بلاک
// «حرکت مشترک منوها»). ورود با CSS خودش اجرا می‌شه؛ این هوک فقط برای *خروج*ه:
// بعد از بسته‌شدن منو رو چند ده میلی‌ثانیه نگه می‌داره تا انیمیشن خروج پخش بشه
// و بعد برمی‌داره. در این مدت data-state="closed" می‌گیره و CSS روش
// pointer-events:none می‌ذاره، پس هیچ‌وقت جلوی کلیک رو نمی‌گیره.
//
// استفاده:
//   const { present, state } = useMenuPresence(open);
//   {present && <div className="mm-menu ..." data-state={state}>…</div>}
export const MENU_EXIT_MS = 120;

function exitDisabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  } catch { /* بدون matchMedia */ }
  return false;
}

export function useMenuPresence(open: boolean, exitMs: number = MENU_EXIT_MS) {
  const [kept, setKept] = useState(open);
  useEffect(() => {
    if (open) { setKept(true); return; }
    if (!kept) return;
    // حرکت‌کاهی: بدون خروج، همون لحظه برداشته می‌شه
    if (exitDisabled() || exitMs <= 0) { setKept(false); return; }
    const t = setTimeout(() => setKept(false), exitMs);
    return () => clearTimeout(t);
  }, [open, kept, exitMs]);
  return { present: open || kept, state: open ? ("open" as const) : ("closed" as const) };
}
