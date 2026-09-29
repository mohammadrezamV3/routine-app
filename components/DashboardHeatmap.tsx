"use client";

// نقشه‌ی ثبات — سالانه و ماهانه، با تقویمِ شمسی.
//   • بالای نقشه: انتخابِ سال (با فلش، از سالِ عضویت تا امسال — با رسیدنِ نوروز
//     خودکار نقشه‌ی سالِ تازه باز می‌شه) و ۱۲ ماهِ همون سال؛ هر ماه یک خانه‌ست که
//     رنگش میانگینِ انجامِ اون ماهه و با زدنش نقشه‌ی همون ماه باز می‌شه.
//   • نقشه‌ی ماه: تقویمِ روزهای ماه (هفته از شنبه)، هر روز رنگِ درصدِ انجامش.
//     روزِ بدونِ برنامه خنثی‌ست (نه قرمز) — روزِ بی‌برنامه «شکست» نیست.
// داده: ۹۰ روزِ اخیر از قبل همراهِ صفحه هست (bootstrap، با تیک‌های زنده‌ی امروز)؛
// بقیه‌ی سال با *یک* درخواستِ getDailyRange از lib/storage.ts (همون قراردادِ
// persistence) و فقط برای سالی که باز شده گرفته می‌شه.

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FA_WEEKDAY, J_MONTHS, faNum } from "@/lib/jalali";
import { getDailyRange, type DailyRecord } from "@/lib/storage";
import type { ScheduleOpts } from "@/lib/schedule";
import { bestRun, buildMonth, heatLevel, jalaliOfIso, jalaliYearRange, type MonthCell, type MonthMap } from "@/lib/dashboardCompute";
import { BentoCard, CardHead, CountUp, D_EASE, Skel } from "./DashboardKit";
import { DashIcon } from "./DashboardIcons";

