"use client";

import "./weekly-analysis.css";
import "./wa-cards.css";
import { motion } from "framer-motion";
import { Award, Lock } from "lucide-react";
import type { Achievement } from "@/lib/weeklyAnalysis/types";
import { GradientRing, RING_GREEN } from "./GradientRing";
import { LazyRing, SectionHead, V_WK_CARD } from "./WeeklyAnalysisKit";

// قفسه‌ی نشان‌ها (بخش باز): بازشده = حلقه‌ی پر + برق یک‌باره‌ی نور (فقط transform)،
// قفل = ایموجی خاموش + حلقه‌ی پیشرفت (GradientRing). بازشده‌ها اول؛ ترتیب موتور حفظ می‌شه.
const ACH_LOCKED: [string, string] = ["var(--muted)", "var(--muted)"];
const SIZE = 64;

export function WeeklyAnalysisAchievements({ achievements }: { achievements: Achievement[] }) {
  if (achievements.length === 0) return null;
  const sorted = [...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <motion.section className="wc-ach" variants={V_WK_CARD} aria-label="دستاوردهای هفته">
      <SectionHead
        icon={<Award size={15} />}
        title="دستاوردهای هفته"
        aside={<span className="wc-count"><span className="wk-num">{unlocked}/{achievements.length}</span> باز شده</span>}
      />
      <ul className="wc-shelf" data-noswipe>
        {sorted.map((a, i) => {
          const ratio = a.unlocked ? 1 : a.progress && a.progress.target > 0 ? Math.min(1, a.progress.current / a.progress.target) : 0;
          return (
            <li key={a.key} className={`wc-medal${a.unlocked ? " is-on" : ""}`} title={a.description} style={{ ["--i" as string]: i }}>
              <span className="wc-medal-disc">
                <LazyRing size={SIZE}>
                  {(seen) => (
                    <GradientRing
                      value={seen ? ratio : 0}
                      size={SIZE}
                      stroke={5}
                      grad={a.unlocked ? RING_GREEN : ACH_LOCKED}
                      delay={Math.min(i * 0.05, 0.3)}
                    >
                      <span className="wc-medal-emoji" aria-hidden="true">{a.emoji}</span>
                    </GradientRing>
                  )}
                </LazyRing>
              </span>
              <span className="wc-medal-title">{a.title}</span>
              <span className="wc-medal-desc">{a.description}</span>
              {!a.unlocked && a.progress && (
                <span className="wc-medal-prog wk-num"><Lock size={10} aria-hidden="true" />{a.progress.current}/{a.progress.target}</span>
              )}
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
