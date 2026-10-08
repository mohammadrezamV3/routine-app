"use client";

// فصل «خلاصه در اعداد»: کاشی‌های WeekNumber با شمارش از صفر + مسیر 8 هفته.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Activity } from "lucide-react";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";
import { ANALYSIS_DOMAINS, ANALYSIS_DOMAIN_LABELS, type AnalysisDomain, type TrendPoint } from "@/lib/weeklyAnalysis/types";
import { SegmentedTabs } from "./SegmentedTabs";
import { CountText, DOMAIN_ICONS, Reveal, WL_EASE, useLite } from "./WeeklyLetterShared";
import { jalaliDayMonth, smoothPath } from "./WeeklyLetterUtils";

function NumberTile({ n, i }: { n: WeeklyLetterData["numbers"][number]; i: number }) {
  const Icon = n.domain ? DOMAIN_ICONS[n.domain] : Activity;
  return (
    <Reveal className="wl-card wl-num" delay={(i % 3) * 0.06}>
      <span className="wl-num-ico"><Icon size={16} /></span>
      <span className="wl-num-label">{n.label}</span>
      <span className="wl-num-val">
        <CountText value={n.value} className="wl-num-main" />
        {n.unit && <small>{n.unit}</small>}
      </span>
      {n.hint && <span className={`wl-num-hint is-${n.tone ?? "neutral"}`}>{n.hint}</span>}
    </Reveal>
  );
}

const H = 148;
const PAD_X = 22;
const PAD_T = 26;
const PAD_B = 12;
const LBL_H = 20;

type TrendFilter = "all" | AnalysisDomain;

