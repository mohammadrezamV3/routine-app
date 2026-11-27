"use client";

import "./coach.css";
import { GradientArc, RING_AMBER, RING_BLUE, RING_GREEN } from "./GradientRing";
import { tr } from "@/lib/i18n";

/**
 * سه حلقه‌ی هم‌مرکز روتین/تمرین/خواب. مقدار 0..100؛ null = پنهان (مسیر خالی +
 * متن «خصوصی» فقط برای صفحه‌خوان). value وسط اختیاری.
 */
export function CoachWeekRings({ routine, workout, sleep, size = 132, center }: { routine: number | null; workout: number | null; sleep: number | null; size?: number; center?: React.ReactNode }) {
  const stroke = Math.max(7, Math.round(size / 13));
  const gap = Math.max(3, Math.round(stroke / 2.2));
  const c = size / 2;
  const rings = [
    { key: "routine", label: tr("روتین", "Routine"), v: routine, g: RING_GREEN },
    { key: "workout", label: tr("تمرین", "Workout"), v: workout, g: RING_AMBER },
    { key: "sleep", label: tr("خواب", "Sleep"), v: sleep, g: RING_BLUE },
  ];
  const label = rings.map((r) => `${r.label} ${r.v == null ? tr("خصوصی", "Private") : `${Math.round(r.v)}%`}`).join("، ");
  return (
    <span className="ch-week-rings" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ overflow: "visible" }} aria-hidden="true">
        {rings.map((r, i) => (
          <GradientArc key={r.key} c={c} r={c - stroke / 2 - i * (stroke + gap)} stroke={stroke} value={r.v == null ? 0 : Math.max(0, Math.min(100, r.v)) / 100} from={r.g[0]} to={r.g[1]} delay={i * 0.12} />
        ))}
      </svg>
      {center != null && <span className="ch-week-rings-center">{center}</span>}
    </span>
  );
}
