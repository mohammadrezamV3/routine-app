"use client";

import { useId, useState } from "react";
import { EmptyState } from "./EmptyState";
import { bucketLabel, useChartWidth } from "./useChartWidth";
import { formatNumber } from "@/lib/adminFormat";

type Series = { key: string; label: string; color: string };
type Point = { bucket: string; values: Record<string, number> };

const H = 200, PAD_X = 14, PAD_T = 10, PAD_B = 24;

// نمودار خطی چندسری‌ی خام SVG — بدون کتابخونه (پروژه هیچ chart library
// نداره). عرضِ viewBox = عرضِ واقعیِ ظرف تا متن کش نیاد؛ نقطه‌ی hover/لمس
// روی هر سری مشخص می‌شه، و با یک نقطه‌ی داده هم خط (نقطه) دیده می‌شه.
export function MultiLineChart({ data, series }: { data: Point[]; series: Series[] }) {
  const gradId = useId().replace(/:/g, "");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const { ref, width: W } = useChartWidth();

  const val = (d: Point, key: string) => {
    const v = d.values[key];
    return Number.isFinite(v) && v > 0 ? v : 0;
  };
  const hasData = data.length > 0 && series.some((s) => data.some((d) => val(d, s.key) > 0));
  if (!hasData) return <EmptyState />;

  const maxV = Math.max(1, ...data.flatMap((d) => series.map((s) => val(d, s.key))));
  const innerW = Math.max(1, W - PAD_X * 2);
  const innerH = H - PAD_T - PAD_B;
  const base = PAD_T + innerH;

  const xAt = (i: number) => PAD_X + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const yAt = (v: number) => base - (v / maxV) * innerH;
  const slot = innerW / Math.max(1, data.length - 1 || 1);

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => PAD_T + innerH * (1 - f));
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 56))));
  const firstColor = series[0]?.color || "var(--adm-accent)";
  const active = hoverIdx !== null && hoverIdx < data.length ? data[hoverIdx] : null;
  const showDots = data.length <= 2;

  return (
    <div className="admin-chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="admin-svg-chart" role="img" onMouseLeave={() => setHoverIdx(null)}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: firstColor, stopOpacity: 0.35 }} />
            <stop offset="100%" style={{ stopColor: firstColor, stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {gridLines.map((y, i) => <line key={i} x1={PAD_X} x2={W - PAD_X} y1={y} y2={y} className="grid-line" />)}

        {series.length === 1 && data.length > 1 && (
          <path d={`M${xAt(0)},${base} ${data.map((d, i) => `L${xAt(i)},${yAt(val(d, series[0].key))}`).join(" ")} L${xAt(data.length - 1)},${base} Z`} fill={`url(#${gradId})`} stroke="none" />
        )}

        {data.length > 1 && series.map((s) => (
          <path
            key={s.key}
            d={`M${data.map((d, i) => `${xAt(i)},${yAt(val(d, s.key))}`).join(" L")}`}
            fill="none" style={{ stroke: s.color }} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          />
        ))}

        {data.map((d, i) => {
          const showLabel = i % labelEvery === 0 || (i === data.length - 1 && (data.length - 1) % labelEvery >= labelEvery / 2);
          return showLabel ? <text key={i} x={xAt(i)} y={H - 6} textAnchor="middle" className="axis-label">{bucketLabel(d.bucket)}</text> : null;
        })}

        {hoverIdx !== null && active && (
          <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={PAD_T} y2={base} className="hover-line" />
        )}

        {data.map((d, i) => (showDots || i === hoverIdx) && series.map((s) => (
          <circle key={`${s.key}-${i}`} cx={xAt(i)} cy={yAt(val(d, s.key))} r={3.5} className="dot" style={{ stroke: s.color }} />
        )))}

        {data.map((_, i) => {
          const half = (data.length === 1 ? innerW : slot) / 2;
          const x0 = Math.max(0, xAt(i) - half);
          const x1 = Math.min(W, xAt(i) + half);
          return (
            <rect key={i} x={x0} y={PAD_T} width={Math.max(1, x1 - x0)} height={innerH}
              fill="transparent" onMouseEnter={() => setHoverIdx(i)} onClick={() => setHoverIdx(i)} />
          );
        })}
      </svg>

      <div className="admin-chart-foot">
        <div className="admin-chart-legend">
          {series.map((s) => (
            <span key={s.key} className="admin-chart-legend-item">
              <span className="admin-chart-legend-dot" style={{ background: s.color }} />
              {s.label}
              {active && <strong className="admin-ltr">{formatNumber(val(active, s.key))}</strong>}
            </span>
          ))}
        </div>
        <span className="admin-chart-tip-hint admin-ltr">{active ? active.bucket : " "}</span>
      </div>
    </div>
  );
}
