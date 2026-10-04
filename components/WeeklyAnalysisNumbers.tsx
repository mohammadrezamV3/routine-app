"use client";

import "./wa-viz.css";
import { motion } from "framer-motion";
import { Hash } from "lucide-react";
import type { WeekNumber } from "@/lib/weeklyAnalysis/types";
import { CountText, DOMAIN_ICONS, WK_EASE, toneColor, useCalmMotion } from "./WeeklyAnalysisKit";

// «اعداد هفته» (پنل داخل «الگوهای هفته») — شبکه‌ی کاشی‌های عددی آماده‌ی موتور.
// عدد قابل‌شمارش از صفر می‌شمره؛ مقدارهایی مثل «+45$» ثابت می‌مونن.
export function WeeklyAnalysisNumbers({ numbers }: { numbers: WeekNumber[] }) {
  const calm = useCalmMotion();
  if (numbers.length === 0) return null;
  return (
    <ul className="wkv-nums" aria-label="اعداد هفته">
      {numbers.slice(0, 12).map((n, i) => {
        const Icon = n.domain ? DOMAIN_ICONS[n.domain] : Hash;
        return (
          <motion.li
            key={n.key}
            className="wkv-num-tile"
            initial={calm ? false : { opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, delay: calm ? 0 : Math.min(i, 8) * 0.05, ease: WK_EASE }}
          >
            <span className="wkv-num-ic" aria-hidden="true"><Icon size={16} /></span>
            <span className="wkv-num-label">{n.label}</span>
            <span className="wkv-num-value">
              <CountText text={n.value} />
              {n.unit && <small>{n.unit}</small>}
            </span>
            {n.hint && <span className="wk-tile-hint" style={{ color: n.tone && n.tone !== "neutral" ? toneColor(n.tone) : undefined }}>{n.hint}</span>}
          </motion.li>
        );
      })}
    </ul>
  );
}