function TrendCard({ trend, onJumpWeek }: { trend: TrendPoint[]; onJumpWeek?: (weekStart: string) => void }) {
  const uid = useId().replace(/:/g, "");
  const lite = useLite();
  // عرض واقعی کارت: نمودار 1:1 رسم می‌شه (نه کش‌آمده با viewBox) تا متن‌ها درشت نشن
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);
  const inView = useInView(boxRef, { once: true, margin: "0px 0px -8% 0px" });
  const [filter, setFilter] = useState<TrendFilter>("all");
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const set = () => setW(Math.floor(el.getBoundingClientRect().width));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // فقط بخش‌هایی که حداقل در یکی از هفته‌ها امتیاز دارن فیلتر می‌شن
  const domainOpts = useMemo(
    () => ANALYSIS_DOMAINS.filter((d) => trend.filter((t) => typeof t.domains?.[d] === "number").length >= 2),
    [trend],
  );
  const activeFilter: TrendFilter = filter === "all" || domainOpts.includes(filter) ? filter : "all";

  const model = useMemo(() => {
    const n = trend.length;
    const xAt = (i: number) => PAD_X + (n === 1 ? (W - 2 * PAD_X) / 2 : (i * (W - 2 * PAD_X)) / (n - 1));
    // RTL: قدیمی‌ترین هفته سمت راست، همین هفته سمت چپ (جهت زمان فارسی)
    const pts = trend.map((t, i) => {
      const raw = activeFilter === "all" ? t.score : t.domains?.[activeFilter] ?? null;
      const score = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
      return {
        x: W - xAt(i),
        y: score === null ? null : PAD_T + (1 - Math.min(100, Math.max(0, score)) / 100) * (H - PAD_T - PAD_B),
        score,
        weekStart: t.weekStart,
      };
    });
    // خط‌های جدا برای هفته‌های بدون داده
    const segs: { x: number; y: number }[][] = [];
    let cur: { x: number; y: number }[] = [];
    for (const p of pts) {
      if (p.y === null) { if (cur.length) segs.push(cur); cur = []; } else cur.push({ x: p.x, y: p.y });
    }
    if (cur.length) segs.push(cur);
    return { pts, segs };
  }, [trend, W, activeFilter]);

  const scored = model.pts.filter((p) => p.y !== null);
  if (trend.length < 2) return null;
  const lastIdx = (() => { for (let i = model.pts.length - 1; i >= 0; i--) if (model.pts[i].y !== null) return i; return -1; })();
  const selIdx = sel !== null && model.pts[sel]?.y !== null && model.pts[sel] ? sel : lastIdx;
  const selPt = selIdx >= 0 ? model.pts[selIdx] : null;
  const bottom = H - PAD_B;
  // برچسب محور فقط برای هفته‌های دارای داده و با فاصله‌ی کافی (حداقل ~52px)
  const stride = Math.max(1, Math.ceil(52 / Math.max(1, (W - 2 * PAD_X) / Math.max(1, trend.length - 1))));
  const labelled = new Set<number>();
  for (let i = model.pts.length - 1; i >= 0; i -= stride) if (model.pts[i].y !== null) labelled.add(i);
  const isCurrentSel = selIdx === model.pts.length - 1;

  return (
    <Reveal className="wl-card wl-trend">
      <div className="wl-trend-head">
        <span className="wl-num-ico"><Activity size={16} /></span>
        <span className="wl-num-label">مسیر {trend.length} هفته‌ی اخیر</span>
      </div>
      {domainOpts.length > 0 && (
        <div className="wl-dp-tr-tabs" data-noswipe>
          <SegmentedTabs<TrendFilter>
            ariaLabel="بخش نمودار"
            active={activeFilter}
            onChange={(v) => { setFilter(v); setSel(null); }}
            options={[{ value: "all", label: "کل" }, ...domainOpts.map((d) => ({ value: d as TrendFilter, label: ANALYSIS_DOMAIN_LABELS[d] }))]}
          />
        </div>
      )}
      <div ref={boxRef} className="wl-trend-box" style={{ height: H + LBL_H }}>
      {scored.length < 2 && <p className="wl-dp-tr-none">برای این بخش هنوز دو هفته داده نیست.</p>}
      {W > 0 && scored.length >= 2 && <svg viewBox={`0 0 ${W} ${H + LBL_H}`} width={W} height={H + LBL_H} className="wl-trend-svg" role="img" aria-label="نمودار امتیاز هفته‌ها">
        <defs>
          <linearGradient id={`tg${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--ring-1a)" stopOpacity=".34" />
            <stop offset="100%" stopColor="var(--ring-1a)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((g) => {
          const y = PAD_T + (1 - g / 100) * (H - PAD_T - PAD_B);
          return <line key={g} x1={PAD_X} x2={W - PAD_X} y1={y} y2={y} className="wl-trend-grid" />;
        })}
        {model.segs.map((seg, i) => {
          if (seg.length < 2) return null;
          const line = smoothPath(seg);
          const area = `${line} L${seg[seg.length - 1].x} ${bottom} L${seg[0].x} ${bottom} Z`;
          return (
            <g key={`${activeFilter}-${i}`}>
              <motion.path
                d={area}
                fill={`url(#tg${uid})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: inView ? 1 : 0 }}
                transition={{ duration: lite ? 0.2 : 1, delay: lite ? 0 : 0.5 }}
              />
              <motion.path
                d={line}
                fill="none"
                stroke="var(--ring-1a)"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: lite ? 1 : 0 }}
                animate={{ pathLength: inView ? 1 : lite ? 1 : 0 }}
                transition={{ duration: lite ? 0.2 : 1.4, ease: WL_EASE as never }}
              />
            </g>
          );
        })}
        {model.pts.map((p, i) =>
          p.y === null ? null : (
            <motion.circle
              key={`${activeFilter}-${i}`}
              cx={p.x}
              cy={p.y}
              r={i === selIdx ? 5 : 2.8}
              className={i === selIdx ? "wl-trend-dot is-last" : "wl-trend-dot"}
              initial={{ scale: lite ? 1 : 0, opacity: 0 }}
              animate={{ scale: inView ? 1 : lite ? 1 : 0, opacity: inView ? 1 : 0 }}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
              transition={{ delay: lite ? 0 : 0.6 + i * 0.07, type: "spring", stiffness: 380, damping: 18 }}
            />
          ),
        )}
        {selPt && selPt.y !== null && (
          <text x={Math.min(W - 14, Math.max(14, selPt.x))} y={selPt.y - 11} textAnchor="middle" className="wl-trend-val">{Math.round(selPt.score as number)}</text>
        )}
        {model.pts.map((p, i) => {
          if (!labelled.has(i) && i !== selIdx) return null;
          if (p.y === null) return null;
          const anchor = p.x < 30 ? "start" : p.x > W - 30 ? "end" : "middle";
          return (
            <text key={`l${i}`} x={p.x} y={H + 13} textAnchor={anchor} className={`wl-trend-lbl${i === selIdx ? " is-sel" : ""}`}>
              {/* svg عمدا ltr ـه (لنگر متن فیزیکی بمونه)؛ RLI/PDI تا «4 مهر» برعکس نشه */}
              {`\u2067${jalaliDayMonth(p.weekStart)}\u2069`}
            </text>
          );
        })}
        {/* ناحیه‌ی لمس 44 پیکسلی روی هر نقطه */}
        {model.pts.map((p, i) =>
          p.y === null ? null : (
            <circle
              key={`h${i}`}
              cx={p.x}
              cy={p.y}
              r={Math.max(12, Math.min(22, ((W - 2 * PAD_X) / Math.max(1, trend.length - 1)) / 2))}
              className="wl-dp-tr-hit"
              tabIndex={0}
              role="button"
              aria-label={`هفته‌ی ${jalaliDayMonth(p.weekStart)}: ${Math.round(p.score as number)}`}
              onClick={() => setSel(i)}
              onFocus={() => setSel(i)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(i); } }}
            />
          ),
        )}
      </svg>}
      </div>
      {selPt && onJumpWeek && !isCurrentSel && (
        <button type="button" className="account-outline-btn wl-dp-tr-jump" onClick={() => onJumpWeek(selPt.weekStart)}>
          مشاهده‌ی هفته‌ی {jalaliDayMonth(selPt.weekStart)}
        </button>
      )}
    </Reveal>
  );
}

export function WeeklyLetterNumbers({ numbers, trend, onJumpWeek }: { numbers: WeeklyLetterData["numbers"]; trend: TrendPoint[]; onJumpWeek?: (weekStart: string) => void }) {
  return (
    <>
      {numbers.length > 0 && (
        <div className="wl-num-grid">
          {numbers.map((n, i) => <NumberTile key={n.key} n={n} i={i} />)}
        </div>
      )}
      {trend.length > 1 && <TrendCard trend={trend} onJumpWeek={onJumpWeek} />}
    </>
  );
}
