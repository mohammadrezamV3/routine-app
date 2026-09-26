"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Award, Lock } from "lucide-react";
import type { Achievement } from "@/lib/weeklyAnalysis/types";
import { cn } from "@/lib/utils";
import { DashCard } from "./DashCard";

const BURST = [0, 60, 120, 180, 240, 300];

// جرقه‌ی کوچکِ جشن دورِ نشانِ باز‌شده — یک بار، موقعِ ظاهرشدن. با حرکتِ
// کاهش‌یافته‌ی سیستم اصلا رندر نمی‌شه.
function Burst({ delay }: { delay: number }) {
  return (
    <span className="wa-burst" aria-hidden="true">
      {BURST.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <motion.i
            key={deg}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{ x: Math.cos(rad) * 26, y: Math.sin(rad) * 26, opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
            transition={{ duration: 0.9, delay, ease: "easeOut" }}
          />
        );
      })}
    </span>
  );
}

export function WeeklyAnalysisAchievements({ achievements }: { achievements: Achievement[] }) {
  const reduce = useReducedMotion();
  if (achievements.length === 0) return null;
  // بازشده‌ها اول — ترتیبِ خودِ موتور بینِ هر گروه حفظ می‌شه
  const sorted = [...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <DashCard className="wa-ach-card">
      <div className="wa-card-head">
        <h2 className="wa-card-title"><Award size={16} className="wa-title-icon" />دستاوردها</h2>
        <span className="wa-muted-sm"><span className="mono">{unlocked}/{achievements.length}</span> باز شده</span>
      </div>
      <div className="wa-ach-grid">
        {sorted.map((a, i) => {
          const pct = a.progress && a.progress.target > 0 ? Math.min(100, (a.progress.current / a.progress.target) * 100) : 0;
          const delay = Math.min(i * 0.06, 0.5);
          return (
            <motion.div
              key={a.key}
              className={cn("wa-ach", a.unlocked ? "unlocked" : "locked")}
              title={a.description}
              initial={{ opacity: 0, scale: a.unlocked ? 0.6 : 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={a.unlocked ? { type: "spring", stiffness: 380, damping: 16, delay } : { duration: 0.3, delay }}
            >
              <span className="wa-ach-emoji-wrap">
                <span className="wa-ach-emoji" aria-hidden="true">{a.emoji}</span>
                {a.unlocked && !reduce && <Burst delay={delay + 0.15} />}
                {!a.unlocked && <Lock size={10} className="wa-ach-lock" />}
              </span>
              <span className="wa-ach-title">{a.title}</span>
              <span className="wa-ach-desc">{a.description}</span>
              {!a.unlocked && a.progress && (
                <span className="wa-ach-progress" aria-label={`${a.progress.current} از ${a.progress.target}`}>
                  <span className="wa-ach-bar"><i style={{ width: `${pct}%` }} /></span>
                  <span className="mono">{a.progress.current}/{a.progress.target}</span>
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </DashCard>
  );
}
