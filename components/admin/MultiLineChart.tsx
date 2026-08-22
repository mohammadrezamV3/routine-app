"use client";

import { useId, useState } from "react";
import { EmptyState } from "./EmptyState";

type Series = { key: string; label: string; color: string };
type Point = { bucket: string; values: Record<string, number> };

const W = 640, H = 200, PAD_L = 34, PAD_R = 8, PAD_T = 10, PAD_B = 24;

// نمودارِ خطیِ چندسری‌ی خامِ SVG — بدونِ کتابخونه (پروژه هیچ chart library
// نداره)، Responsive با viewBox، با Tooltip ساده روی hover.
export function MultiLineChart({ data, series }: { data: Point[]; series: Series[] }) {
  const gradId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const hasData = data.length > 0 && series.some((s) => data.some((d) => (d.values[s.key] || 0) > 0));
  if (!hasData) return <EmptyState />;

  const allValues = data.flatMap((d) => series.map((s) => d.values[s.key] || 0));
  const maxV = Math.max(1, ...allValues);
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const xAt = (i: number) => PAD_L + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const yAt = (v: number) => PAD_T + innerH - (v / maxV) * innerH;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => PAD_T + innerH * (1 - f));
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="admin-svg-chart" preserveAspectRatio="none" style={{ height: 200 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={series[0]?.color || "#00A86B"} stopOpacity="0.35" />
            <stop offset="100%" stopColor={series[0]?.color || "#00A86B"} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((y, i) => <line key={i} x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} className="grid-line" />)}

        {series.length === 1 && (
          <path d={`M${xAt(0)},${yAt(data[0].values[series[0].key] || 0)} ${data.map((d, i) => `L${xAt(i)},${yAt(d.values[series[0].key] || 0)}`).join(" ")} L${xAt(data.length - 1)},${PAD_T + innerH} L${xAt(0)},${PAD_T + innerH} Z`} fill={`url(#${gradId})`} stroke="none" />
        )}

        {series.map((s) => (
          <path
            key={s.key}
            d={`M${data.map((d, i) => `${xAt(i)},${yAt(d.values[s.key] || 0)}`).join(" L")}`}
            fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          />
        ))}

        {data.map((d, i) => (
          (i % labelEvery === 0 || i === data.length - 1) && (
            <text key={i} x={xAt(i)} y={H - 6} textAnchor="middle" className="axis-label">{d.bucket.slice(5)}</text>
          )
        ))}

        {hoverIdx !== null && (
          <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={PAD_T} y2={PAD_T + innerH} stroke="var(--adm-border-strong)" strokeWidth={1} />
        )}

        {data.map((_, i) => (
          <rect key={i} x={xAt(i) - (innerW / data.length) / 2} y={PAD_T} width={Math.max(4, innerW / data.length)} height={innerH}
            fill="transparent" onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} />
        ))}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {series.map((s) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--adm-muted)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: s.color, display: "inline-block" }} />
              {s.label}
            </div>
          ))}
        </div>
        {hoverIdx !== null && (
          <div style={{ fontSize: 11.5, color: "var(--adm-text)", direction: "ltr" }}>
            {data[hoverIdx].bucket} — {series.map((s) => `${s.label}: ${data[hoverIdx].values[s.key] || 0}`).join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}
