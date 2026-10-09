"use client";

// فهرست چسبان فصل‌ها: لینک‌های لنگر (نه کنترل انتخاب) با scroll-spy. یک ردیف،
// روی موبایل افقی اسکرول می‌شه و چیپ فعال خودکار وسط میاد.
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { tr } from "@/lib/i18n";

export type TocItem = { id: string; label: string };

export function WeeklyLetterToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");
  const rowRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const idsKey = items.map((i) => i.id).join("|");

  // scroll-spy: فصلی فعاله که بالای 40٪ صفحه رسیده باشه
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = items.find((i) => visible.has(i.id));
        if (first) setActive(first.id);
        else if (window.scrollY < 260) setActive(items[0].id); // بالای صفحه، قبل از اولین فصل
      },
      { rootMargin: "-130px 0px -55% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  // چیپ فعال رو داخل ردیف وسط می‌آره (بدون اسکرول عمودی صفحه)
  useEffect(() => {
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!row || !chip) return;
    const rr = row.getBoundingClientRect();
    const cr = chip.getBoundingClientRect();
    const delta = cr.left + cr.width / 2 - (rr.left + rr.width / 2);
    if (Math.abs(delta) > 4) row.scrollBy({ left: delta, behavior: reduce ? "auto" : "smooth" });
  }, [active, reduce]);

  const go = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [reduce]);

  if (items.length < 2) return null;
  return (
    <nav className="wl-toc" aria-label={tr("فصل‌های آنالیز هفتگی", "Weekly review chapters")}>
      <div className="wl-toc-row" ref={rowRef}>
        {items.map((it, i) => (
          <a
            key={it.id}
            href={`#${it.id}`}
            data-id={it.id}
            className={`wl-toc-chip${active === it.id ? " is-active" : ""}`}
            aria-current={active === it.id ? "location" : undefined}
            onClick={(e) => go(e, it.id)}
          >
            <i>{String(i + 1).padStart(2, "0")}</i>
            {it.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
