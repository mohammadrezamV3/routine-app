"use client";

// ناوبری نرم بین صفحه‌ها: همون لحظه‌ی کلیک روی یک لینک داخلی، یک نوار
// پیشرفت باریک بالای صفحه راه می‌افته (بازخورد فوری و غیرمسدودکننده). هیچ
// اسپلش یا پرده‌ی تمام‌صفحه‌ای برای ناوبری نیست؛ اسپلش فقط لود کامل اوله.
// با عوض‌شدن مسیر نوار کامل می‌شه و محو می‌شه؛ ورود صفحه‌ی جدید با fade در
// app/template.tsx. نوار با border کشیده می‌شه، نه بک‌گراند.
//
// چرا روی click در فاز capture: <Link> نکست خودش preventDefault می‌کنه، پس در
// فاز bubble نمی‌شه لینک واقعی رو از لینکی که کار دیگه‌ای می‌کنه تشخیص داد.
// هر حالتی که ناوبری انجام نشه (پاپ‌آپ، دکمه‌ی داخل لینک، …) یا با تعامل بعدی
// کاربر یا با سقف زمانی خودش جمع می‌شه — صفحه هیچ‌وقت کم‌رنگ نمی‌مونه.
//
// کلاس‌ها عمدا rpg-* ان: کلاس سراسری .is-loading (globals.css) یک اسپینر ::before
// اضافه می‌کنه که روی نوار می‌نشست، و .rp-done هم از قبل برای یک فهرست دیگه هست.

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isEn } from "@/lib/i18n";

type Phase = "idle" | "loading" | "done";
const ATTR = "data-route-loading";

export function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [phase, setPhase] = useState<Phase>("idle");
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  // تنها لیسنر «کاربر دوباره تعامل کرد» — همیشه قبل از ثبت بعدی برداشته می‌شه
  const cancelRef = useRef<((e: Event) => void) | null>(null);

  function dropCancel() {
    if (!cancelRef.current) return;
    window.removeEventListener("pointerdown", cancelRef.current, true);
    window.removeEventListener("keydown", cancelRef.current, true);
    cancelRef.current = null;
  }

  function finish() {
    if (safety.current) clearTimeout(safety.current);
    dropCancel();
    document.documentElement.removeAttribute(ATTR);
    setPhase((p) => (p === "loading" ? "done" : p));
    if (hide.current) clearTimeout(hide.current);
    hide.current = setTimeout(() => setPhase("idle"), 450);
  }

  function start() {
    if (hide.current) clearTimeout(hide.current);
    if (safety.current) clearTimeout(safety.current);
    dropCancel();
    setPhase("loading");
    const html = document.documentElement;
    html.setAttribute(ATTR, "");
    // از این به بعد صفحه‌های تازه با fade وارد می‌شن (نه لود کامل اول — LCP)
    html.setAttribute("data-navigated", "");
    safety.current = setTimeout(finish, 8_000);
    const armedAt = Date.now();
    const cancel = () => {
      if (Date.now() - armedAt < 350) return;
      if (document.documentElement.hasAttribute(ATTR)) finish();
      else dropCancel();
    };
    cancelRef.current = cancel;
    window.addEventListener("pointerdown", cancel, true);
    window.addEventListener("keydown", cancel, true);
  }

  // مسیر (یا کوئری) عوض شد → ناوبری تموم شد
  const routeKey = `${pathname}?${search?.toString() ?? ""}`;
  const first = useRef(true);
  const lastKey = useRef(routeKey);
  useEffect(() => {
    lastKey.current = routeKey;
    if (first.current) { first.current = false; return; }
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const t = e.target as Element | null;
      const a = t?.closest?.("a");
      if (!a || a.hasAttribute("download")) return;
      // دکمه/فیلد داخل یک لینک (مثلا سطل‌زباله‌ی کارت رودمپ) ناوبری نمی‌کنه
      const ctl = t?.closest?.("button,[role=button],input,select,textarea,label");
      if (ctl && ctl !== a && a.contains(ctl)) return;
      const target = a.getAttribute("target");
      if (target && target !== "_self") return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let url: URL;
      try { url = new URL(a.href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }
    // برگشت از bfcache: صفحه با همون حالت «در حال رفتن» ذخیره شده بود
    function onShow(e: PageTransitionEvent) {
      if (e.persisted) finish();
    }
    // دکمه‌ی برگشت/جلوی مرورگر هم ناوبریه؛ با عوض‌شدن مسیر مثل کلیک تموم می‌شه
    // روتر ممکنه مسیر جدید رو *قبل* از این لیسنر رندر کرده باشه (ناوبری از کش)؛ اون
    // وقت پایان ناوبری قبل از شروعش ثبت شده و باید همین‌جا تمومش کرد، وگرنه اسپلش می‌مونه.
    function onPop() {
      start();
      setTimeout(() => {
        const cur = `${window.location.pathname}?${window.location.search.replace(/^\?/, "")}`;
        if (lastKey.current === cur) finish();
      }, 60);
    }
    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", onShow);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", onShow);
      dropCancel();
      if (safety.current) clearTimeout(safety.current);
      if (hide.current) clearTimeout(hide.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "idle") return null;
  // نوار از سمت شروع صفحه رشد می‌کنه (راست در فارسی، چپ در انگلیسی)
  return <span className={`route-progress rpg-${phase}`} style={isEn() ? { transformOrigin: "left" } : undefined} aria-hidden="true" />;
}
