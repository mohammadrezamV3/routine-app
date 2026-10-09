"use client";

// نقشه‌ی ثبات — شبکه‌ی فشرده‌ی مربع‌های ریز به سبک نمودار فعالیت گیت‌هاب:
// هر ستون یک هفته (شنبه بالا)، جدیدترین هفته در انتهای خط (RTL). فقط از
// داده‌ی روزانه‌ای که همراه صفحه اومده (bootstrap ۹۰ روزه + تیک‌های زنده)
// ساخته می‌شه — هیچ درخواست جدایی نمی‌زنه. روز بی‌برنامه و روزهای قبل از
// عضویت خنثی‌ان نه «شکست».

import { useMemo, useState } from "react";
import { weekdayName, jMonthName, faNum, toJalali } from "@/lib/jalali";
import { heatLevel, type HeatCell } from "@/lib/dashboardCompute";
import { BentoCard, CardHead, CountUp, Skel } from "./DashboardKit";
import { tr, isEn } from "@/lib/i18n";

const rowLabels = () => (isEn() ? ["Sa", "", "Mo", "", "We", "", "Fr"] : ["ش", "", "د", "", "چ", "", "ج"]);
/** حداقل فاصله‌ی ستونی بین دو اسم ماه تا روی هم نیفتن */
const MONTH_GAP = 3;

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

  // اسم ماه شمسی بالای اولین ستونی که روز ۱ ماه توشه (مثل گیت‌هاب)؛ اسمی که
  // به قبلی خیلی نزدیکه حذف می‌شه
  const monthMarks = useMemo(() => {
    const marks: string[] = heat.map(() => "");
    let last = -MONTH_GAP;
    heat.forEach((col, ci) => {
      const first = ci === 0 ? col[0] : col.find((c) => jalaliOf(c.iso)[2] === 1);
      if (!first) return;
      const jm = jalaliOf(first.iso)[1];
      if (ci === 0) {
        // ستون اول فقط وقتی اسم می‌گیره که ماه بعدی بلافاصله شروع نشه
        const next = heat.slice(1, MONTH_GAP).some((c2) => c2.some((c) => jalaliOf(c.iso)[2] === 1));
        if (next) return;
      } else if (ci - last < MONTH_GAP) return;
      marks[ci] = jMonthName(jm - 1);
      last = ci;
    });
    return marks;
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
              {monthMarks.map((m, ci) => (
                <span key={`m${ci}`} className="db-heat-month" style={{ gridColumn: ci + 2 }}>{m}</span>
              ))}
              {rowLabels().map((l, ri) => (
                <span key={`r${ri}`} className="db-heat-day" style={{ gridRow: ri + 2 }} aria-hidden="true">{l}</span>
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
          <div><dt>{tr("میانگین 30 روز", "30-day average")}</dt><dd><CountUp value={summary.avg} suffix={tr("٪", "%")} /></dd></div>
          <div><dt>{tr("روزهای کامل", "Perfect days")}</dt><dd><CountUp value={summary.perfect} /></dd></div>
        </dl>
      </div>
    </BentoCard>
  );
}
