"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3 } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import {
  scoreBandLabel,
  addDaysIso,
  clockOf,
  durationLabel,
  minuteOfDay,
  minutesToClock,
  scoreBand,
  sleepMinutes,
  timelineSpan,
  type ScoreBand,
  type SleepInsights,
  type SleepRecord,
} from "@/lib/sleep";
import { weekdayName, weekdayShort, jMonthName, faNum, toJalali } from "@/lib/jalali";
import { isEn, tr } from "@/lib/i18n";
import "./sleep-charts.css";

// نمودار شب‌ها: دو نمای هم‌ستون در یک SVG — بالا «خط زمانی» (کپسول از ساعت
// خواب تا بیداری روی محور ساعت 20 تا 12) و پایین «مدت» (میله + خط هدف +
// میانگین نرم). ستون‌ها از راست به چپ قدیمی به جدیدن (RTL). SVG خالص، بدون
// کتابخانه؛ عرض از ResizeObserver میاد تا متن هیچ‌وقت کشیده نشه.
export type SleepTrendChartProps = {
  entries: SleepRecord[];
  insights: SleepInsights;
  target: { wake: string; sleep: string };
  todayIso: string;
  onPick: (dateIso: string) => void;
};

type Range = "7" | "30";

const AXIS_START = 20 * 60; // 20:00
const AXIS_SPAN = 16 * 60; // تا 12:00 روز بعد

function jalaliParts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const [, jm, jd] = toJalali(y, m, d);
  return { jm, jd, dow: new Date(y, m - 1, d).getDay() };
}
function hmToMin(v: string, fallback: number): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : fallback;
}

