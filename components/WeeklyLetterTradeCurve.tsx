"use client";

// فصل «منحنی هفته» (فقط بخش ترید): منحنی تجمعی سود و زیان معامله‌ها به ترتیب
// بسته‌شدن، سایه‌ی بزرگ‌ترین افت، علامت بهترین/بدترین معامله و ردیف شاخص‌ها
// (سود خالص، نرخ برد، ضریب سود، امید ریاضی، R). رنگ سود و زیان از توکن‌های
// --pnl-*؛ خط و سطح فقط transform/opacity/pathLength انیمیت می‌شن.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { m as motion, useInView } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { CAL_WEEK_ORDER, weekdayShort } from "@/lib/jalali";
import { isEn, tr } from "@/lib/i18n";
import type { TradeWeek } from "@/lib/weeklyLetter/tradeWeek";
import { fmtMoney } from "@/lib/weeklyLetter/tradeWeekText";
import { WeeklyLetterChapterHead } from "./WeeklyLetterChapterHead";
import { Reveal, WL_EASE, useLite } from "./WeeklyLetterShared";
import { smoothPath } from "./WeeklyLetterUtils";
import { isolateNumbers } from "@/lib/weeklyAnalysis/bidi";

const H = 200;
const PAD_X = 16;
const PAD_T = 24;
const PAD_B = 28;

type Pt = { x: number; y: number };

