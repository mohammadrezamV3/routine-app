"use client";

import "./liquid-glass.css";
import { createElement, forwardRef, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_GLASS_TIER, readGlassCaps, selectGlassTier, type GlassTier } from "@/lib/liquidGlassTier";
import { buildGlassMap } from "@/lib/liquidGlassMap";

// شیشه‌ی مایع (سبک iOS 26) بدون وابستگی — فقط وقتی صریحا استفاده بشه؛ هیچ‌جای اپ
// خودکار این رو نمی‌گیره. سه ردیف (lib/liquidGlassTier.ts) یک بار روی کلاینت انتخاب می‌شه
// و سمت سرور همیشه static است (هیدریشن بدون اختلاف).
//   full  : فیلتر SVG (feDisplacementMap + لبه‌ی رنگین) داخل backdrop-filter، فقط کرومیوم قوی
//   lite  : blur + saturate + گرادیان لبه
//   static: بدون بلور
// نقشه‌ی جابه‌جایی برای هر نمونه به اندازه‌ی خودش یک بار روی کنواس ساخته و (با debounce) فقط
// وقتی اندازه عوض شد بازسازی می‌شه. هایلایت دنبال‌کننده‌ی موس فقط transform/opacity است.

export type GlassIntensity = "subtle" | "normal" | "strong";

let cachedTier: GlassTier | null = null;
function getTier(): GlassTier {
  if (cachedTier === null) { try { cachedTier = selectGlassTier(readGlassCaps()); } catch { cachedTier = "lite"; } }
  return cachedTier;
}
const subscribe = () => () => {};
/** ردیف انتخاب‌شده‌ی این دستگاه (سرور: static). */
export function useGlassTier(): GlassTier {
  return useSyncExternalStore(subscribe, getTier, () => DEFAULT_GLASS_TIER);
}

const DISPLACE: Record<GlassIntensity, number> = { subtle: 10, normal: 18, strong: 28 };
const mapCache = new Map<string, string>();

function mapUrl(w: number, h: number, radius: number, bezel: number): string {
  const key = `${w}x${h}r${radius}b${bezel}`;
  const hit = mapCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(w, h);
  img.data.set(buildGlassMap({ w, h, radius, bezel }));
  ctx.putImageData(img, 0, 0);
  const url = c.toDataURL("image/png");
  if (mapCache.size > 24) mapCache.clear();
  mapCache.set(key, url);
  return url;
}

type Props = {
  as?: React.ElementType;
  radius?: number;
  intensity?: GlassIntensity;
  /** هایلایت دنبال‌کننده‌ی موس (فقط ردیف full و دستگاه با هاور واقعی) */
  interactive?: boolean;
  /** فقط برای پیش‌نمایش ادمین */
  forceTier?: GlassTier;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
} & Omit<React.AllHTMLAttributes<HTMLElement>, "className" | "style" | "children" | "as">;

export const LiquidGlass = forwardRef<HTMLElement, Props>(function LiquidGlass(
  { as = "div", radius = 20, intensity = "normal", interactive = false, forceTier, className, style, children, ...rest },
  ref,
) {
  const auto = useGlassTier();
  const tier = forceTier ?? auto;
  const elRef = useRef<HTMLElement | null>(null);
  const specRef = useRef<HTMLSpanElement | null>(null);
  const filterId = "lg" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const setRefs = useCallback((node: HTMLElement | null) => {
    elRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node;
  }, [ref]);

  // اندازه فقط برای ردیف full (نقشه‌ی هم‌اندازه‌ی عنصر)
  useEffect(() => {
    if (tier !== "full" || !elRef.current || typeof ResizeObserver === "undefined") return;
    const el = elRef.current;
    let t: ReturnType<typeof setTimeout> | undefined;
    const apply = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      if (w > 4 && h > 4) setDims((d) => (d && d.w === w && d.h === h ? d : { w, h }));
    };
    apply();
    const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(apply, 120); });
    ro.observe(el);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [tier]);

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

  const minDim = dims ? Math.min(dims.w, dims.h) : 0;
  const bezel = Math.max(6, Math.min(Math.round(minDim * 0.45), 14 + DISPLACE[intensity]));
  const scale = Math.min(DISPLACE[intensity], minDim * 0.6);
  const ready = tier === "full" && !!dims;
  const url = ready && dims ? mapUrl(dims.w, dims.h, Math.min(radius, minDim / 2), bezel) : "";
  const full = ready && !!url;

  const st = { ...style, borderRadius: radius, ["--lg-r" as string]: radius + "px" } as React.CSSProperties;
  if (full) (st as Record<string, string>)["--lg-filter"] = `url(#${filterId})`;

  return createElement(
    as,
    {
      ...rest,
      ref: setRefs,
      className: `lg lg-${tier} lg-${intensity}${full ? " lg-ready" : ""}${interactive ? " lg-int" : ""}${className ? " " + className : ""}`,
      "data-lg-tier": tier,
      style: st,
    },
    full && dims ? (
      <svg className="lg-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <filter id={filterId} filterUnits="userSpaceOnUse" x="0" y="0" width={dims.w} height={dims.h} colorInterpolationFilters="sRGB">
          <feImage href={url} x="0" y="0" width={dims.w} height={dims.h} preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" result="dr" />
          <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={scale * 0.9} xChannelSelector="R" yChannelSelector="G" result="dg" />
          <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={scale * 0.8} xChannelSelector="R" yChannelSelector="G" result="db" />
          <feColorMatrix in="db" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feComposite in="r" in2="g" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rg" />
          <feComposite in="rg" in2="b" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
        </filter>
      </svg>
    ) : null,
    tier === "full" && interactive ? <span ref={specRef} className="lg-spec" aria-hidden="true" /> : null,
    children,
  );
});
