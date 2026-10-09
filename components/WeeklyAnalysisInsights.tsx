"use client";

import "./weekly-analysis.css";
import "./wa-cards.css";
import "./wa-bottom.css";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ANALYSIS_DOMAIN_LABELS, type Insight } from "@/lib/weeklyAnalysis/types";
import { tr } from "@/lib/i18n";
import { V_WK_CARD, toneColor } from "./WeeklyAnalysisKit";

// بینش‌های قطعی موتور محاسبه (نه AI) — بخش باز، بدون باکس. ستون‌ها با خط مو
// جدا می‌شن (تا سه‌تا در هر ردیف، بقیه ردیف بعد)، عدد درشت کم‌رنگ 01/02/03،
// چیپ بخش، عنوان پررنگ و متن. موبایل: کارت‌های اسکرول افقی با نقطه.
export function WeeklyAnalysisInsights({ insights }: { insights: Insight[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  function onScroll() {
    const el = trackRef.current;
    if (!el || el.children.length < 2) return;
    const first = el.children[0] as HTMLElement;
    const step = (el.children[1] as HTMLElement).offsetLeft - first.offsetLeft;
    if (!step) return;
    const idx = Math.round(Math.abs(el.scrollLeft) / Math.abs(step));
    setActive(Math.max(0, Math.min(el.children.length - 1, idx)));
  }

  return (
    <motion.section className="wb-ins" variants={V_WK_CARD} aria-label={tr("بینش‌های این هفته", "This week's insights")}>
      <h2 className="wb-title">{tr("چیزهایی که این هفته معلوم شد", "What this week revealed")}</h2>
      {insights.length === 0 ? (
        <div className="wk-empty-inline">{tr("هنوز الگوی قابل‌اتکایی پیدا نشده — با چند روز داده‌ی بیشتر، بینش‌ها ظاهر می‌شن.", "No reliable pattern yet. With a few more days of data, insights will appear.")}</div>
      ) : (
        <>
          <ul className="wb-ins-track" ref={trackRef} onScroll={onScroll} data-noswipe>
            {insights.map((ins, i) => (
              <li key={ins.id} className="wb-ins-item" style={{ ["--i" as string]: i, ["--wb-tone" as string]: toneColor(ins.tone) }}>
                <span className="wb-ins-n wk-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                {ins.domain && <span className="wb-ins-chip">{ANALYSIS_DOMAIN_LABELS[ins.domain]}</span>}
                <h3 className="wb-ins-title">{ins.title}</h3>
                <p className="wb-ins-body">{ins.body}</p>
              </li>
            ))}
          </ul>
          {insights.length > 1 && (
            <div className="wc-dots wb-ins-dots" aria-hidden="true">
              {insights.map((ins, i) => <i key={ins.id} className={i === active ? "on" : ""} />)}
            </div>
          )}
        </>
      )}
    </motion.section>
  );
}
