"use client";

import "./liquid-glass.css";
import { createElement, forwardRef, useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { DEFAULT_GLASS_TIER, capGlassTier, readGlassCaps, selectGlassTier, type GlassTier } from "@/lib/liquidGlassTier";
import type { GlassIntensity } from "@/lib/glassFilterRegistry";
import { useGlassFilter } from "@/lib/useGlassFilter";

// شیشه‌ی مایع (سبک iOS 26) بدون وابستگی — فقط وقتی صریحا استفاده بشه؛ هیچ‌جای اپ
// خودکار این رو نمی‌گیره. سه ردیف (lib/liquidGlassTier.ts) یک بار روی کلاینت انتخاب می‌شه
// و سمت سرور همیشه static است (هیدریشن بدون اختلاف).
//   full  : فیلتر SVG (feDisplacementMap + لبه‌ی رنگین) داخل backdrop-filter، فقط کرومیوم قوی
//   lite  : blur + saturate + گرادیان لبه
//   static: بدون بلور
// نقشه‌ی جابه‌جایی برای هر نمونه به اندازه‌ی خودش یک بار روی کنواس ساخته و (با debounce) فقط
// وقتی اندازه عوض شد بازسازی می‌شه. هایلایت دنبال‌کننده‌ی موس فقط transform/opacity است.

export type { GlassIntensity };

let cachedTier: GlassTier | null = null;
const listeners = new Set<() => void>();
const DEMOTE_KEY = "arion:glassDemoted";
function getTier(): GlassTier {
  if (cachedTier === null) {
    try {
      cachedTier = selectGlassTier(readGlassCaps());
      // نگهبان عملکرد: اگه این دستگاه قبلا زیر full قفل کرد، مستقیم lite شروع می‌کنه
      if (cachedTier === "full" && localStorage.getItem(DEMOTE_KEY) === "1") cachedTier = "lite";
    } catch { cachedTier = "lite"; }
  }
  return cachedTier;
}
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
/** نگهبان عملکرد: ردیف full رو (برای همیشه روی این دستگاه) به lite می‌بره و همه‌ی شیشه‌ها رو تازه می‌کنه */
export function demoteGlassTier(): void {
  if (getTier() !== "full") return;
  cachedTier = "lite";
  try { localStorage.setItem(DEMOTE_KEY, "1"); } catch {}
  listeners.forEach((l) => l());
}
/** ردیف انتخاب‌شده‌ی این دستگاه (سرور: static). */
export function useGlassTier(maxTier?: GlassTier): GlassTier {
  return capGlassTier(useSyncExternalStore(subscribe, getTier, () => DEFAULT_GLASS_TIER), maxTier);
}

type Props = {
  as?: React.ElementType;
  radius?: number;
  intensity?: GlassIntensity;
  /** هایلایت دنبال‌کننده‌ی موس (فقط ردیف full و دستگاه با هاور واقعی) */
  interactive?: boolean;
  /** سقف ردیف این عنصر (مثلا "lite" برای کارت‌های پرتعداد)؛ دستگاه ضعیف‌تر همون ردیف خودش رو نگه می‌داره */
  maxTier?: GlassTier;
  /** فقط برای پیش‌نمایش ادمین */
  forceTier?: GlassTier;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
} & Omit<React.AllHTMLAttributes<HTMLElement>, "className" | "style" | "children" | "as">;

export const LiquidGlass = forwardRef<HTMLElement, Props>(function LiquidGlass(
  { as = "div", radius = 20, intensity = "normal", interactive = false, maxTier, forceTier, className, style, children, ...rest },
  ref,
) {
  const auto = useGlassTier();
  const tier = capGlassTier(forceTier ?? auto, maxTier);
  const elRef = useRef<HTMLElement | null>(null);
  const specRef = useRef<HTMLSpanElement | null>(null);

  const setRefs = useCallback((node: HTMLElement | null) => {
    elRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node;
  }, [ref]);

  // فیلتر مشترک هم‌دسته‌ی اندازه (lib/glassFilterRegistry.ts): دیگه فیلتر/نقشه‌ی جدا برای هر نمونه نیست
  useGlassFilter(elRef, tier === "full", radius, intensity);

  // هایلایت دنبال‌کننده‌ی موس: rAF-throttled، فقط CSS var (--lg-x/--lg-y) → transform
  useEffect(() => {
    if (tier !== "full" || !interactive || !elRef.current) return;
    if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;
    const el = elRef.current;
    let raf = 0, px = 0, py = 0;
    const flush = () => { raf = 0; el.style.setProperty("--lg-x", px + "px"); el.style.setProperty("--lg-y", py + "px"); };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = e.clientX - r.left; py = e.clientY - r.top;
      if (!raf) raf = requestAnimationFrame(flush);
    };
    el.addEventListener("pointermove", move, { passive: true });
    return () => { el.removeEventListener("pointermove", move); if (raf) cancelAnimationFrame(raf); };
  }, [tier, interactive]);

  const st = { ...style, borderRadius: radius, ["--lg-r" as string]: radius + "px" } as React.CSSProperties;

  return createElement(
    as,
    {
      ...rest,
      ref: setRefs,
      className: `lg lg-${tier} lg-${intensity}${interactive ? " lg-int" : ""}${className ? " " + className : ""}`,
      "data-lg-tier": tier,
      style: st,
    },
    tier === "full" && interactive ? <span ref={specRef} className="lg-spec" aria-hidden="true" /> : null,
    children,
  );
});
