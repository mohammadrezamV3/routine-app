"use client";

import { motion } from "framer-motion";
import { Hash } from "lucide-react";
import type { WeekNumber } from "@/lib/weeklyAnalysis/types";
import { CountText, DOMAIN_ICONS, SectionHead, V_WK_CARD, WK_EASE, toneColor } from "./WeeklyAnalysisKit";

// «اعداد هفته» — کاشی‌های عددی آماده‌ی موتور (قطعی). عدد قابل‌شمارش از مقدار
// قبلی می‌شمره؛ مقدارهایی مثل «+45$» ثابت می‌مونن. هیچ داده‌ای نداریم → کارت نمی‌آد.
export function WeeklyAnalysisNumbers({ numbers }: { numbers: WeekNumber[] }) {
  if (numbers.length === 0) return null;
  return (
    <motion.section className="wk-card wk-numbers" variants={V_WK_CARD} aria-label="اعداد هفته">
      <SectionHead icon={<Hash size={15} />} title="اعداد هفته" />
      <ul className="wk-num-grid">
        {numbers.slice(0, 12).map((n, i) => {
          const Icon = n.domain ? DOMAIN_ICONS[n.domain] : null;
          return (
            <motion.li
              key={n.key}
              className="wk-tile"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -30px 0px" }}
              transition={{ duration: 0.45, delay: Math.min(i, 8) * 0.05, ease: WK_EASE }}
            >
              <span className="wk-tile-label">
                {Icon && <span className="wk-tile-ic" aria-hidden="true"><Icon size={13} /></span>}
                {n.label}
              </span>
              <span className="wk-tile-value">
                <CountText text={n.value} />
                {n.unit && <small>{n.unit}</small>}
              </span>
              {n.hint && <span className="wk-tile-hint" style={{ color: n.tone && n.tone !== "neutral" ? toneColor(n.tone) : undefined }}>{n.hint}</span>}
            </motion.li>
          );
        })}
      </ul>
    </motion.section>
  );
}
