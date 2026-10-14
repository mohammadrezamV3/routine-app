"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * کمک‌کار کوچک سیستم حرکت (app/motion.css). هیچ حلقه‌ی فریمی نداره؛ فقط:
 *  1) بعد از load، عناصر تازه‌واردشده‌ی «بخش صفحه» (اسکلت -> محتوا، رسیدن داده)
 *     رو با data-m-in علامت می‌زنه تا CSS ورودشون رو نرم کنه. HTML سروری و
 *     رندر اول هیچ‌وقت علامت نمی‌خورن (LCP و اولین پینت دست‌نخورده).
 *  2) روی صفحه‌های عمومی بلند، بخش‌های زیر صفحه رو .m-reveal می‌کنه: مرورگری که
 *     animation-timeline:view() داره همه‌چیز رو CSS انجام می‌ده، بقیه با یک
 *     IntersectionObserver (m-pre -> m-seen). بدون JS محتوا همیشه دیده می‌شه.
 * با reduced-motion و دستگاه ضعیف هیچ‌کاری نمی‌کنه.
 */

// بخش‌هایی که بعد از لود وارد DOM می‌شن و باید نرم بیان
const IN_SEL = [".page-enter > *", ".module-gate", "[role='alert']", ".form-inline-error", ".form-error"].join(",");

// بدنه‌ی بازشده‌ی یک دکمه‌ی aria-expanded (آکاردئون/«بیشتر»/لیست باز): مستقیم بعد از دکمه یا با aria-controls
function isExpandedBody(n: HTMLElement) {
  const prev = n.previousElementSibling;
  if (prev && (prev.getAttribute("aria-expanded") === "true" || prev.classList.contains("auth-tabs"))) return true; // auth-tabs = SegmentedTabs: محتوای تب تازه
  if (!n.id) return false;
  try { return !!document.querySelector(`[aria-controls="${CSS.escape(n.id)}"][aria-expanded="true"]`); } catch { return false; }
}

// صفحه‌های عمومی/محتوایی که ظاهرشدن با اسکرول می‌گیرن
const REVEAL_PATHS = ["/faq", "/blog", "/tools", "/terms", "/habit-tracker", "/daily-planner", "/trading-journal", "/ai-planner",
  "/bodybuilding-program", "/calorie-counter", "/economic-calendar", "/forex-sessions", "/learning-roadmap", "/mentor-programs", "/mentorship"];
const REVEAL_SEL = ".page-enter main > section, .page-enter main > article, .blog-grid > *";

function wantsReveal(path: string) {
  return REVEAL_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

export function MotionRuntime() {
  const pathname = usePathname();

  // 1) ورود عناصر پس از هیدریشن
  useEffect(() => {
    const root = document.documentElement;
    if (typeof MutationObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || root.hasAttribute("data-perf-weak")) return;
    let mo: MutationObserver | null = null;
    const start = () => {
      let budget = 0;
      mo = new MutationObserver((records) => {
        if (root.hasAttribute("data-logging-out") || document.visibilityState === "hidden") return;
        for (const rec of records) {
          for (const n of Array.from(rec.addedNodes)) {
            if (!(n instanceof HTMLElement) || n.hasAttribute("data-m-in") || n.hasAttribute("data-popup-ghost")) continue;
            if (!(n.matches(IN_SEL) || isExpandedBody(n)) || n.closest("[data-m-skip], [data-popup-ghost]")) continue;
            // حداکثر چند عنصر در هر فریم؛ جلوگیری از هزینه‌ی دسته‌ای
            if (++budget > 24) continue;
            // اگه خودش انیمیشن داره (framer/CSS) دخالت نکن
            if (getComputedStyle(n).animationName !== "none") continue;
            const idx = Math.min(Array.prototype.indexOf.call(rec.target.children, n), 6);
            if (idx > 0) n.style.setProperty("--i", String(idx));
            n.setAttribute("data-m-in", "rise");
            n.addEventListener("animationend", () => { n.removeAttribute("data-m-in"); n.style.removeProperty("--i"); }, { once: true });
          }
        }
        requestAnimationFrame(() => { budget = 0; });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => { mo?.disconnect(); window.removeEventListener("load", start); };
  }, []);

  // 2) ظاهرشدن با اسکرول در صفحه‌های عمومی
  useEffect(() => {
    if (!wantsReveal(pathname || "")) return;
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || root.hasAttribute("data-perf-weak")) return;
    let io: IntersectionObserver | null = null;
    const nativeTimeline = typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: view()");
    const t = window.setTimeout(() => {
      const vh = window.innerHeight;
      const items = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SEL)).filter((el) => el.getBoundingClientRect().top > vh * 0.95);
      if (!items.length) return;
      if (nativeTimeline) { items.forEach((el) => el.classList.add("m-reveal")); return; }
      if (typeof IntersectionObserver === "undefined") return;
      io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).classList.add("m-seen");
          io?.unobserve(e.target);
        }
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });
      for (const el of items) { el.classList.add("m-reveal", "m-pre"); io.observe(el); }
    }, 350);
    return () => {
      window.clearTimeout(t);
      io?.disconnect();
      document.querySelectorAll(".m-pre:not(.m-seen)").forEach((el) => el.classList.remove("m-pre"));
    };
  }, [pathname]);

  return null;
}
