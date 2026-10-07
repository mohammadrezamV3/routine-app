"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import "./wa-shell.css";

export type ChapterId =
  | "wk-ch-overview" | "wk-ch-matrix" | "wk-ch-trend" | "wk-ch-insights" | "wk-ch-coach" | "wk-ch-achievements";

export const CHAPTER_META: Record<ChapterId, { label: string }> = {
  "wk-ch-overview": { label: "خلاصه" },
  "wk-ch-matrix": { label: "نقشه" },
  "wk-ch-trend": { label: "روند" },
  "wk-ch-insights": { label: "بینش‌ها" },
  "wk-ch-coach": { label: "مربی" },
  "wk-ch-achievements": { label: "دستاوردها" },
};

/**
 * ناوبر فصل‌ها فقط روی موبایل/تبلت باریک: تب‌های افقی متنی با خط زیرین فعال
 * و scrollspy. روی دسکتاپ نمایش داده نمی‌شه (CSS). فقط فصل‌هایی که واقعا
 * در DOM هستن نشون داده می‌شن.
 */
export function WeeklyAnalysisChapters({ ids, resetKey }: { ids: ChapterId[]; resetKey?: string }) {
  const reduce = useReducedMotion();
  const [present, setPresent] = useState<ChapterId[]>([]);
  const [active, setActive] = useState<ChapterId | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const idsKey = ids.join("|");

  useEffect(() => {
    const check = () => setPresent((cur) => {
      const next = ids.filter((id) => !!document.getElementById(id));
      return cur.length === next.length && cur.every((c, i) => c === next[i]) ? cur : next;
    });
    check();
    const t1 = setTimeout(check, 350);
    const t2 = setTimeout(check, 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, resetKey]);

  // scrollspy: فصلی که از خط باریک نزدیک بالای صفحه رد می‌شه فعاله
  useEffect(() => {
    if (!present.length || typeof IntersectionObserver === "undefined") return;
    const hit = new Set<string>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) hit.add(e.target.id); else hit.delete(e.target.id);
      }
      const first = present.find((id) => hit.has(id));
      if (first) setActive(first);
    }, { rootMargin: "-30% 0px -62% 0px", threshold: 0 });
    for (const id of present) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [present]);

  const current = active && present.includes(active) ? active : present[0] ?? null;

  // تب فعال داخل ردیف بیاد (فقط خود ردیف اسکرول می‌شه، نه صفحه)
  useEffect(() => {
    const row = rowRef.current;
    const tab = current ? tabRefs.current.get(current) : null;
    if (!row || !tab || row.offsetParent === null) return;
    const rtl = getComputedStyle(row).direction === "rtl";
    const center = tab.offsetLeft + tab.offsetWidth / 2;
    const left = rtl ? center - row.clientWidth / 2 - (row.scrollWidth - row.clientWidth) : center - row.clientWidth / 2;
    row.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  }, [current, reduce]);

  const go = useCallback((id: ChapterId) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [reduce]);

  if (present.length < 2) return null;

  return (
    <LayoutGroup id="wa-chapters">
      <nav className="wa-tabs" aria-label="فصل‌های آنالیز" data-noswipe>
        <div className="wa-tabs-row" ref={rowRef}>
          {present.map((id) => {
            const on = id === current;
            return (
              <button
                key={id}
                type="button"
                ref={(el) => { if (el) tabRefs.current.set(id, el); else tabRefs.current.delete(id); }}
                className={`wk-ghost wa-tab${on ? " is-on" : ""}`}
                onClick={() => go(id)}
                aria-current={on ? "true" : undefined}
              >
                <span>{CHAPTER_META[id].label}</span>
                {on && <motion.i layoutId="wa-tab-line" className="wa-tab-line" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }} />}
              </button>
            );
          })}
        </div>
      </nav>
    </LayoutGroup>
  );
}
