"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { tr } from "@/lib/i18n";

// نقشه‌ی سفر مرحله‌ها: مسیر افقی از گره‌های شماره‌دار که با یک خط به هم
// وصل‌اند. انجام‌شده = دایره‌ی پر اکسنتی با تیک، جاری = دایره‌ی بزرگ‌تر با
// حلقه‌ی اکسنتی و درخشش ثابت، بعدی = دایره‌ی توخالی. نسخه‌ی full دکمه‌ای
// است (انتخاب مرحله برای پنل)، نسخه‌ی compact فقط نمایشی (کارت «ادامه بده»).
// جاگیری: وقتی مرحله‌ها از عرض جا نشوند، اسکرول افقی اسنپ‌دار با محوشدن لبه‌ها.

export type JourneyStage = { n: number; title: string; duration?: string; done: boolean };

export function RoadmapJourney({
  stages,
  current,
  selected,
  onSelect,
  variant = "full",
  label,
}: {
  stages: JourneyStage[];
  /** شماره‌ی مرحله‌ی جاری (اولین تمام‌نشده)؛ undefined = همه تمام شده */
  current: number | undefined;
  selected?: number;
  onSelect?: (n: number) => void;
  variant?: "full" | "compact";
  label?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  const first = useRef(true);
  const n = stages.length;
  const interactive = variant === "full" && !!onSelect;
  const focusN = selected ?? current;

  // آیا مرحله‌ها در عرض جا نمی‌شوند؟ (حداقل عرض هر گره از --rmj-w می‌آید)
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const w = parseFloat(getComputedStyle(wrap).getPropertyValue("--rmj-w")) || 96;
      setScrolls(n * w > wrap.clientWidth + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [n]);

  // گره‌ی انتخاب‌شده (یا جاری) وسط نوار می‌آید؛ فقط خود نوار اسکرول می‌خورد، نه صفحه.
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc || !scrolls || focusN == null) return;
    const el = sc.querySelector<HTMLElement>(`[data-n="${focusN}"]`);
    if (!el) return;
    const a = el.getBoundingClientRect();
    const b = sc.getBoundingClientRect();
    const delta = a.left + a.width / 2 - (b.left + b.width / 2);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sc.scrollBy({ left: delta, behavior: first.current || reduce ? "auto" : "smooth" });
    first.current = false;
  }, [focusN, scrolls]);

  const curIdx = current == null ? n - 1 : Math.max(0, stages.findIndex((s) => s.n === current));
  const showTitles = variant === "full" || n <= 6;
  const curStage = stages.find((s) => s.n === current);

  return (
    <div
      ref={wrapRef}
      className={`rmj is-${variant}${scrolls ? " is-scroll" : ""}${showTitles ? " has-titles" : ""}`}
      style={{ ["--rmj-n" as string]: n }}
    >
      <div className="rmj-scroll" ref={scrollRef}>
        <ol className="rmj-list" aria-label={label} aria-hidden={interactive ? undefined : true}>
          {stages.map((st, i) => {
            const state = st.done ? "done" : st.n === current ? "now" : "next";
            const isSel = interactive && st.n === selected;
            const stageWord = tr(`مرحله ${faNum(st.n)}`, `Stage ${faNum(st.n)}`);
            const inner = (
              <>
                <span className="rmj-dot">
                  {state === "done" ? <Check size={variant === "full" ? 18 : 12} strokeWidth={3.2} /> : <span className="rmj-num">{faNum(st.n)}</span>}
                </span>
                {showTitles && (
                  <span className="rmj-text">
                    {variant === "full" && <em className="rmj-eyebrow">{stageWord}</em>}
                    <b className="rmj-title">{st.title}</b>
                    {variant === "full" && st.duration && <i className="rmj-dur">{st.duration}</i>}
                  </span>
                )}
              </>
            );
            return (
              <li key={st.n} data-n={st.n} className={`rmj-node is-${state}${isSel ? " is-selected" : ""}`}>
                {i < n - 1 && (
                  <span className="rmj-seg" aria-hidden="true">
                    {i < curIdx && <span className="rmj-seg-fill" style={{ ["--rmj-i" as string]: i }} />}
                  </span>
                )}
                {interactive ? (
                  <button
                    type="button"
                    className="rmj-btn"
                    aria-current={isSel ? "step" : undefined}
                    aria-label={`${stageWord}: ${st.title}`}
                    onClick={() => onSelect!(st.n)}
                  >
                    {inner}
                  </button>
                ) : (
                  <div className="rmj-btn">{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      {variant === "compact" && curStage && (
        <p className="rmj-cap">
          <b>{tr(`مرحله ${faNum(curStage.n)}`, `Stage ${faNum(curStage.n)}`)}</b>
          <span>{curStage.title}</span>
        </p>
      )}
    </div>
  );
}