export function TradeCurveChart({ trade, height = H }: { trade: TradeWeek; height?: number }) {
  const uid = useId().replace(/:/g, "");
  const lite = useLite();
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);
  const inView = useInView(boxRef, { once: true, margin: "0px 0px -8% 0px" });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const set = () => setW(Math.floor(el.getBoundingClientRect().width));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const model = useMemo(() => {
    const c = trade.curve;
    const n = c.length;
    const vs = c.map((p) => p.v);
    let lo = Math.min(0, ...vs);
    let hi = Math.max(0, ...vs);
    if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const pad = (hi - lo) * 0.08;
    lo -= pad;
    hi += pad;
    const top = PAD_T;
    const bottom = height - PAD_B;
    const yAt = (v: number) => top + ((hi - v) / (hi - lo)) * (bottom - top);
    const xRaw = (i: number) => PAD_X + (n === 1 ? (W - 2 * PAD_X) / 2 : (i * (W - 2 * PAD_X)) / (n - 1));
    // RTL: زمان از راست به چپ (مثل نمودار روند هفته‌ها)؛ LTR برعکس
    const xAt = (i: number) => (isEn() ? xRaw(i) : W - xRaw(i));
    const pts: Pt[] = c.map((p, i) => ({ x: xAt(i), y: yAt(p.v) }));
    const y0 = yAt(0);
    // برچسب روزها: میانگین x نقطه‌های هر روز
    const byDay = new Map<number, number[]>();
    c.forEach((p, i) => { if (i === 0 && n > 1) return; byDay.set(p.d, [...(byDay.get(p.d) ?? []), xAt(i)]); });
    const dayLabels = [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([d, xs]) => ({ d, x: xs.reduce((a, b) => a + b, 0) / xs.length }));
    return { pts, y0, top, bottom, dayLabels };
  }, [trade.curve, W, height]);

  const { pts, y0, top, bottom } = model;
  const line = pts.length >= 2 ? smoothPath(pts) : "";
  const area = pts.length >= 2 ? `${line} L${pts[pts.length - 1].x} ${y0} L${pts[0].x} ${y0} Z` : "";
  const dd = trade.ddRange && pts[trade.ddRange[0]] && pts[trade.ddRange[1]] ? trade.ddRange : null;
  const last = pts[pts.length - 1];
  const up = trade.net >= 0;

  return (
    <div ref={boxRef} className="wl-tw-chart" style={{ height }}>
      {W > 0 && pts.length >= 2 && (
        <svg viewBox={`0 0 ${W} ${height}`} width={W} height={height} className="wl-tw-svg" role="img"
          aria-label={tr(`منحنی سود و زیان هفته، ${fmtMoney(trade.net, trade.currency)}`, `Weekly P&L curve, ${fmtMoney(trade.net, trade.currency)}`)}>
          <defs>
            <linearGradient id={`tw-w${uid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--pnl-win)" stopOpacity=".38" />
              <stop offset="100%" stopColor="var(--pnl-win)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`tw-l${uid}`} x1="0" x2="0" y1="1" y2="0">
              <stop offset="0%" stopColor="var(--pnl-loss)" stopOpacity=".38" />
              <stop offset="100%" stopColor="var(--pnl-loss)" stopOpacity="0" />
            </linearGradient>
            <clipPath id={`tw-ca${uid}`}><rect x="0" y="0" width={W} height={Math.max(0, y0)} /></clipPath>
            <clipPath id={`tw-cb${uid}`}><rect x="0" y={y0} width={W} height={Math.max(0, height - y0)} /></clipPath>
          </defs>

          {dd && (
            <g aria-hidden="true">
              <rect
                x={Math.min(pts[dd[0]].x, pts[dd[1]].x)} y={top - 8}
                width={Math.max(2, Math.abs(pts[dd[1]].x - pts[dd[0]].x))} height={bottom - top + 8}
                className="wl-tw-dd"
              />
            </g>
          )}

          <line x1={PAD_X} x2={W - PAD_X} y1={y0} y2={y0} className="wl-tw-zero" />

          <motion.g initial={{ opacity: 0 }} animate={{ opacity: inView ? 1 : 0 }} transition={{ duration: lite ? 0.2 : 0.9, delay: lite ? 0 : 0.45 }}>
            <path d={area} fill={`url(#tw-w${uid})`} clipPath={`url(#tw-ca${uid})`} />
            <path d={area} fill={`url(#tw-l${uid})`} clipPath={`url(#tw-cb${uid})`} />
          </motion.g>
          {(["a", "b"] as const).map((k) => (
            <motion.path
              key={k}
              d={line}
              fill="none"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath={`url(#tw-c${k}${uid})`}
              className={k === "a" ? "wl-tw-line is-win" : "wl-tw-line is-loss"}
              initial={{ pathLength: lite ? 1 : 0 }}
              animate={{ pathLength: inView ? 1 : lite ? 1 : 0 }}
              transition={{ duration: lite ? 0 : 1.3, ease: WL_EASE as never }}
            />
          ))}

          {trade.bestIdx != null && pts[trade.bestIdx] && (
            <Marker p={pts[trade.bestIdx]} tone="win" label={trade.best ? fmtMoney(trade.best.pnl, null) : ""} W={W} inView={inView} lite={lite} />
          )}
          {trade.worstIdx != null && pts[trade.worstIdx] && (
            <Marker p={pts[trade.worstIdx]} tone="loss" label={trade.worst ? fmtMoney(trade.worst.pnl, null) : ""} W={W} inView={inView} lite={lite} below />
          )}
          <motion.circle
            cx={last.x} cy={last.y} r={5}
            className={`wl-tw-end ${up ? "is-win" : "is-loss"}`}
            initial={{ opacity: 0 }} animate={{ opacity: inView ? 1 : 0 }} transition={{ duration: 0.3, delay: lite ? 0 : 1.2 }}
          />

          {model.dayLabels.map((l) => (
            <text key={l.d} x={l.x} y={height - 8} textAnchor="middle" className="wl-tw-day">{weekdayShort(CAL_WEEK_ORDER[l.d])}</text>
          ))}
        </svg>
      )}
    </div>
  );
}

function Marker({ p, tone, label, W, inView, lite, below }: { p: Pt; tone: "win" | "loss"; label: string; W: number; inView: boolean; lite: boolean; below?: boolean }) {
  const anchor = p.x < 44 ? "start" : p.x > W - 44 ? "end" : "middle";
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: inView ? 1 : 0 }} transition={{ duration: 0.35, delay: lite ? 0 : 1 }}>
      <circle cx={p.x} cy={p.y} r={8} className={`wl-tw-halo is-${tone}`} />
      <circle cx={p.x} cy={p.y} r={4} className={`wl-tw-mark is-${tone}`} />
      {label && (
        <text x={p.x} y={below ? p.y + 21 : p.y - 13} textAnchor={anchor} className={`wl-tw-mlabel is-${tone}`}>{label}</text>
      )}
    </motion.g>
  );
}

function Kpi({ label, value, tone, hint }: { label: string; value: string; tone?: "good" | "bad"; hint?: string | null }) {
  return (
    <div className="wl-tw-kpi">
      <span className="wl-tw-kpi-l">{label}</span>
      <b className={`wl-tw-kpi-v${tone ? ` is-${tone}` : ""}`} dir="ltr">{value}</b>
      {hint ? <small className="wl-tw-kpi-h">{hint}</small> : null}
    </div>
  );
}