const WEEK_HEAD = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function DashboardHeatmap({
  opts,
  daily,
  todayIso,
  streak,
  ready,
  memberSince,
}: {
  opts: ScheduleOpts;
  daily: Record<string, DailyRecord>;
  todayIso: string;
  streak: number | null;
  ready: boolean;
  memberSince?: string | null;
}) {
  const [ty, tm] = jalaliOfIso(todayIso);
  const minYear = useMemo(() => {
    if (!memberSince) return ty - 1;
    const d = new Date(memberSince);
    if (Number.isNaN(d.getTime())) return ty - 1;
    const [y] = jalaliOfIso(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    return Math.min(y, ty);
  }, [memberSince, ty]);

  const [year, setYear] = useState(ty);
  const [month, setMonth] = useState(tm);
  const [dir, setDir] = useState(0);
  const [hover, setHover] = useState<MonthCell | null>(null);
  // تیک‌های کلِ سال — به‌ازای هر سالِ بازشده یک بار
  const [yearData, setYearData] = useState<Record<number, Record<string, DailyRecord>>>({});
  const [loadingYear, setLoadingYear] = useState<number | null>(null);

  // نوروز رسید (صفحه باز مونده) → سال/ماهِ جاری جلو می‌ره
  useEffect(() => { setYear(ty); setMonth(tm); }, [ty, tm]);

  useEffect(() => {
    if (!ready || yearData[year]) return;
    const range = jalaliYearRange(year, todayIso);
    if (!range) return;
    let alive = true;
    setLoadingYear(year);
    getDailyRange(range.from, range.to)
      .then((m) => { if (alive) setYearData((p) => ({ ...p, [year]: m })); })
      .catch(() => { if (alive) setYearData((p) => ({ ...p, [year]: {} })); })
      .finally(() => { if (alive) setLoadingYear((y) => (y === year ? null : y)); });
    return () => { alive = false; };
  }, [ready, year, todayIso, yearData]);

  const yearLoaded = !!yearData[year];
  // تیک‌های ۹۰ روزِ اخیر تازه‌ترن (شاملِ تیکِ همین الانِ کاربر)، پس روی داده‌ی سال می‌شینن
  const merged = useMemo(() => ({ ...(yearData[year] ?? {}), ...daily }), [yearData, year, daily]);

  const months: (MonthMap | null)[] = useMemo(() => {
    if (!ready) return Array(12).fill(null);
    return Array.from({ length: 12 }, (_, i) => {
      const jm = i + 1;
      if (year === ty && jm > tm) return null;
      return buildMonth(year, jm, todayIso, opts, merged);
    });
  }, [ready, year, ty, tm, todayIso, opts, merged]);

  const selected = months[month - 1];
  const best = useMemo(() => bestRun(months.flatMap((m) => m?.cells ?? [])), [months]);
  // ماهی که هنوز داده‌ی کاملش نرسیده (قدیمی‌تر از ۹۰ روزِ اخیر) اسکلت نشون می‌ده، نه ۰٪ِ گمراه‌کننده
  const recentFrom = useMemo(() => {
    const [y, m, d] = todayIso.split("-").map(Number);
    const dt = new Date(y, m - 1, d - 84);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }, [todayIso]);
  const monthReady = (m: MonthMap | null) => !!m && (yearLoaded || (m.cells[0]?.iso ?? "") >= recentFrom);

  function pickMonth(jm: number) {
    if (jm === month) return;
    setDir(jm > month ? 1 : -1);
    setMonth(jm);
    setHover(null);
  }
  function pickYear(y: number) {
    if (y < minYear || y > ty) return;
    setDir(y > year ? 1 : -1);
    setYear(y);
    setMonth(y === ty ? tm : 12);
    setHover(null);
  }

  const hoverLabel = hover
    ? (() => {
        const [y, m, d] = hover.iso.split("-").map(Number);
        const wd = FA_WEEKDAY[new Date(y, m - 1, d).getDay()];
        return `${wd} ${faNum(hover.jd)} ${J_MONTHS[month - 1]} — ${hover.future ? "هنوز نرسیده" : hover.pct === null ? "بدونِ برنامه" : `${faNum(hover.pct)}٪ انجام`}`;
      })()
    : selected && monthReady(selected)
      ? selected.tracked ? `${J_MONTHS[month - 1]} ${faNum(year)}: ${faNum(selected.tracked)} روزِ برنامه‌دار` : `${J_MONTHS[month - 1]} ${faNum(year)}: روزِ برنامه‌داری نبوده`
      : "روی هر روز بایست تا جزئیاتش رو ببینی";

  return (
    <BentoCard area="heat" className="db-heat" label="نقشه‌ی ثبات">
      <CardHead
        icon="chart"
        title="نقشه‌ی ثبات"
        extra={
          <div className="db-yr" role="group" aria-label="انتخابِ سال">
            <button type="button" className="db-yr-btn" onClick={() => pickYear(year - 1)} disabled={year <= minYear} aria-label="سالِ قبل">
              <DashIcon name="arrow" style={{ transform: "scaleX(-1)" }} />
            </button>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.b key={year} className="db-yr-num" initial={{ opacity: 0, y: dir >= 0 ? 8 : -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: dir >= 0 ? -8 : 8 }} transition={{ duration: 0.25, ease: D_EASE }}>
                {faNum(year)}
              </motion.b>
            </AnimatePresence>
            <button type="button" className="db-yr-btn" onClick={() => pickYear(year + 1)} disabled={year >= ty} aria-label="سالِ بعد">
              <DashIcon name="arrow" />
            </button>
          </div>
        }
      />

      {/* انتخابگرِ ماه: ۱۲ خانه‌ی سال، هرکدوم رنگِ میانگینِ همون ماه */}
      <div className="db-months" role="listbox" aria-label="انتخابِ ماه">
        {Array.from({ length: 12 }, (_, i) => {
          const jm = i + 1;
          const m = months[i];
          const future = year === ty && jm > tm;
          const ok = monthReady(m);
          const lv = future ? -2 : ok ? heatLevel(m!.avg) : -3;
          return (
            <button
              key={jm}
              type="button"
              role="option"
              aria-selected={jm === month}
              disabled={future}
              className={`db-mtile lv${lv}${jm === month ? " is-on" : ""}${year === ty && jm === tm ? " is-now" : ""}`}
              onClick={() => pickMonth(jm)}
              title={ok && m?.avg !== null && m ? `${J_MONTHS[i]}: ${faNum(m.avg ?? 0)}٪` : J_MONTHS[i]}
            >
              <span className="db-mtile-name">{J_MONTHS[i]}</span>
              <span className="db-mtile-val">{future ? "—" : !ok ? <Skel w={22} h={8} r={4} /> : m?.avg === null ? "·" : `${faNum(m!.avg!)}٪`}</span>
              <span className="db-mtile-bar"><i style={{ transform: `scaleX(${ok && m?.avg ? m.avg / 100 : 0})` }} /></span>
            </button>
          );
        })}
      </div>

      <div className="db-heat-body">
        <div className="db-heat-stats">
          <div><span className="db-stat-label">استریکِ فعلی</span><b className="db-stat-val">{streak === null ? <Skel w={28} h={16} /> : <CountUp value={streak} />}<small> روز</small></b></div>
          <div><span className="db-stat-label">بهترین رکوردِ {faNum(year)}</span><b className="db-stat-val">{yearLoaded ? <CountUp value={best} /> : <Skel w={28} h={16} />}<small> روز</small></b></div>
          <div><span className="db-stat-label">میانگینِ {J_MONTHS[month - 1]}</span><b className="db-stat-val">{selected && monthReady(selected) ? (selected.avg === null ? "—" : <CountUp value={selected.avg} suffix="٪" />) : <Skel w={36} h={16} />}</b></div>
          <div><span className="db-stat-label">روزهای کاملِ ماه</span><b className="db-stat-val">{selected && monthReady(selected) ? <CountUp value={selected.perfect} /> : <Skel w={24} h={16} />}</b></div>
        </div>

        <div className="db-mm">
          <div className="db-mm-head" aria-hidden="true">{WEEK_HEAD.map((w) => <span key={w}>{w}</span>)}</div>
          <div className="db-mm-stage">
            <AnimatePresence mode="wait" initial={false} custom={dir}>
              <motion.div
                key={`${year}-${month}`}
                className="db-mm-grid"
                initial={{ opacity: 0, x: dir > 0 ? -24 : dir < 0 ? 24 : 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir > 0 ? 24 : -24 }}
                transition={{ duration: 0.28, ease: D_EASE }}
                onMouseLeave={() => setHover(null)}
              >
                {!selected || !monthReady(selected) ? (
                  Array.from({ length: 35 }, (_, i) => <span key={i} className="db-mm-cell is-skel" />)
                ) : (
                  <>
                    {Array.from({ length: selected.lead }, (_, i) => <span key={`b${i}`} className="db-mm-cell is-blank" aria-hidden="true" />)}
                    {selected.cells.map((c, i) => (
                      <span
                        key={c.iso}
                        className={`db-mm-cell lv${c.future ? "f" : heatLevel(c.pct)}${c.today ? " is-today" : ""}${hover?.iso === c.iso ? " is-hover" : ""}`}
                        style={{ ["--d" as any]: i }}
                        onMouseEnter={() => setHover(c)}
                        onClick={() => setHover(c)}
                        role="img"
                        aria-label={`${faNum(c.jd)} ${J_MONTHS[month - 1]}: ${c.future ? "آینده" : c.pct === null ? "بدون برنامه" : `${c.pct}٪`}`}
                      >
                        {faNum(c.jd)}
                      </span>
                    ))}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="db-heat-foot">
        <span className="db-heat-hover">{loadingYear === year && !yearLoaded ? "در حالِ آوردنِ تاریخچه‌ی سال…" : hoverLabel}</span>
        <span className="db-heat-legend" aria-hidden="true">
          کم <i className="db-mm-dot lv0" /><i className="db-mm-dot lv1" /><i className="db-mm-dot lv2" /><i className="db-mm-dot lv3" /><i className="db-mm-dot lv4" /> کامل
        </span>
      </div>
    </BentoCard>
  );
}
