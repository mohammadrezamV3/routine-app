"use client";

import "./coach.css";
import type { ReactNode } from "react";

export type CoachStat = { value: ReactNode; label: string; tone?: "ok" | "warn" | "accent" };

/** ردیف دو تا چهار عدد بزرگ با برچسب (ارقام لاتین را خود فراخوان می‌دهد) */
export function CoachStatRow({ stats, className }: { stats: CoachStat[]; className?: string }) {
  return (
    <dl className={`ch-stats${className ? ` ${className}` : ""}`} style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, stats.length))}, minmax(0, 1fr))` }}>
      {stats.map((s, i) => (
        <div key={i} className={`ch-stat${s.tone ? ` is-${s.tone}` : ""}`}>
          <dd className="ch-stat-value">{s.value}</dd>
          <dt className="ch-stat-label">{s.label}</dt>
        </div>
      ))}
    </dl>
  );
}
