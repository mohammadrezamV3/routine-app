"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { faNum } from "@/lib/jalali";
import type { PlanStage } from "@/lib/roadmapPlan";
import { tr } from "@/lib/i18n";

/**
 * ناوبر مرحله‌ها: دسکتاپ فهرست عمودی چسبان در یک باکس، موبایل نوار افقی
 * اسنپ‌دار. هر مورد = نشان وضعیت (تیک/شماره) + «مرحله N» + عنوان. مرحله‌ی
 * انتخاب‌شده بوردر اکسنتی دارد، مرحله‌ی جاری (اولین تمام‌نشده) نقطه‌ی جاری.
 */
export function RoadmapStageNav({
  stages,
  progress,
  selected,
  current,
  onSelect,
}: {
  stages: PlanStage[];
  progress: Record<string, boolean>;
  selected: number;
  current: number | undefined;
  onSelect: (n: number) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const first = useRef(true);
  const done = stages.filter((s) => progress[String(s.n)]).length;

  // مورد انتخاب‌شده در نوار افقی (موبایل) وسط می‌آید؛ بار اول دست نمی‌زند.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const list = listRef.current;
    if (!list || list.scrollWidth <= list.clientWidth + 1) return;
    const el = list.querySelector<HTMLElement>('[aria-current="step"]');
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: reduce ? "auto" : "smooth" });
  }, [selected]);

  return (
    <nav className="trade-surface rmx-nav" aria-label={tr("مرحله‌ها", "Stages")}>
      <div className="rmx-nav-title">
        <span>{tr("مرحله‌ها", "Stages")}</span>
        <b><bdi dir="ltr">{faNum(done)}/{faNum(stages.length)}</bdi></b>
      </div>
      <ol className="rmx-nav-list" ref={listRef}>
        {stages.map((st) => {
          const isDone = !!progress[String(st.n)];
          const isNow = st.n === current;
          const isSel = st.n === selected;
          return (
            <li key={st.n} className="rmx-nav-li">
              <button
                type="button"
                className={`rmx-nav-item${isSel ? " is-selected" : ""}${isDone ? " is-done" : ""}${isNow ? " is-now" : ""}`}
                aria-current={isSel ? "step" : undefined}
                onClick={() => onSelect(st.n)}
              >
                <span className="rmx-nav-mark">{isDone ? <Check size={12} strokeWidth={3.2} /> : faNum(st.n)}</span>
                <span className="rmx-nav-text">
                  <em>
                    {tr(`مرحله ${faNum(st.n)}`, `Stage ${faNum(st.n)}`)}
                    {isNow && <i>{tr("جاری", "Current")}</i>}
                  </em>
                  <b>{st.title}</b>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
