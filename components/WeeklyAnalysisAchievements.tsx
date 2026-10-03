"use client";

import { motion } from "framer-motion";
import { Award, Lock } from "lucide-react";
import type { Achievement } from "@/lib/weeklyAnalysis/types";
import { GradientRing } from "./GradientRing";
import { LazyRing, V_WK_CARD } from "./WeeklyAnalysisKit";

// دستاوردهای همین هفته — حلقه‌ی دور هر نشان: بازشده = پر (گرادیان سبز)،
// قفل = به نسبت پیشرفت (کهربایی). بازشده‌ها اول؛ ترتیب موتور حفظ می‌شه.
export function WeeklyAnalysisAchievements({ achievements }: { achievements: Achievement[] }) {
  if (achievements.length === 0) return null;
  const sorted = [...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <motion.section className="wk-card wk-ach" variants={V_WK_CARD} aria-label="دستاوردهای هفته">
      <header className="wk-card-head">
        <h2 className="wk-card-title"><Award size={16} className="wk-title-icon" />دستاوردهای هفته</h2>
        <span className="wk-muted-sm"><span className="wk-num">{unlocked}/{achievements.length}</span> باز شده</span>
      </header>
      <ul className="wk-ach-grid">
        {sorted.map((a, i) => {
          const ratio = a.unlocked ? 1 : a.progress && a.progress.target > 0 ? Math.min(1, a.progress.current / a.progress.target) : 0;
          return (
            <li key={a.key} className={`wk-ach-item${a.unlocked ? " is-on" : ""}`} title={a.description} style={{ ["--i" as string]: i }}>
              <LazyRing size={54}>
                {(seen) => (
                  <GradientRing
                    value={seen ? ratio : 0}
                    size={54}
                    stroke={5}
                    grad={a.unlocked ? ["var(--ring-1a)", "var(--ring-1b)"] : ["var(--ring-3a)", "var(--ring-3b)"]}
                    delay={Math.min(i * 0.05, 0.3)}
                  >
                    <span className="wk-ach-emoji" aria-hidden="true">{a.emoji}</span>
                  </GradientRing>
                )}
              </LazyRing>
              <span className="wk-ach-title">{a.title}</span>
              <span className="wk-ach-desc">{a.description}</span>
              {!a.unlocked && a.progress && (
                <span className="wk-ach-prog wk-num"><Lock size={10} aria-hidden="true" />{a.progress.current}/{a.progress.target}</span>
              )}
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
