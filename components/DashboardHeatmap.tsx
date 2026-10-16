"use client";

// نقشه‌ی ثبات — شبکه‌ی فشرده‌ی مربع‌های ریز به سبک نمودار فعالیت گیت‌هاب:
// هر ستون یک هفته (شنبه بالا)، جدیدترین هفته در انتهای خط (RTL). فقط از
// داده‌ی روزانه‌ای که همراه صفحه اومده (bootstrap ۹۰ روزه + تیک‌های زنده)
// ساخته می‌شه — هیچ درخواست جدایی نمی‌زنه. روز بی‌برنامه و روزهای قبل از
// عضویت خنثی‌ان نه «شکست».

import { useMemo, useState } from "react";
import { weekdayName, weekdayShort, jMonthName, faNum, toJalali } from "@/lib/jalali";
import { heatLabelledRows, heatMonthMarks, heatRowWeekdays } from "@/lib/dashboardHeat";
import { heatLevel, type HeatCell } from "@/lib/dashboardCompute";
import { BentoCard, CardHead, CountUp, Skel } from "./DashboardKit";
import { tr } from "@/lib/i18n";

const dayUnit = (n: number) => tr("روز", n === 1 ? "day" : "days");

function jalaliOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return toJalali(y, m, d);
}

export function DashboardHeatmap({ heat, streak, ready, memberSince }: { heat: HeatCell[][]; streak: number | null; ready: boolean; memberSince?: string | null }) {
  const sinceIso = memberSince ? memberSince.slice(0, 10) : null;
  const [hover, setHover] = useState<HeatCell | null>(null);

  const summary = useMemo(() => {
    const flat = heat.flat().filter((c) => !c.future && (!sinceIso || c.iso >= sinceIso));
    const last30 = flat.slice(-30).filter((c) => c.pct !== null);
    const avg = last30.length ? Math.round(last30.reduce((s, c) => s + (c.pct ?? 0), 0) / last30.length) : 0;
    const perfect = flat.filter((c) => c.pct === 100).length;
    let best = 0, run = 0;
    for (const c of flat) {
      if (c.pct === null) continue;
      if (c.pct === 100) { run++; best = Math.max(best, run); } else if (!c.today) run = 0;
    }
    return { avg, perfect, best };
  }, [heat, sinceIso]);

  // اسم ماه شمسی بالای اولین ستونی که روز ۱ ماه توشه (مثل گیت‌هاب)؛ منطق در lib/dashboardHeat.ts
  const monthMarks = useMemo(() => heatMonthMarks(heat, jMonthName), [heat]);
  // برچسب روز هفته از تاریخ واقعی هر ردیف (شنبه بالا)؛ یکی در میان تا خوانا بمونه
  const dayMarks = useMemo(() => {
    const wd = heatRowWeekdays(heat);
    return heatLabelledRows().map((ri) => ({ ri, label: weekdayShort(wd[ri]) }));
  }, [heat]);

  const levelOf = (c: HeatCell) => (sinceIso && c.iso < sinceIso ? -1 : heatLevel(c.pct));

  const hoverLabel = (() => {
    if (!hover) return tr("روی هر خانه بایست", "Hover over a cell");
    const [, jm, jd] = jalaliOf(hover.iso);
    const [y, m, d] = hover.iso.split("-").map(Number);
    const wd = weekdayName(new Date(y, m - 1, d).getDay());
    const state = sinceIso && hover.iso < sinceIso ? tr("قبل از عضویت", "Before joining") : hover.pct === null ? tr("بدون برنامه", "No programs") : `${faNum(hover.pct)}${tr("٪", "%")}`;
    return `${wd} ${faNum(jd)} ${jMonthName(jm - 1)} · ${state}`;
  })();

  return (
    <BentoCard area="heat" className="db-heat" label={tr("نقشه‌ی ثبات", "Consistency map")}>
      <CardHead icon="chart" title={tr("نقشه‌ی ثبات", "Consistency map")} href="/weekly" hrefLabel={tr("برنامه", "Routine")} />

      <div className="db-heat-body">
        <div className="db-heat-wrap" style={{ ["--cols" as any]: heat.length || 13 }}>
          {!ready ? (
            <Skel w="100%" h={150} r={10} />
          ) : (
            <div className="db-heat-grid" onMouseLeave={() => setHover(null)}>
              {monthMarks.map((m) => (
                <span key={`m${m.month}`} className="db-heat-month" style={{ gridColumn: `${m.col + 2} / span ${m.span}` }}>{m.label}</span>
              ))}
              {dayMarks.map((d) => (
                <span key={`r${d.ri}`} className="db-heat-day" style={{ gridRow: d.ri + 2 }} aria-hidden="true">{d.label}</span>
              ))}
              {heat.map((col, ci) =>
                col.map((c, ri) => (
                  <span
                    key={c.iso}
                    className={`db-heat-cell lv${levelOf(c)}${c.future ? " is-future" : ""}${c.today ? " is-today" : ""}${hover?.iso === c.iso ? " is-on" : ""}`}
                    style={{ gridColumn: ci + 2, gridRow: ri + 2, ["--d" as any]: ci + ri }}
                    onMouseEnter={c.future ? undefined : () => setHover(c)}
                    onClick={c.future ? undefined : () => setHover(c)}
                    role="img"
                    aria-label={c.iso}
                  />
                ))
              )}
            </div>
          )}
          <div className="db-heat-foot">
            <span className="db-heat-hover">{hoverLabel}</span>
            <span className="db-heat-legend" aria-hidden="true">
              {tr("کم", "Less")} <i className="db-heat-cell lv0" /><i className="db-heat-cell lv1" /><i className="db-heat-cell lv2" /><i className="db-heat-cell lv3" /><i className="db-heat-cell lv4" /> {tr("زیاد", "More")}
            </span>
          </div>
        </div>

        <dl className="db-heat-stats">
          <div><dt>{tr("استریک فعلی", "Current streak")}</dt><dd>{streak === null ? <Skel w={22} h={13} /> : <CountUp value={streak} />}<small> {dayUnit(streak ?? 0)}</small></dd></div>
          <div><dt>{tr("بهترین رکورد", "Best streak")}</dt><dd><CountUp value={summary.best} /><small> {dayUnit(summary.best)}</small></dd></div>
          <div><dt>{tr("میانگین 30 روز", "30-day avg")}</dt><dd><CountUp value={summary.avg} suffix={tr("٪", "%")} /></dd></div>
          <div><dt>{tr("روزهای کامل", "Perfect days")}</dt><dd><CountUp value={summary.perfect} /></dd></div>
        </dl>
      </div>
    </BentoCard>
  );
}