export function WeeklyLetterTradeCurve({ trade, no }: { trade: TradeWeek; no?: number }) {
  const cur = trade.currency;
  const p = trade.prev;
  const netHint = p && p.net != null && cur
    ? (() => {
        const d = Math.round((trade.net - p.net) * 100) / 100;
        return d === 0 ? tr("هم‌سطح هفته‌ی قبل", "level with last week") : tr(`${fmtMoney(Math.abs(d), null, false)} ${d > 0 ? "بیشتر" : "کمتر"} از هفته‌ی قبل`, `${fmtMoney(Math.abs(d), null, false)} ${d > 0 ? "above" : "below"} last week`);
      })()
    : null;
  const wrHint = p && p.winRate != null && trade.winRate != null && p.winRate !== trade.winRate
    ? tr(`${Math.abs(trade.winRate - p.winRate)}% ${trade.winRate > p.winRate ? "بالاتر" : "پایین‌تر"} از قبل`, `${Math.abs(trade.winRate - p.winRate)}% ${trade.winRate > p.winRate ? "up" : "down"} on last week`)
    : trade.wins + trade.losses > 0 ? tr(`${trade.wins} برد، ${trade.losses} باخت`, `${trade.wins} won, ${trade.losses} lost`) : null;

  return (
    <section id="trade-curve" className="wl-ch">
      <WeeklyLetterChapterHead icon={TrendingUp} title={tr("منحنی هفته", "Week curve")} no={no} />
      <Reveal className="wl-card wl-tw-card">
        <div className="wl-tw-head">
          <span className="wl-tw-cap">{tr("سود و زیان تجمعی", "Cumulative P&L")}</span>
          <b className={`wl-tw-net ${trade.net > 0 ? "is-win" : trade.net < 0 ? "is-loss" : ""}`} dir="ltr">{fmtMoney(trade.net, cur)}</b>
          {netHint && <small className="wl-tw-kpi-h wl-tw-head-hint">{netHint}</small>}
        </div>
        {trade.curve.length >= 2 && <TradeCurveChart trade={trade} />}
        {trade.maxDrawdown > 0 && (
          <p className="wl-tw-note">
            <i className="wl-tw-swatch" aria-hidden="true" />
            {isolateNumbers(tr(`بیشترین افت هفته ${fmtMoney(trade.maxDrawdown, cur, false)}${trade.maxDrawdownPct != null ? ` (${trade.maxDrawdownPct}% قله)` : ""}`, `Max drawdown of the week: ${fmtMoney(trade.maxDrawdown, cur, false)}${trade.maxDrawdownPct != null ? ` (${trade.maxDrawdownPct}% of the peak)` : ""}`))}
          </p>
        )}
        <div className="wl-tw-kpis">
          <Kpi label={tr("نرخ برد", "Win rate")} value={trade.winRate == null ? "-" : `${trade.winRate}%`} tone={trade.winRate == null ? undefined : trade.winRate >= 50 ? "good" : "bad"} hint={wrHint} />
          <Kpi label={tr("ضریب سود", "Profit factor")} value={trade.profitFactor == null ? "-" : `${trade.profitFactor}`} tone={trade.profitFactor == null ? undefined : trade.profitFactor >= 1 ? "good" : "bad"} hint={trade.avgWin != null && trade.avgLoss != null ? tr("سود به ضرر", "gains vs losses") : null} />
          <Kpi label={`${tr("امید ریاضی", "Expectancy")}${cur ? ` (${cur})` : ""}`} value={trade.expectancy == null ? "-" : fmtMoney(trade.expectancy, null)} tone={trade.expectancy == null ? undefined : trade.expectancy > 0 ? "good" : trade.expectancy < 0 ? "bad" : undefined} hint={tr("به‌ازای هر معامله", "per trade")} />
          {trade.totalR != null && <Kpi label={tr("جمع R", "Total R")} value={`${trade.totalR > 0 ? "+" : ""}${trade.totalR}R`} tone={trade.totalR > 0 ? "good" : trade.totalR < 0 ? "bad" : undefined} hint={trade.avgR != null ? tr(`میانگین ${trade.avgR}R`, `avg ${trade.avgR}R`) : null} />}
        </div>
        {(trade.open > 0 || trade.mixed) && (
          <p className="wl-tw-foot">
            {trade.open > 0 && tr(`${trade.open} معامله‌ی باز هنوز توی عددها نیست. `, `${trade.open} open ${trade.open === 1 ? "trade is" : "trades are"} not in the numbers yet. `)}
            {trade.mixed && tr(`چند ارز داشتی؛ فقط ${cur} حساب شده.`, `You traded several currencies; only ${cur} is counted.`)}
          </p>
        )}
      </Reveal>
    </section>
  );
}

