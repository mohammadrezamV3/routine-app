"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, ANALYSIS_DOMAINS, type AnalysisDomain, type TrendPoint } from "@/lib/weeklyAnalysis/types";
import { SegmentedTabs } from "./SegmentedTabs";
import "./wa-viz.css";
import { jalaliShort } from "./WeeklyAnalysisKit";
import { MIN_OFFSET } from "./WeeklyAnalysisNav";

const MIN_H = 210;
const PAD = { top: 18, right: 34, bottom: 30, left: 14 };

export type Series = "overall" | AnalysisDomain;
type Pt = { x: number; y: number };

// مسیر خط نرم (منحنی کاتمول-رام→بزیه) با شکستگی روی هفته‌های بدون داده —
// null یعنی «نبود»، پس نباید با یک خط صاف از روش رد بشیم.
function smooth(seg: Pt[]): string {
  if (seg.length === 1) return `M${seg[0].x.toFixed(1)},${seg[0].y.toFixed(1)}`;
  let d = `M${seg[0].x.toFixed(1)},${seg[0].y.toFixed(1)}`;
  for (let i = 0; i < seg.length - 1; i++) {
    const p0 = seg[i - 1] ?? seg[i];
    const p1 = seg[i];
    const p2 = seg[i + 1];
    const p3 = seg[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function buildPaths(pts: (Pt | null)[], baseY: number) {
  const segs: Pt[][] = [];
  let cur: Pt[] = [];
  for (const p of pts) {
    if (p) cur.push(p);
    else if (cur.length) { segs.push(cur); cur = []; }
  }
  if (cur.length) segs.push(cur);
  const line = segs.map(smooth).join("");
  const area = segs
    .filter((s) => s.length > 1)
    .map((s) => `${smooth(s)}L${s[s.length - 1].x.toFixed(1)},${baseY}L${s[0].x.toFixed(1)},${baseY}Z`)
    .join("");
  return { line, area };
}

// روند 8 هفته‌ی اخیر — SVG خالص با عرض واقعی کارت (ResizeObserver). محور
// زمان از راست (قدیمی) به چپ (جدید)، عین جهت خواندن. با نگه‌داشتن/کشیدن
// روی نمودار مقدار هر هفته نشون داده می‌شه؛ زدن دوباره روی همون هفته (یا
// کلیک ماوس) اون هفته رو باز می‌کنه.
export function WeeklyAnalysisTrend({
  trend, offset, onJump, series: seriesProp, onSeriesChange, hideTabs = false, showAvg = false,
}: {
  trend: TrendPoint[]; offset: number; onJump: (offset: number) => void;
  /** کنترل از بیرون (کارت «روند 8 هفته»): سری انتخابی و تغییرش */
  series?: Series; onSeriesChange?: (s: Series) => void;
  hideTabs?: boolean;
  /** خط چین میانگین 8 هفته + برچسب مقدار روی آخرین نقطه */
  showAvg?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const boxRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [boxH, setBoxH] = useState(MIN_H);
  const [seriesState, setSeriesState] = useState<Series>("overall");
  const series = seriesProp ?? seriesState;
  const setSeries = (s: Series) => { setSeriesState(s); onSeriesChange?.(s); };
  const [hover, setHover] = useState<number | null>(null);
  const downSel = useRef<number | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => { setW(el.clientWidth); setBoxH(Math.max(MIN_H, Math.min(380, el.clientHeight))); };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const availableDomains = useMemo(
    () => ANALYSIS_DOMAINS.filter((d) => trend.some((t) => typeof t.domains?.[d] === "number")),
    [trend]
  );
  // دامنه‌ی انتخاب‌شده اگه با عوض‌شدن داده ناپدید شد، برمی‌گردیم روی «کل»
  const active: Series = series !== "overall" && !availableDomains.includes(series) ? "overall" : series;

  const H = boxH;
  const n = trend.length;
  const innerW = Math.max(0, w - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const baseY = PAD.top + innerH;
  // i=0 قدیمی‌ترین → سمت راست
  const xAt = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (innerW * (n - 1 - i)) / (n - 1));
  const yAt = (v: number) => PAD.top + innerH * (1 - Math.min(100, Math.max(0, v)) / 100);

  const valuesOf = (s: Series) => trend.map((t) => (s === "overall" ? t.score : t.domains?.[s] ?? null));
  const main = useMemo(() => valuesOf(active), [trend, active]); // eslint-disable-line react-hooks/exhaustive-deps
  const overall = useMemo(() => valuesOf("overall"), [trend]); // eslint-disable-line react-hooks/exhaustive-deps
  const hasAny = main.some((v) => v !== null);

  const geo = useMemo(() => {
    const pts = main.map((v, i) => (v === null ? null : { x: xAt(i), y: yAt(v) }));
    const ghostPts = overall.map((v, i) => (v === null ? null : { x: xAt(i), y: yAt(v) }));
    return { pts, ...buildPaths(pts, baseY), ghost: active !== "overall" ? buildPaths(ghostPts, baseY).line : "" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main, overall, w, active]);

  const nums = main.filter((v): v is number => v !== null);
  const avgY = nums.length > 1 ? yAt(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
  const lastPt = geo.pts[n - 1] ?? null;
  const lastVal = main[n - 1] ?? null;

  function pickIndex(clientX: number): number | null {
    const el = boxRef.current;
    if (!el || n === 0) return null;
    const x = clientX - el.getBoundingClientRect().left;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(xAt(i) - x);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  const offsetOf = (i: number) => offset - (n - 1 - i);
  const jumpable = (i: number) => i !== n - 1 && offsetOf(i) >= MIN_OFFSET;
  const hv = hover !== null ? main[hover] : null;
  const tipX = hover !== null ? Math.min(Math.max(xAt(hover), 74), Math.max(74, w - 74)) : 0;
  // یک رنگ داده برای همه‌ی سری‌ها (دامنه فقط با زبانه‌ی انتخابی مشخصه)
  const color = "var(--ring-1a)";
  const color2 = "var(--ring-1b)";

  return (
    <div className="wk-trend wkv-trend" aria-label="روند هشت هفته‌ی اخیر">

      {!hideTabs && availableDomains.length > 0 && (
        <div className="wk-tabs-scroll" data-noswipe>
          <SegmentedTabs<Series>
            className="wk-seg"
            ariaLabel="نمایش روند"
            active={active}
            onChange={(s) => { setSeries(s); setHover(null); }}
            options={[{ value: "overall", label: "کل" }, ...availableDomains.map((d) => ({ value: d as Series, label: ANALYSIS_DOMAIN_LABELS[d] }))]}
          />
        </div>
      )}

      <div
        ref={boxRef}
        className="wk-trend-box"
        data-noswipe
        dir="ltr"
        
        onPointerMove={(e) => { const i = pickIndex(e.clientX); if (i !== null) setHover(i); }}
        onPointerDown={(e) => { downSel.current = hover; const i = pickIndex(e.clientX); if (i !== null) setHover(i); }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") setHover(null); }}
        onClick={(e) => {
          const i = pickIndex(e.clientX);
          if (i === null || !jumpable(i)) return;
          // لمس: بار اول فقط انتخاب، بار دوم روی همون هفته = پرش
          if (downSel.current === i || (e as unknown as { pointerType?: string }).pointerType === "mouse") onJump(offsetOf(i));
        }}
      >
        {w > 0 && (
          <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} className="wk-trend-svg" role="img" aria-label="نمودار روند امتیاز هفته‌ها">
            <defs>
              <linearGradient id={`ar${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.34} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`ln${uid}`} x1="1" y1="0" x2="0" y2="0">
                <stop offset="0%" stopColor={color} />
                <stop offset="100%" stopColor={color2} />
              </linearGradient>
            </defs>

            {[0, 50, 100].map((g) => (
              <g key={g}>
                <line x1={PAD.left} x2={w - PAD.right + 6} y1={yAt(g)} y2={yAt(g)} stroke="var(--box-line)" strokeDasharray={g === 0 ? undefined : "3 5"} strokeWidth={1} />
                <text x={w - PAD.right + 12} y={yAt(g) + 3.5} className="wk-axis">{g}</text>
              </g>
            ))}

            {trend.map((t, i) => {
              // روی صفحه‌ی باریک یکی‌درمیون، با شمارش از جدیدترین
              const skip = w < 420 && (n - 1 - i) % 2 === 1;
              return skip ? null : (
                <text key={t.weekStart} x={xAt(i)} y={H - 8} textAnchor="middle" className={`wk-axis${i === n - 1 ? " is-cur" : ""}${hover === i ? " is-hov" : ""}`}>
                  {/* RLI/PDI: بعضی مرورگرها جهت متن svg رو ltr می‌گیرن و «4 مهر» برعکس («مهر 4») می‌شد */}
                  {i === n - 1 && offset === 0 ? "این هفته" : `\u2067${jalaliShort(t.weekStart)}\u2069`}
                </text>
              );
            })}

            {hover !== null && (
              <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top - 4} y2={baseY} stroke="var(--accent)" strokeOpacity={0.5} strokeWidth={1} />
            )}

            {showAvg && avgY !== null && (
              <line x1={PAD.left} x2={w - PAD.right + 6} y1={avgY} y2={avgY} stroke="var(--ring-2a)" strokeWidth={2} strokeDasharray="5 6" opacity={0.7} />
            )}

            {geo.ghost && <path d={geo.ghost} fill="none" stroke="var(--muted2)" strokeWidth={1.5} strokeDasharray="4 5" />}

            {hasAny && (
              <>
                <motion.path
                  key={`a-${active}-${w > 0}`}
                  d={geo.area}
                  fill={`url(#ar${uid})`}
                  initial={{ opacity: reduce ? 1 : 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.7, delay: reduce ? 0 : 0.35 }}
                />
                <motion.path
                  key={`l-${active}-${w > 0}`}
                  d={geo.line}
                  fill="none"
                  stroke={`url(#ln${uid})`}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: reduce ? 1 : 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduce ? 0 : 1, ease: [0.22, 1, 0.36, 1] }}
                />
                {showAvg && lastPt && lastVal !== null && (
                  <text x={lastPt.x} y={Math.max(12, lastPt.y - 14)} textAnchor="middle" className="wk-trend-last" fill="var(--text)" fontSize={14} fontWeight={700}>
                    {Math.round(lastVal)}
                  </text>
                )}
                {geo.pts.map((p, i) =>
                  p ? (
                    <g key={`${active}-${i}`}>
                      {!reduce && (i === n - 1 || hover === i) && (
                        <motion.circle
                          cx={p.x}
                          cy={p.y}
                          fill="none"
                          stroke={color}
                          strokeWidth={1.5}
                          initial={{ r: 5.5, opacity: 0.7 }}
                          animate={{ r: 14, opacity: 0 }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                        />
                      )}
                      <motion.circle
                        cx={p.x}
                        cy={p.y}
                        initial={{ opacity: reduce ? 1 : 0, r: reduce ? 3.4 : 0 }}
                        animate={{ opacity: 1, r: i === n - 1 || hover === i ? 5.5 : 3.4 }}
                        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 16, delay: hover === null ? 0.35 + 0.08 * (n - 1 - i) : 0 }}
                        fill={i === n - 1 || hover === i ? color : "var(--box-bg)"}
                        stroke={color}
                        strokeWidth={2}
                      />
                    </g>
                  ) : null
                )}
              </>
            )}
          </svg>
        )}

        {!hasAny && w > 0 && <div className="wk-trend-empty">هنوز داده‌ای برای این روند نیست</div>}

        {hover !== null && trend[hover] && (
          <div className="wk-tooltip" style={{ transform: `translate3d(${tipX}px,0,0) translateX(-50%)` }} dir="rtl">
            <div className="wk-tooltip-title">{hover === n - 1 && offset === 0 ? "این هفته" : `هفته‌ی ${jalaliShort(trend[hover].weekStart)}`}</div>
            <div>
              {active === "overall" ? "کل" : ANALYSIS_DOMAIN_LABELS[active]}: <b className="wk-num">{hv === null ? "—" : Math.round(hv)}</b>
            </div>
            {active !== "overall" && (
              <div className="wk-muted-sm">کل: <span className="wk-num">{overall[hover] === null ? "—" : Math.round(overall[hover] as number)}</span></div>
            )}
            {jumpable(hover) && <div className="wk-tooltip-go">بازکردن این هفته<ArrowLeft size={11} /></div>}
          </div>
        )}
      </div>
    </div>
  );
}
