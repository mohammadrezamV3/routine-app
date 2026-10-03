"use client";

import { motion } from "framer-motion";
import { Hash } from "lucide-react";
import type { WeekNumber } from "@/lib/weeklyAnalysis/types";
import { CountText, DOMAIN_ICONS, V_WK_CARD, domainColor, toneColor } from "./WeeklyAnalysisKit";

// «اعداد هفته» — کاشی‌های عددی آماده‌ی موتور (قطعی). عدد قابل‌شمارش از مقدار
// قبلی می‌شمره؛ مقدارهایی مثل «+45$» ثابت می‌مونن. هیچ داده‌ای نداریم → کارت نمی‌آد.
export function WeeklyAnalysisNumbers({ numbers }: { numbers: WeekNumber[] }) {
  if (numbers.length === 0) return null;
  return (
    <motion.section className="wk-card wk-numbers" variants={V_WK_CARD} aria-label="اعداد هفته">
      <header className="wk-card-head">
        <h2 className="wk-card-title"><Hash size={16} className="wk-title-icon" />اعداد هفته</h2>
      </header>
      <ul className="wk-num-grid">
        {numbers.slice(0, 12).map((n) => {
          const Icon = n.domain ? DOMAIN_ICONS[n.domain] : null;
          return (
            <li key={n.key} className="wk-tile">
              <span className="wk-tile-label">
                {Icon && <Icon size={13} style={{ color: n.domain ? domainColor(n.domain) : undefined }} />}
                {n.label}
              </span>
              <span className="wk-tile-value">
                <CountText text={n.value} />
                {n.unit && <small>{n.unit}</small>}
              </span>
              {n.hint && <span className="wk-tile-hint" style={{ color: n.tone && n.tone !== "neutral" ? toneColor(n.tone) : undefined }}>{n.hint}</span>}
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