/** منحنی نرم (Catmull-Rom به بزیه) از نقطه‌ها */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function SleepTrendChart({ entries, insights, target, todayIso, onPick }: SleepTrendChartProps) {
  const [range, setRange] = useState<Range>("7");
  const [sel, setSel] = useState<string | null>(null);
  const [width, setWidth] = useState(320);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => setWidth(Math.max(240, Math.round(el.clientWidth)));
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = range === "7" ? 7 : 30;

  const byDate = useMemo(() => {
    const m = new Map<string, SleepRecord>();
    for (const e of entries) if (sleepMinutes(e) > 0) m.set(e.date, e);
    return m;
  }, [entries]);
  const scoreOf = useMemo(() => new Map(insights.scores.map((s) => [s.date, s.score])), [insights.scores]);

  const nights = useMemo(() => {
    const out: { iso: string; rec: SleepRecord | null; dur: number; score: number | null; band: ScoreBand | null }[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const iso = addDaysIso(todayIso, -i);
      const rec = byDate.get(iso) ?? null;
      const score = rec ? scoreOf.get(iso) ?? null : null;
      out.push({ iso, rec, dur: rec ? sleepMinutes(rec) : 0, score, band: score !== null ? scoreBand(score) : rec ? "fair" : null });
    }
    return out; // قدیمی به جدید
  }, [n, todayIso, byDate, scoreOf]);

  const lastWithRec = useMemo(() => [...nights].reverse().find((x) => x.rec)?.iso ?? null, [nights]);
  const activeIso = sel && nights.some((x) => x.iso === sel) ? sel : lastWithRec ?? todayIso;
  const active = nights.find((x) => x.iso === activeIso) ?? nights[nights.length - 1];

  // هندسه
  // فارسی: برچسب محور سمت راست و قدیمی‌ترین ستون راست؛ انگلیسی: محور چپ و قدیمی‌ترین چپ
  const en = isEn();
  const GW = 38; // ستون برچسب محور
  const PAD_L = 6;
  const plotW = width - GW - PAD_L;
  const cw = plotW / n;
  const bw = Math.max(4, Math.min(cw * 0.62, 20));
  const plotRight = en ? width - PAD_L : width - GW;
  const plotLeft = en ? GW : PAD_L;
  const axisX = en ? 2 : width - 2;
  const axisAnchor = en ? "start" : "end";
  const colX = (i: number) => (en ? plotLeft + i * cw : plotRight - (i + 1) * cw); // i=0 قدیمی‌ترین
  const colCx = (i: number) => colX(i) + cw / 2;

  const T_TOP = 10, T_H = 176; // خط زمانی
  const D_TOP = T_TOP + T_H + 34, D_H = 96; // مدت
  const LBL_Y = D_TOP + D_H + 16;
  const H = LBL_Y + (n === 7 ? 20 : 8);

  const tY = (min: number) => T_TOP + (min / AXIS_SPAN) * T_H;

  const bedT = hmToMin(target.sleep, 23 * 60);
  const wakeT = hmToMin(target.wake, 7 * 60);
  const tDur = (((wakeT - bedT) % 1440) + 1440) % 1440;
  const tSpan = timelineSpan(bedT, tDur, AXIS_START, AXIS_SPAN);

  const goalMin = insights.goalMin;
  const maxDur = nights.reduce((m, x) => Math.max(m, x.dur), 0);
  const dMax = Math.max(Math.ceil(Math.max(goalMin * 1.2, maxDur) / 120) * 120, 360);
  const dY = (min: number) => D_TOP + D_H - (Math.min(min, dMax) / dMax) * D_H;

  // میانگین نرم (پنجره‌ی سه‌تایی روی شب‌های ثبت‌شده)
  const avgPts = useMemo(() => {
    const vals: { i: number; v: number }[] = [];
    nights.forEach((x, i) => { if (x.rec) vals.push({ i, v: x.dur }); });
    return vals.map((p, k) => {
      const win = vals.slice(Math.max(0, k - 1), k + 2);
      const avg = win.reduce((s, q) => s + q.v, 0) / win.length;
      return { x: colX(p.i) + cw / 2, y: D_TOP + D_H - (Math.min(avg, dMax) / dMax) * D_H };
    });
  }, [nights, plotRight, plotLeft, en, cw, dMax, D_TOP, D_H]);

  const gridMins = [0, 240, 480, 720, 960];
  const durTicks: number[] = [];
  for (let m = 0; m <= dMax; m += 120) durTicks.push(m);

  const dayLabelStep = n === 7 ? 1 : 5;

  const pick = (iso: string) => {
    setSel(iso);
    onPick(iso);
  };

  const readDate = (iso: string) => {
    const j = jalaliParts(iso);
    return `${weekdayName(j.dow)} ${faNum(j.jd)} ${jMonthName(j.jm - 1)}`;
  };

  const animKey = `${range}-${nights.length}`;

  return (
    <section className="sl-card slc">
      <div className="sl-head-row">
        <h3 className="sl-card-title"><BarChart3 aria-hidden="true" />{tr("شب‌های اخیر", "Recent nights")}</h3>
        <SegmentedTabs<Range>
          className="slc-tabs"
          ariaLabel={tr("بازه‌ی نمودار", "Chart range")}
          active={range}
          onChange={setRange}
          options={[
            { value: "7", label: tr("7 شب", "7 nights") },
            { value: "30", label: tr("30 شب", "30 nights") },
          ]}
        />
      </div>

      <div className="slc-wrap" ref={wrapRef}>
        <svg
          key={animKey}
          className="slc-svg"
          width={width}
          height={H}
          viewBox={`0 0 ${width} ${H}`}
          role="group"
          aria-label={tr("نمودار ساعت خواب و مدت خواب شب‌های اخیر", "Chart of bedtimes and sleep duration for recent nights")}
        >
          {/* خط زمانی: بازه‌ی هدف و شبکه */}
          <rect className="slc-goal-band" x={plotLeft} y={tY(tSpan.from)} width={plotW} height={Math.max(0, tY(tSpan.to) - tY(tSpan.from))} rx={6} />
          {gridMins.map((m) => (
            <g key={m}>
              <line className="slc-grid" x1={plotLeft} x2={plotRight} y1={tY(m)} y2={tY(m)} />
              <text className="slc-axis" x={axisX} y={tY(m) + 3.5} textAnchor={axisAnchor}>{minutesToClock(AXIS_START + m)}</text>
            </g>
          ))}
          <line className="slc-target" x1={plotLeft} x2={plotRight} y1={tY(tSpan.from)} y2={tY(tSpan.from)} />
          <line className="slc-target" x1={plotLeft} x2={plotRight} y1={tY(tSpan.to)} y2={tY(tSpan.to)} />

          {/* مدت: شبکه و خط هدف */}
          {durTicks.map((m) => (
            <g key={m}>
              <line className="slc-grid" x1={plotLeft} x2={plotRight} y1={dY(m)} y2={dY(m)} />
              <text className="slc-axis" x={axisX} y={dY(m) + 3.5} textAnchor={axisAnchor}>{tr(`${faNum(m / 60)} س`, `${m / 60} h`)}</text>
            </g>
          ))}
          <line className="slc-target" x1={plotLeft} x2={plotRight} y1={dY(goalMin)} y2={dY(goalMin)} />

          {/* ستون‌ها */}
          {nights.map((x, i) => {
            const cx = colCx(i);
            const isSel = x.iso === activeIso;
            const delay = { ["--d" as string]: `${i * 22}ms` } as React.CSSProperties;
            let capsule: React.ReactNode = <circle className="slc-dot" cx={cx} cy={tY(AXIS_SPAN / 2)} r={1.6} />;
            let bar: React.ReactNode = (
              <rect className="slc-empty" x={cx - bw / 2} y={D_TOP + D_H - 4} width={bw} height={4} rx={2} />
            );
            if (x.rec && x.band) {
              const sp = timelineSpan(minuteOfDay(x.rec.sleptAt), x.dur, AXIS_START, AXIS_SPAN);
              const y1 = tY(sp.from), y2 = tY(sp.to);
              capsule = (
                <rect className={`slc-cap-bar slc-b-${x.band}`} style={delay} x={cx - bw / 2} y={y1} width={bw} height={Math.max(bw, y2 - y1)} rx={bw / 2} />
              );
              const bh = Math.max(3, D_TOP + D_H - dY(x.dur));
              bar = (
                <rect className={`slc-dur-bar slc-b-${x.band}`} style={delay} x={cx - bw / 2} y={D_TOP + D_H - bh} width={bw} height={bh} rx={Math.min(4, bw / 2)} />
              );
            }
            const label = x.rec ? `${readDate(x.iso)}، ${durationLabel(x.dur)}` : tr(`${readDate(x.iso)}، بدون ثبت`, `${readDate(x.iso)}, not logged`);
            return (
              <g
                key={x.iso}
                className={`slc-col${isSel ? " is-sel" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={label}
                onClick={() => pick(x.iso)}
                onPointerEnter={(e) => { if (e.pointerType === "mouse") setSel(x.iso); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(x.iso); }
                }}
              >
                <rect className="slc-hit" x={colX(i)} y={T_TOP - 4} width={cw} height={H - T_TOP} />
                <rect className="slc-sel" x={colX(i) + 1} y={T_TOP - 4} width={Math.max(2, cw - 2)} height={LBL_Y - T_TOP - 2} rx={8} />
                {capsule}
                {bar}
              </g>
            );
          })}

          {/* میانگین نرم */}
          {avgPts.length >= 3 && <path className="slc-avg" d={smoothPath(avgPts)} pathLength={1} />}

          {/* برچسب روزها */}
          {nights.map((x, i) => {
            const fromEnd = n - 1 - i;
            if (fromEnd % dayLabelStep !== 0) return null;
            const j = jalaliParts(x.iso);
            return (
              <text key={x.iso} className={`slc-day${x.iso === todayIso ? " is-today" : ""}`} x={colCx(i)} y={LBL_Y} textAnchor="middle">
                {n === 7 ? weekdayShort(j.dow) : faNum(j.jd)}
              </text>
            );
          })}
          {n === 7 && nights.map((x, i) => (
            <text key={"d" + x.iso} className="slc-day-sub" x={colCx(i)} y={LBL_Y + 12} textAnchor="middle">{faNum(jalaliParts(x.iso).jd)}</text>
          ))}
        </svg>
      </div>

      <div className="slc-legend" aria-hidden="true">
        <span><i className="slc-sw slc-sw-line" />{tr("ساعت هدف", "Target time")}</span>
        <span><i className="slc-sw slc-sw-avg" />{tr("میانگین مدت", "Average duration")}</span>
        {(["great", "good", "fair", "poor"] as ScoreBand[]).map((b) => (
          <span key={b}><i className={`slc-sw slc-sw-${b}`} />{scoreBandLabel(b)}</span>
        ))}
      </div>

      <div className="slc-read" aria-live="polite">
        <b className="slc-read-date">{readDate(active.iso)}</b>
        {active.rec && active.band ? (
          <>
            <span className="slc-read-item"><em>{tr("خواب", "Sleep")}</em>{faNum(clockOf(active.rec.sleptAt))}</span>
            <span className="slc-read-item"><em>{tr("بیداری", "Wake")}</em>{faNum(clockOf(active.rec.wokeAt))}</span>
            <span className="slc-read-item"><em>{tr("مدت", "Duration")}</em>{durationLabel(active.dur)}</span>
            <span className={`slc-read-item slp-c-${active.band}`}>
              <em>{tr("امتیاز", "Score")}</em>{faNum(active.score ?? 0)} ({scoreBandLabel(active.band)})
            </span>
          </>
        ) : (
          <span className="sl-sub">{tr("ثبتی برای این شب نیست؛ بزن تا ثبت کنی.", "Nothing logged for this night; tap to log it.")}</span>
        )}
      </div>
    </section>
  );
}
