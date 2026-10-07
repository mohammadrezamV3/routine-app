"use client";

import "./weekly-analysis.css";
import "./wa-bottom.css";
import Link from "next/link";
import { motion } from "framer-motion";
import type { WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { V_WK_CARD } from "./WeeklyAnalysisKit";

// بنر پایانی هفته‌نامه — همون داده‌ی بنر بالای صفحه (unreadLetter)
export function WeeklyAnalysisLetterCta({ analysis }: { analysis: WeeklyAnalysis }) {
  const l = analysis.unreadLetter;
  if (!l) return null;
  return (
    <motion.div variants={V_WK_CARD}>
      <Link id="letter" href={`/analysis/weekly/letters/${l.weekStart}`} prefetch={false} className="wb-letter">
        <span className="wb-letter-text">
          <span className="wb-letter-kicker">هفته‌نامه · شماره‌ی <span className="wk-num">{l.issueNo}</span></span>
          <strong className="wb-letter-title">{l.headline || "داستان این هفته آماده‌ست"}</strong>
          <span className="wb-letter-sub">{l.weekLabel}</span>
        </span>
        <span className="trade-primary-btn wb-letter-btn">خوندن هفته‌نامه</span>
      </Link>
    </motion.div>
  );
}
