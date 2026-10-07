"use client";

import "./weekly-analysis.css";
import "./wa-cards.css";
import "./wa-bottom.css";
import { motion } from "framer-motion";
import type { Achievement } from "@/lib/weeklyAnalysis/types";
import { GradientRing, RING_GREEN } from "./GradientRing";
import { LazyRing, V_WK_CARD } from "./WeeklyAnalysisKit";

// ردیف مدال‌ها: حلقه‌ی پیشرفت (GradientRing) دور یک هسته‌ی گرد با نماد دستاورد.
// بازشده = حلقه‌ی کامل سبز، قفل = حلقه‌ی خاکستری به اندازه‌ی پیشرفت.
const LOCKED: [string, string] = ["var(--muted)", "var(--muted)"];
const SIZE = 84;

export function WeeklyAnalysisAchievements({ achievements }: { achievements: Achievement[] }) {
  if (achievements.length === 0) return null;
  const sorted = [...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <motion.section className="wb-ach" variants={V_WK_CARD} aria-label="دستاوردها">
      <div className="wb-head wb-head-base">
        <h2 className="wb-title">دستاوردها</h2>
        <span className="wb-count"><span className="wk-num">{unlocked}</span> از <span className="wk-num">{achievements.length}</span> باز شده</span>
      </div>
      <ul className="wb-medals" data-noswipe>
        {sorted.map((a, i) => {
          const ratio = a.unlocked ? 1 : a.progress && a.progress.target > 0 ? Math.min(1, a.progress.current / a.progress.target) : 0;
          return (
            <li key={a.key} className={`wb-medal${a.unlocked ? " is-on" : ""}`} title={a.description}>
              <LazyRing size={SIZE}>
                {(seen) => (
                  <GradientRing value={seen ? ratio : 0} size={SIZE} stroke={5} grad={a.unlocked ? RING_GREEN : LOCKED} delay={Math.min(i * 0.05, 0.3)}>
                    <span className="wb-medal-core" aria-hidden="true">{a.emoji}</span>
                  </GradientRing>
                )}
              </LazyRing>
              <strong className="wb-medal-name">{a.title}</strong>
              <span className="wb-medal-sub wk-num">
                {a.unlocked ? "باز شد" : a.progress ? `${a.progress.current}/${a.progress.target}` : "قفل"}
              </span>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
