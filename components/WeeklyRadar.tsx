"use client";

// رادار (spider) مشترک آنالیز هفتگی و هفته‌نامه: هر محور یک بخش، هفته‌ی جاری
// چندضلعی پر (گرادیان ring-1) و هفته‌ی قبل خط‌چین خنثی. فقط یک رنگ داده
// (--ring-1a/1b). ورود: چندضلعی از مرکز بزرگ می‌شه و خطش کشیده می‌شه، فقط
// transform/opacity/dashoffset، با on=true. حرکت‌کاهی و data-perf=low بی‌انیمیشن.
// هندسه‌ی خالص در lib/weeklyRadar.ts (تست‌دار).
import { useId } from "react";
import {
  RADAR_C, RADAR_R, RADAR_RINGS, RADAR_MIN_AXES, RADAR_VIEW, pointsToPath, radarDir, radarLabelPos, radarPoint, radarPoints, ringPath,
  type RadarAxis,
} from "@/lib/weeklyRadar";
import { tr } from "@/lib/i18n";
import "./weekly-radar.css";

export type { RadarAxis };

export default function WeeklyRadar({
  axes, size = 300, on = true, activeKey = null, ariaLabel, className,
}: {
  axes: RadarAxis[];
  /** حداکثر عرض به پیکسل؛ خود رادار پاسخ‌گوئه و تا عرض والد کوچیک می‌شه */
  size?: number;
  /** false = هنوز وارد دید نشده (انیمیشن ورود با true شروع می‌شه) */
  on?: boolean;
  /** محوری که پررنگ می‌شه (مثلا ردیف هاورشده‌ی فهرست) */
  activeKey?: string | null;
  ariaLabel?: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const n = axes.length;
  if (n < RADAR_MIN_AXES) return null;

  const cur = radarPoints(axes.map((a) => a.value));
  const hasPrev = axes.some((a) => a.prev !== null && Number.isFinite(a.prev));
  const prevPts = hasPrev ? radarPoints(axes.map((a) => a.prev)) : [];
  const curPath = pointsToPath(cur);
  const label = ariaLabel ?? axes.map((a) => `${a.label} ${a.value === null ? "-" : Math.round(a.value)}`).join(tr("، ", ", "));
  const activeIdx = activeKey ? axes.findIndex((a) => a.key === activeKey) : -1;

  return (
    <div
      className={`wr-root${on ? " is-on" : ""}${activeIdx >= 0 ? " has-active" : ""}${className ? ` ${className}` : ""}`}
      style={{ maxWidth: size }}
      role="img"
      aria-label={label}
    >
      <svg className="wr-svg" viewBox={`0 0 ${RADAR_VIEW} ${RADAR_VIEW}`} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`wr-fill-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--ring-1a)" }} stopOpacity="0.34" />
            <stop offset="1" style={{ stopColor: "var(--ring-1b)" }} stopOpacity="0.16" />
          </linearGradient>
          <linearGradient id={`wr-line-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--ring-1a)" }} />
            <stop offset="1" style={{ stopColor: "var(--ring-1b)" }} />
          </linearGradient>
        </defs>

        {RADAR_RINGS.map((lv) => (
          <path key={lv} d={ringPath(lv, n)} className={`wr-ring${lv === 100 ? " is-outer" : ""}`} />
        ))}
        {axes.map((a, i) => {
          const end = radarPoint(i, n, 100);
          return <line key={a.key} x1={RADAR_C} y1={RADAR_C} x2={end.x} y2={end.y} className={`wr-spoke${i === activeIdx ? " is-active" : ""}`} />;
        })}

        {hasPrev && <path d={pointsToPath(prevPts)} className="wr-prev" pathLength={1} />}

        <g className="wr-poly">
          <path d={curPath} className="wr-area" fill={`url(#wr-fill-${uid})`} />
          <path d={curPath} className="wr-stroke" stroke={`url(#wr-line-${uid})`} pathLength={1} />
        </g>
        {axes.map((a, i) => {
          if (a.value === null) return null;
          return (
            <circle
              key={a.key} cx={cur[i].x} cy={cur[i].y} r={i === activeIdx ? 4.4 : 2.8}
              className={`wr-dot${i === activeIdx ? " is-active" : ""}`}
              style={{ ["--wr-d" as string]: `${500 + i * 70}ms` }}
            />
          );
        })}
      </svg>
      {axes.map((a, i) => {
        const p = radarLabelPos(i, n);
        const d = radarDir(i, n);
        return (
          <span
            key={a.key}
            className={`wr-label${i === activeIdx ? " is-active" : ""}${a.value === null ? " is-empty" : ""}`}
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              transform: `translate(calc(-50% + ${d.x * 50}%), calc(-50% + ${d.y * 50}%))`,
            }}
            aria-hidden="true"
          >
            {a.label}
          </span>
        );
      })}
    </div>
  );
}
