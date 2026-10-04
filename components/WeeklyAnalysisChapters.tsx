"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Activity, Award, Gauge, LayoutGrid, Lightbulb, Moon, Target, type LucideIcon } from "lucide-react";
import "./wa-shell.css";

export type ChapterId =
  | "wk-ch-overview" | "wk-ch-domains" | "wk-ch-patterns" | "wk-ch-insights"
  | "wk-ch-achievements" | "wk-ch-plan" | "wk-ch-sleep";

export const CHAPTER_META: Record<ChapterId, { label: string; icon: LucideIcon }> = {
  "wk-ch-overview": { label: "نمای کلی", icon: Gauge },
  "wk-ch-domains": { label: "بخش‌ها", icon: LayoutGrid },
  "wk-ch-patterns": { label: "الگوها", icon: Activity },
  "wk-ch-insights": { label: "بینش‌ها", icon: Lightbulb },
  "wk-ch-achievements": { label: "دستاوردها", icon: Award },
  "wk-ch-plan": { label: "هفته‌ی بعد", icon: Target },
  "wk-ch-sleep": { label: "خواب", icon: Moon },
};

/**
 * ناوبر فصل‌های صفحه با scrollspy. دسکتاپ عریض (از 1200px): ریل عمودی ثابت
 * در لبه‌ی چپ (نقطه‌ها، برچسب با هاور)؛ باریک‌تر: ردیف چیپ افقی چسبیده زیر
 * ناوبر هفته. فقط فصل‌هایی که واقعا در صفحه هستن نشون داده می‌شن (فصل خواب
 * بعد از mount ساخته می‌شه، پس وجودش از DOM چک می‌شه).
 * باید بیرون از کانتینر دارای transform رندر بشه تا position:fixed کار کنه.
 */
export function WeeklyAnalysisChapters({ ids, resetKey }: { ids: ChapterId[]; resetKey?: string }) {
  const reduce = useReducedMotion();
  const [present, setPresent] = useState<ChapterId[]>([]);
  const [active, setActive] = useState<ChapterId | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const idsKey = ids.join("|");

  // فقط فصل‌هایی که عنصرشون در DOM هست (فصل خواب دیرتر میاد)
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

  // scrollspy: فصلی که از خط باریک نزدیک وسط دید رد می‌شه فعاله
  useEffect(() => {
    if (!present.length || typeof IntersectionObserver === "undefined") return;
    const hit = new Set<string>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) hit.add(e.target.id); else hit.delete(e.target.id);
      }
      const first = present.find((id) => hit.has(id));
      if (first) setActive(first);
    }, { rootMargin: "-42% 0px -52% 0px", threshold: 0 });
    for (const id of present) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [present]);

  const current = active && present.includes(active) ? active : present[0] ?? null;

  // چیپ فعال وسط ردیف افقی بیاد (فقط خود ردیف اسکرول می‌شه، نه صفحه)
  useEffect(() => {
    const row = rowRef.current;
    const chip = current ? chipRefs.current.get(current) : null;
    if (!row || !chip || row.offsetParent === null) return;
    const rtl = getComputedStyle(row).direction === "rtl";
    const center = chip.offsetLeft + chip.offsetWidth / 2;
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
      <nav className="wa-chips" aria-label="فصل‌های آنالیز" data-noswipe>
        <div className="wa-chips-row" ref={rowRef}>
          {present.map((id) => {
            const m = CHAPTER_META[id];
            const Icon = m.icon;
            const on = id === current;
            return (
              <button
                key={id}
                type="button"
                ref={(el) => { if (el) chipRefs.current.set(id, el); else chipRefs.current.delete(id); }}
                className={`wk-ghost wa-chip${on ? " is-on" : ""}`}
                onClick={() => go(id)}
                aria-current={on ? "true" : undefined}
              >
                <Icon size={14} aria-hidden="true" />
                <span>{m.label}</span>
                {on && <motion.i layoutId="wa-chip-line" className="wa-chip-line" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }} />}
              </button>
            );
          })}
        </div>
      </nav>

      <nav className="wa-rail" aria-label="فصل‌های آنالیز" data-noswipe>
        {present.map((id) => {
          const m = CHAPTER_META[id];
          const on = id === current;
          return (
            <button
              key={id}
              type="button"
              className={`wk-ghost wa-rail-item${on ? " is-on" : ""}`}
              onClick={() => go(id)}
              aria-current={on ? "true" : undefined}
              aria-label={m.label}
            >
              <span className="wa-rail-dot">
                {on && <motion.i layoutId="wa-rail-active" className="wa-rail-active" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }} />}
              </span>
              <span className="wa-rail-label">{m.label}</span>
            </button>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
