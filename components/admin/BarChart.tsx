"use client";

import { useState } from "react";
import { EmptyState } from "./EmptyState";

const W = 640, H = 200, PAD_L = 34, PAD_R = 8, PAD_T = 10, PAD_B = 24;

export function BarChart({ data, color = "#00A86B", formatValue }: { data: { bucket: string; value: number }[]; color?: string; formatValue?: (v: number) => string }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const hasData = data.length > 0 && data.some((d) => d.value > 0);
  if (!hasData) return <EmptyState />;

  const maxV = Math.max(1, ...data.map((d) => d.value));
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const barW = Math.min(28, (innerW / data.length) * 0.6);
  const gap = innerW / data.length;
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="admin-svg-chart" preserveAspectRatio="none" style={{ height: 200 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => <line key={i} x1={PAD_L} x2={W - PAD_R} y1={PAD_T + innerH * (1 - f)} y2={PAD_T + innerH * (1 - f)} className="grid-line" />)}
        {data.map((d, i) => {
          const x = PAD_L + i * gap + (gap - barW) / 2;
          const h = (d.value / maxV) * innerH;
          const y = PAD_T + innerH - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={Math.max(1, h)} rx={3} fill={color} opacity={hoverIdx === i ? 1 : 0.85}
                onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} />
              {(i % labelEvery === 0 || i === data.length - 1) && (
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" className="axis-label">{d.bucket.slice(5)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hoverIdx !== null && (
        <div style={{ fontSize: 11.5, color: "var(--adm-text)", direction: "ltr", textAlign: "left", marginTop: 6 }}>
          {data[hoverIdx].bucket} — {formatValue ? formatValue(data[hoverIdx].value) : data[hoverIdx].value}
        </div>
      )}
    </div>
  );
}
