"use client";

import "./weekly-analysis.css";
import "./wa-bottom.css";
import { motion } from "framer-motion";
import { Flame, Medal, Star, TrendingUp, type LucideIcon } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { V_WK_CARD, WK_EASE, jalaliShort, useCalmMotion } from "./WeeklyAnalysisKit";

type Moment = { key: string; label: string; value: string; num: string; color: string; Icon: LucideIcon };

const GOOD_DAY = 70;

// «لحظه‌های هفته» — فقط از داده‌ی واقعی تحلیل؛ ردیفی که داده نداره حذف می‌شه.
function buildMoments(a: WeeklyAnalysis): Moment[] {
  const out: Moment[] = [];

  const best = a.overall.bestDay;
  if (best && best.score !== null) {
    out.push({ key: "best", label: "بهترین روز", value: `${best.weekday} ${jalaliShort(best.date)}`, num: String(Math.round(best.score)), color: "var(--accent)", Icon: Star });
  }

  const up = a.domains
    .filter((d) => d.hasData && d.delta !== null && d.delta > 0)
    .sort((x, y) => (y.delta as number) - (x.delta as number))[0];
  if (up) {
    out.push({ key: "up", label: "بیشترین پیشرفت", value: ANALYSIS_DOMAIN_LABELS[up.domain], num: `+${Math.round(up.delta as number)}`, color: "var(--ring-2a)", Icon: TrendingUp });
  }

  // طولانی‌ترین زنجیره‌ی روزهای خوب (امتیاز >= 70) در همین هفته
  let run = 0;
  let longest = 0;
  for (const d of a.days) {
    if (!d.isFuture && d.score !== null && d.score >= GOOD_DAY) { run += 1; longest = Math.max(longest, run); } else run = 0;
  }
  if (longest >= 2) {
    out.push({ key: "streak", label: "بهترین زنجیره", value: `${longest} روز پشت سر هم بالای ${GOOD_DAY}`, num: String(longest), color: "var(--ring-3a)", Icon: Flame });
  }

  const top = a.domains
    .filter((d) => d.hasData && d.score !== null)
    .sort((x, y) => (y.score as number) - (x.score as number))[0];
  if (top) {
    out.push({ key: "top", label: "قوی‌ترین بخش", value: ANALYSIS_DOMAIN_LABELS[top.domain], num: String(Math.round(top.score as number)), color: "var(--ring-2b)", Icon: Medal });
  }
  return out;
}

export function WeeklyAnalysisMoments({ analysis }: { analysis: WeeklyAnalysis }) {
  const calm = useCalmMotion();
  const items = buildMoments(analysis);
  if (items.length === 0) return null;
  return (
    <motion.section className="wb-moments" variants={V_WK_CARD} aria-label="لحظه‌های هفته">
      <h2 className="wb-title">لحظه‌های هفته</h2>
      <ul className="wb-mom-list">
        {items.map((m, i) => (
          <motion.li
            key={m.key}
            className="wb-mom"
            style={{ ["--wb-tone" as string]: m.color }}
            initial={calm ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -30px 0px" }}
            transition={{ duration: 0.4, delay: calm ? 0 : i * 0.06, ease: WK_EASE }}
          >
            <span className="wb-mom-ic" aria-hidden="true"><m.Icon size={20} /></span>
            <span className="wb-mom-text">
              <span className="wb-mom-label">{m.label}</span>
              <strong className="wb-mom-value">{m.value}</strong>
            </span>
            <span className="wb-mom-num wk-num">{m.num}</span>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
