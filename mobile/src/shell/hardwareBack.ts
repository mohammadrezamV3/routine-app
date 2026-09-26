// دکمه‌ی برگشتِ هاردویرِ اندروید، به ترتیب:
//   ۱) لایه‌ی ثبت‌شده‌ی شل (منوی تب‌بار) ← بستن
//   ۲) مودالِ باز در کدِ وب (قفلِ اسکرولِ body = lib/useLockBodyScroll) ←
//      Escape، و اگه نبست، کلیک روی بک‌دراپِ تمام‌صفحه‌ی بالایی (همون رفتارِ
//      «کلیک بیرون = بستن» که همه‌ی مودال‌های وب دارن)
//   ۳) ریشه‌ی تب‌ها ← خروج از اپ؛ وگرنه history.back
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { popBackHandler } from "./backStack";

const ROOT_PATHS = new Set(["/", "/weekly", "/exercise", "/trade", "/account", "/auth/login"]);

export function isRootPath(pathname: string): boolean {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return ROOT_PATHS.has(p || "/");
}

export function bodyScrollLocked(): boolean {
  return document.body.style.overflow === "hidden";
}

/** بالاترین عنصرِ fixedِ تقریبا تمام‌صفحه (بک‌دراپِ مودال) در چند نقطه‌ی حاشیه */
export function findTopBackdrop(): HTMLElement | null {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const points: [number, number][] = [
    [4, h / 2],
    [w - 4, h / 2],
    [w / 2, 6],
    [4, 6],
  ];
  for (const [x, y] of points) {
    let el = document.elementFromPoint(x, y) as HTMLElement | null;
    while (el && el !== document.body) {
      const cs = getComputedStyle(el);
      if (cs.position === "fixed") {
        const r = el.getBoundingClientRect();
        if (r.width >= w * 0.9 && r.height >= h * 0.9) return el;
      }
      el = el.parentElement;
    }
  }
  return null;
}

function dispatchEscape(): void {
  const ev = { key: "Escape", code: "Escape", keyCode: 27, bubbles: true, cancelable: true } as KeyboardEventInit;
  (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", ev));
  window.dispatchEvent(new KeyboardEvent("keydown", ev));
}

/** true اگه یک لایه بسته شد (یا تلاش شد) و نباید ناوبری کرد */
export async function closeTopLayer(): Promise<boolean> {
  if (popBackHandler()) return true;
  if (!bodyScrollLocked()) return false;
  dispatchEscape();
  await new Promise((r) => setTimeout(r, 60));
  if (!bodyScrollLocked()) return true;
  const backdrop = findTopBackdrop();
  if (backdrop) {
    backdrop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    backdrop.click();
    return true;
  }
  return false;
}

export function useHardwareBack(): void {
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: { remove: () => void } | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const h = await App.addListener("backButton", async () => {
          if (await closeTopLayer()) return;
          if (isRootPath(pathRef.current) || window.history.length <= 1) App.exitApp();
          else navigate(-1);
        });
        if (cancelled) h.remove();
        else handle = h;
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, [navigate]);
}
