"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LineChart } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, ANALYSIS_DOMAINS, type AnalysisDomain, type TrendPoint } from "@/lib/weeklyAnalysis/types";
import { cn } from "@/lib/utils";
import { DashCard } from "./DashCard";
import { jalaliShort } from "./WeeklyAnalysisShared";

const H = 190;
const PAD = { top: 16, right: 14, bottom: 26, left: 30 };

type Series = "overall" | AnalysisDomain;

// مسیرِ خط با شکستگی روی هفته‌های بدونِ داده — null یعنی «نبود»، پس نباید
// با یک خطِ صاف از روش رد بشیم (اون یعنی داده‌ی ساختگی).
function buildPaths(pts: ({ x: number; y: number } | null)[], baseY: number) {
  const segments: { x: number; y: number }[][] = [];
  let cur: { x: number; y: number }[] = [];
  for (const p of pts) {
    if (p) cur.push(p);
    else if (cur.length) { segments.push(cur); cur = []; }
  }
  if (cur.length) segments.push(cur);
  const line = segments.map((s) => s.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("")).join("");
  const area = segments
    .filter((s) => s.length > 1)
    .map((s) => `M${s[0].x.toFixed(1)},${baseY}` + s.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("") + `L${s[s.length - 1].x.toFixed(1)},${baseY}Z`)
    .join("");
  return { line, area };
}

// روندِ ۸ هفته‌ی اخیر — SVG خالص، هم‌عرضِ واقعیِ کارت (ResizeObserver) تا
// متن‌ها کش نیان. محورِ زمان مثلِ نمودارِ کالری از چپ (قدیم) به راست (جدید).
export function WeeklyAnalysisTrend({ trend }: { trend: TrendPoint[] }) {
  const gradId = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const boxRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [series, setSeries] = useState<Series>("overall");
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // فقط دامنه‌هایی که توی این ۸ هفته حداقل یک عدد دارن چیپ می‌گیرن
  const availableDomains = useMemo(
    () => ANALYSIS_DOMAINS.filter((d) => trend.some((t) => typeof t.domains?.[d] === "number")),
    [trend]
  );

  const valuesOf = (s: Series) => trend.map((t) => (s === "overall" ? t.score : t.domains?.[s] ?? null));
  const main = valuesOf(series);
  const overall = valuesOf("overall");
  const hasAny = main.some((v) => v !== null);

  const innerW = Math.max(0, w - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const n = trend.length;
  const xAt = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const yAt = (v: number) => PAD.top + innerH * (1 - Math.min(100, Math.max(0, v)) / 100);
  const baseY = PAD.top + innerH;

  const mainPts = main.map((v, i) => (v === null ? null : { x: xAt(i), y: yAt(v) }));
  const { line, area } = buildPaths(mainPts, baseY);
  const ghost = series !== "overall" ? buildPaths(overall.map((v, i) => (v === null ? null : { x: xAt(i), y: yAt(v) })), baseY).line : "";

  function pickIndex(clientX: number) {
    const el = boxRef.current;
    if (!el || n === 0) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(xAt(i) - x);
      if (d < bestD) { bestD = d; best = i; }
    }
    setHover(best);
  }

  const hv = hover !== null ? main[hover] : null;
  const tipLeft = hover !== null ? Math.min(Math.max(xAt(hover), 60), Math.max(60, w - 60)) : 0;

  return (
    <DashCard className="wa-trend-card">
      <div className="wa-card-head">
        <h2 className="wa-card-title"><LineChart size={16} className="wa-title-icon" />روند ۸ هفته‌ی اخیر</h2>
      </div>

      {availableDomains.length > 0 && (
        <div className="wa-chip-row" role="tablist">
          {(["overall", ...availableDomains] as Series[]).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={series === s}
              className={cn("wa-ghost wa-chip", series === s && "active")}
              onClick={() => { setSeries(s); setHover(null); }}
            >
              {s === "overall" ? "کل" : ANALYSIS_DOMAIN_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      <div
        ref={boxRef}
        dir="ltr"
        className="wa-trend-box"
        style={{ height: H }}
        onPointerMove={(e) => pickIndex(e.clientX)}
        onPointerDown={(e) => pickIndex(e.clientX)}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") setHover(null); }}
      >
        {w > 0 && (
          <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} className="block" role="img" aria-label="نمودار روند امتیاز هفته‌ها">
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>

            {[0, 50, 100].map((g) => (
              <g key={g}>
                <line x1={PAD.left} x2={w - PAD.right} y1={yAt(g)} y2={yAt(g)} stroke="var(--line)" strokeDasharray={g === 0 ? undefined : "3 4"} strokeWidth={1} />
                <text x={PAD.left - 8} y={yAt(g) + 3.5} textAnchor="end" className="wa-trend-axis">{g}</text>
              </g>
            ))}

            {trend.map((t, i) => (
              <text
                key={t.weekStart}
                x={i === n - 1 ? w - PAD.right + 6 : xAt(i)}
                y={H - 7}
                textAnchor={i === n - 1 ? "end" : "middle"}
                className={cn("wa-trend-axis", i === n - 1 && "current")}
              >
                {/* روی صفحه‌ی باریک یکی‌درمیون، با شمارش از آخر تا برچسبِ «این هفته» جا داشته باشه */}
                {i === n - 1 ? "این هفته" : (w < 420 && (n - 1 - i) % 2 === 1) || (w < 420 && i === n - 2) ? "" : jalaliShort(t.weekStart)}
              </text>
            ))}

            {hover !== null && (
              <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top} y2={baseY} stroke="rgba(var(--accent-rgb),.45)" strokeWidth={1} />
            )}

            {ghost && <path d={ghost} fill="none" stroke="var(--muted2)" strokeWidth={1.5} strokeDasharray="4 4" />}

            {hasAny && (
              <>
                <motion.path
                  key={`area-${series}`}
                  d={area}
                  fill={`url(#${gradId})`}
                  initial={{ opacity: reduce ? 1 : 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                />
                <motion.path
                  key={`line-${series}`}
                  d={line}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: reduce ? 1 : 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduce ? 0 : 0.9, ease: "easeOut" }}
                />
                {mainPts.map((p, i) =>
                  p ? (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={i === n - 1 || hover === i ? 5 : 3.2}
                      fill={i === n - 1 || hover === i ? "var(--accent)" : "var(--bg)"}
                      stroke="var(--accent)"
                      strokeWidth={2}
                    />
                  ) : null
                )}
              </>
            )}
          </svg>
        )}

        {!hasAny && w > 0 && <div className="wa-trend-empty">هنوز داده‌ای برای این روند نیست</div>}

        {hover !== null && trend[hover] && (
          <div className="wa-tooltip" style={{ left: tipLeft }} dir="rtl">
            <div className="wa-tooltip-title">{hover === n - 1 ? "این هفته" : `هفته‌ی ${jalaliShort(trend[hover].weekStart)}`}</div>
            <div>
              {series === "overall" ? "کل" : ANALYSIS_DOMAIN_LABELS[series]}: <b className="mono">{hv === null ? "—" : Math.round(hv)}</b>
            </div>
            {series !== "overall" && (
              <div className="wa-muted-sm">کل: <span className="mono">{overall[hover] === null ? "—" : Math.round(overall[hover] as number)}</span></div>
            )}
          </div>
        )}
      </div>
    </DashCard>
  );
}
