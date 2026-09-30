"use client";

// نقشه‌ی ثبات — ۱۳ هفته‌ی اخیرِ روتین، هر خانه یک روز (شنبه بالا). روزِ بی‌برنامه
// خاکستریِ خنثی‌ست نه «شکست». ورودِ خانه‌ها یک موجِ قطری با CSS ـه (نه JS
// per-cell) تا ۱۲۶ خانه هیچ هزینه‌ی رندری نداشته باشن.

import { useMemo, useState } from "react";
import { FA_WEEKDAY, J_MONTHS, faNum, toJalali } from "@/lib/jalali";
import { heatLevel, type HeatCell } from "@/lib/dashboardCompute";
import { BentoCard, CardHead, CountUp, Skel } from "./DashboardKit";

const ROW_LABELS = ["ش", "", "د", "", "چ", "", "ج"];

function jalaliOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return toJalali(y, m, d);
}

export function DashboardHeatmap({ heat, streak, ready, memberSince }: { heat: HeatCell[][]; streak: number | null; ready: boolean; memberSince?: string | null }) {
  // روزهای قبل از ساختِ حساب «شکست» نیستن — خنثی نشون داده می‌شن (مثلِ روزِ بی‌برنامه)
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

  // اسمِ ماهِ شمسی بالای ستونی که ماه عوض می‌شه
  const monthMarks = useMemo(() => {
    let prev = -1;
    return heat.map((col) => {
      const jm = jalaliOf(col[0].iso)[1];
      const mark = jm !== prev ? J_MONTHS[jm - 1] : "";
      prev = jm;
      return mark;
    });
  }, [heat]);

  const hoverLabel = hover
    ? (() => {
        const [, jm, jd] = jalaliOf(hover.iso);
        const [y, m, d] = hover.iso.split("-").map(Number);
        const wd = FA_WEEKDAY[new Date(y, m - 1, d).getDay()];
        return `${wd} ${faNum(jd)} ${J_MONTHS[jm - 1]} — ${hover.future ? "هنوز نرسیده" : sinceIso && hover.iso < sinceIso ? "قبل از عضویت" : hover.pct === null ? "بدونِ برنامه" : `${faNum(hover.pct)}٪ انجام`}`;
      })()
    : "روی هر روز بایست تا جزئیاتش رو ببینی";

  return (
    <BentoCard area="heat" className="db-heat" label="نقشه‌ی ثبات">
      <CardHead icon="chart" title="نقشه‌ی ثبات" href="/weekly" hrefLabel="تاریخچه" />
      <div className="db-heat-stats">
        <div><span className="db-stat-label">استریکِ فعلی</span><b className="db-stat-val">{streak === null ? <Skel w={28} h={16} /> : <CountUp value={streak} />}<small> روز</small></b></div>
        <div><span className="db-stat-label">بهترین رکورد</span><b className="db-stat-val"><CountUp value={summary.best} /><small> روز</small></b></div>
        <div><span className="db-stat-label">میانگینِ ۳۰ روز</span><b className="db-stat-val"><CountUp value={summary.avg} suffix="٪" /></b></div>
        <div><span className="db-stat-label">روزهای کامل</span><b className="db-stat-val"><CountUp value={summary.perfect} /></b></div>
      </div>

      <div className="db-heat-scroll">
        {!ready ? (
          <Skel w="100%" h={120} r={12} />
        ) : (
          <div className="db-heat-grid" onMouseLeave={() => setHover(null)} style={{ ["--cols" as any]: heat.length }}>
            <div className="db-heat-rows" aria-hidden="true">{ROW_LABELS.map((l, i) => <span key={i}>{l}</span>)}</div>
            {heat.map((col, ci) => (
              <div key={ci} className="db-heat-col">
                <span className="db-heat-month">{monthMarks[ci]}</span>
                {col.map((c, ri) => {
                  const lv = sinceIso && c.iso < sinceIso ? -1 : heatLevel(c.pct);
                  return (
                    <span
                      key={c.iso}
                      className={`db-heat-cell lv${lv}${c.future ? " is-future" : ""}${c.today ? " is-today" : ""}`}
                      style={{ ["--d" as any]: ci + ri }}
                      onMouseEnter={() => setHover(c)}
                      onClick={() => setHover(c)}
                      role="img"
                      aria-label={c.iso}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="db-heat-foot">
        <span className="db-heat-hover">{hoverLabel}</span>
        <span className="db-heat-legend" aria-hidden="true">
          کم <i className="db-heat-cell lv0" /><i className="db-heat-cell lv1" /><i className="db-heat-cell lv2" /><i className="db-heat-cell lv3" /><i className="db-heat-cell lv4" /> کامل
        </span>
      </div>
    </BentoCard>
  );
}
