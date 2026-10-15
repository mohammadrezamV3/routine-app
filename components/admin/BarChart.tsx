"use client";

import { useState } from "react";
import { EmptyState } from "./EmptyState";
import { bucketLabel, useChartWidth } from "./useChartWidth";
import { formatNumber } from "@/lib/adminFormat";
import { tr } from "@/lib/i18n";

const H = 200, PAD_X = 8, PAD_T = 10, PAD_B = 24;

// نمودار میله‌ای خام SVG. عرض viewBox = عرض واقعی ظرف (نه کشیدن یک
// viewBox ثابت) تا متن محور تغییرشکل نده. hover روی دسکتاپ و لمس روی
// موبایل هر دو مقدار رو نشون می‌دن؛ ردیف مقدار همیشه جا داره تا پرش نداشته باشه.
export function BarChart({ data, color = "var(--adm-accent)", formatValue }: { data: { bucket: string; value: number }[]; color?: string; formatValue?: (v: number) => string }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const { ref, width: W } = useChartWidth();
  const hasData = data.length > 0 && data.some((d) => Number.isFinite(d.value) && d.value > 0);
  if (!hasData) return <EmptyState />;

  const safe = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
  const maxV = Math.max(1, ...data.map((d) => safe(d.value)));
  const innerW = Math.max(1, W - PAD_X * 2);
  const innerH = H - PAD_T - PAD_B;
  const slot = innerW / data.length;
  const barW = Math.max(2, Math.min(28, slot * 0.6));
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 56))));
  const active = hoverIdx !== null && hoverIdx < data.length ? data[hoverIdx] : null;
  const fmt = (v: number) => (formatValue ? formatValue(v) : formatNumber(v));

  return (
    <div className="admin-chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="admin-svg-chart" role="img" onMouseLeave={() => setHoverIdx(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => <line key={i} x1={PAD_X} x2={W - PAD_X} y1={PAD_T + innerH * (1 - f)} y2={PAD_T + innerH * (1 - f)} className="grid-line" />)}
        {data.map((d, i) => {
          const x = PAD_X + i * slot + (slot - barW) / 2;
          const h = (safe(d.value) / maxV) * innerH;
          const y = PAD_T + innerH - h;
          const showLabel = i % labelEvery === 0 || (i === data.length - 1 && (data.length - 1) % labelEvery >= labelEvery / 2);
          return (
            <g key={d.bucket + i}>
              {h > 0 && <rect x={x} y={y} width={barW} height={Math.max(1, h)} rx={3} style={{ fill: color }} opacity={hoverIdx === i ? 1 : 0.85} />}
              {showLabel && (
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" className="axis-label">{bucketLabel(d.bucket)}</text>
              )}
              <rect
                x={PAD_X + i * slot} y={PAD_T} width={slot} height={innerH} fill="transparent"
                onMouseEnter={() => setHoverIdx(i)} onClick={() => setHoverIdx(i)}
              />
            </g>
          );
        })}
      </svg>
      <div className="admin-chart-tip">
        {active ? (
          <>
            <span className="admin-ltr">{active.bucket}</span>
            <strong className="admin-ltr">{fmt(safe(active.value))}</strong>
          </>
        ) : (
          <span className="admin-chart-tip-hint">{tr("برای دیدن مقدار، روی نمودار برو یا بزن", "Hover or tap the chart to see values")}</span>
        )}
      </div>
    </div>
  );
}
