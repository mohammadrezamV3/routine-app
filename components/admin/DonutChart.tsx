"use client";

import { EmptyState } from "./EmptyState";

type Slice = { label: string; value: number; color: string };

export function DonutChart({ data, size = 130 }: { data: Slice[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return <EmptyState />;

  const r = size / 2 - 10;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="admin-donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--adm-border)" strokeWidth={14} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * circumference;
          const el = (
            <circle
              key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={14}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="admin-donut-legend">
        {data.map((d, i) => (
          <div key={i} className="admin-donut-legend-row">
            <span className="admin-donut-legend-dot" style={{ background: d.color }} />
            <span style={{ color: "var(--adm-text)" }}>{d.label}</span>
            <span style={{ color: "var(--adm-muted)", marginRight: "auto" }}>{d.value} ({Math.round((d.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
