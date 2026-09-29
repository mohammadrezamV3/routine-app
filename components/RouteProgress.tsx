"use client";

// ناوبریِ نرم بینِ صفحه‌ها: همون لحظه‌ی کلیک روی یک لینکِ داخلی، یک نوارِ
// پیشرفتِ باریک بالای صفحه راه می‌افته و صفحه‌ی فعلی کمی کم‌رنگ می‌شه (بازخوردِ
// فوری — قبلا تا رسیدنِ صفحه‌ی بعد هیچ اتفاقی نمی‌افتاد و «نمی‌ره» حس می‌شد).
// با عوض‌شدنِ مسیر نوار کامل می‌شه و محو می‌شه؛ ورودِ صفحه‌ی جدید با fade در
// app/template.tsx. نوار با border کشیده می‌شه، نه بک‌گراند.
//
// چرا روی click در فازِ capture: <Link>ِ نکست خودش preventDefault می‌کنه، پس در
// فازِ bubble نمی‌شه لینکِ واقعی رو از لینکی که کارِ دیگه‌ای می‌کنه تشخیص داد.
// هر حالتی که ناوبری انجام نشه، با سقفِ زمانی خودش جمع می‌شه (گیر نمی‌کنه).

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Phase = "idle" | "loading" | "done";

export function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [phase, setPhase] = useState<Phase>("idle");
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  function finish() {
    if (safety.current) clearTimeout(safety.current);
    document.documentElement.removeAttribute("data-route-loading");
    setPhase((p) => (p === "loading" ? "done" : p));
    if (hide.current) clearTimeout(hide.current);
    hide.current = setTimeout(() => setPhase("idle"), 450);
  }

  // مسیر (یا کوئری) عوض شد → ناوبری تموم شد
  const routeKey = `${pathname}?${search?.toString() ?? ""}`;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.hasAttribute("download")) return;
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
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start() {
    if (hide.current) clearTimeout(hide.current);
    if (safety.current) clearTimeout(safety.current);
    setPhase("loading");
    document.documentElement.setAttribute("data-route-loading", "");
    safety.current = setTimeout(finish, 8_000);
    // اگه کلیک در واقع ناوبری نکرد (مثلا لینکی که پاپ‌آپ باز می‌کنه) و کاربر دوباره
    // با صفحه کار کرد، حالتِ «در حالِ رفتن» فورا جمع می‌شه — صفحه کم‌رنگ نمی‌مونه.
    const armedAt = Date.now();
    const cancel = () => {
      if (Date.now() - armedAt < 350) return;
      window.removeEventListener("pointerdown", cancel, true);
      window.removeEventListener("keydown", cancel, true);
      if (document.documentElement.hasAttribute("data-route-loading")) finish();
    };
    window.addEventListener("pointerdown", cancel, true);
    window.addEventListener("keydown", cancel, true);
  }

  useEffect(() => () => {
    if (safety.current) clearTimeout(safety.current);
    if (hide.current) clearTimeout(hide.current);
  }, []);

  if (phase === "idle") return null;
  return <span className={`route-progress is-${phase}`} aria-hidden="true" />;
}
