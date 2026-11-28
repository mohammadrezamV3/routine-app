"use client";
import { useEffect, type RefObject } from "react";
import { acquireGlassFilter, type GlassIntensity } from "@/lib/glassFilterRegistry";

/** فقط ردیف full: فیلتر مشترک هم‌دسته‌ی اندازه رو روی خود عنصر می‌ذاره (--lg-filter + data-lg-ready).
 *  بدون ری‌رندر؛ resize با debounce. در ردیف دیگه هیچ کاری نمی‌کنه. */
export function useGlassFilter(ref: RefObject<HTMLElement | null>, active: boolean, radius: number, intensity: GlassIntensity = "subtle", scope?: string) {
  useEffect(() => {
    const el = ref.current;
    if (!active || !el || typeof ResizeObserver === "undefined") return;
    if (scope && !el.closest(scope)) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const apply = () => {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return;
      const id = acquireGlassFilter(Math.round(r.width), Math.round(r.height), radius, intensity);
      if (id) { el.style.setProperty("--lg-filter", `url(#${id})`); el.setAttribute("data-lg-ready", "1"); }
      else { el.style.removeProperty("--lg-filter"); el.removeAttribute("data-lg-ready"); }
    };
    apply();
    const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(apply, 160); });
    ro.observe(el);
    return () => { ro.disconnect(); clearTimeout(t); el.style.removeProperty("--lg-filter"); el.removeAttribute("data-lg-ready"); };
  }, [ref, active, radius, intensity]);
}
