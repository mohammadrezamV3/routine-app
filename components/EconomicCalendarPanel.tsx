"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Loader2 } from "lucide-react";
import { faNum, isoLocal } from "@/lib/jalali";
import { PanelSkeleton } from "./PanelSkeleton";
import {
  CALENDAR_CURRENCIES, EconomicEventDto, EconomicImpact,
  IMPACT_COLORS, IMPACT_LABELS, IMPACT_ORDER,
} from "@/lib/economicCalendar";

type HistoryRow = { id: string; occursAt: string; actual: string | null; forecast: string | null; previous: string | null };

// طبقِ درخواستِ صریح: این جدول باید دقیقاً مثلِ خودِ فارکس‌فکتوری انگلیسی
// بمونه — هم متنِ رویدادها (که از منبع همین‌جوری میان، دیگه به فارسی
// ترجمه نمی‌شن — نگاه کن به lib/economicCalendar.ts) هم اعداد (رقمِ
// لاتین، نه faNum). برای همین اینجا از calSystem/formatTradeTime/
// formatTradeDateتِ سراسریِ اپ (که رقم‌ها رو فارسی می‌کنن) استفاده نمی‌کنیم؛
// یک فرمتِ محلیِ انگلیسیِ مستقل داریم، فقط برای همین بخش.
const enTimeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
const enDayFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });
const enShortDateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" });

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
/** شنبه‌ی همان هفته‌ای که d توش است — دقیقاً همان تعریفِ هفته‌ی «برنامه‌ی
 * هفتگی»ِ روتین من (WEEK_ORDER، lib/schedule.ts)، نه یک هفته‌ی دلخواهِ تازه. */
function weekStartOf(d: Date): Date {
  const jsDay = d.getDay();
  const diffFromSat = (jsDay - 6 + 7) % 7;
  return addDays(startOfLocalDay(d), -diffFromSat);
}
const enWeekdayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const enMonthYearFmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const WEEKDAY_HEADERS = Array.from({ length: 7 }, (_, i) => enWeekdayShort.format(addDays(weekStartOf(new Date()), i)));

export function EconomicCalendarPanel() {
  // مثلِ خودِ ForexFactory: یک روز در یک لحظه، با فلشِ قبلی/بعدی — نه
  // «روزهای بیشتر»ی که همه‌چیز رو یک‌جا پشتِ هم می‌ریخت.
  const [date, setDate] = useState(() => startOfLocalDay(new Date()));
  // جهتِ آخرین جابه‌جایی — برایِ اینکه اسلایدِ هفته‌ی جدید از سمتِ درستی
  // بیاد تو (+۱ یعنی هفته‌ی بعد از راست به چپ می‌ره، -۱ برعکس).
  const [weekDir, setWeekDir] = useState(1);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [events, setEvents] = useState<EconomicEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [otherCurrencies, setOtherCurrencies] = useState(false);
  const [impacts, setImpacts] = useState<EconomicImpact[]>([]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyById, setHistoryById] = useState<Record<string, HistoryRow[] | "loading" | "error">>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const iso = isoLocal(date);
      const qs = new URLSearchParams({ from: iso, to: iso });
      if (currencies.length) qs.set("currencies", currencies.join(","));
      if (otherCurrencies) qs.set("other", "1");
      if (impacts.length) qs.set("impacts", impacts.join(","));
      const res = await fetch(`/api/trade/economic-calendar?${qs}`);
      setEvents(res.ok ? (await res.json()).events || [] : []);
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [date, currencies, otherCurrencies, impacts]);

  useEffect(() => { load(); }, [load]);
  // عوض‌شدنِ روز یعنی هیچ ردیفی نباید بازمونده باز باشه (متعلق به روزِ قبله)
  useEffect(() => { setExpandedId(null); }, [date]);

  const today = startOfLocalDay(new Date());

  function goWeek(dir: 1 | -1) {
    setWeekDir(dir);
    setDate((d) => addDays(d, dir * 7));
  }

  function pickDate(d: Date) {
    setWeekDir(d.getTime() >= date.getTime() ? 1 : -1);
    setDate(d);
    setMonthPickerOpen(false);
  }

  async function toggleExpand(e: EconomicEventDto) {
    if (expandedId === e.id) { setExpandedId(null); return; }
    setExpandedId(e.id);
    if (historyById[e.id] && historyById[e.id] !== "error") return;
    setHistoryById((prev) => ({ ...prev, [e.id]: "loading" }));
    try {
      const qs = new URLSearchParams({ title: e.title, currency: e.currency, before: e.occursAt });
      const res = await fetch(`/api/trade/economic-calendar/history?${qs}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHistoryById((prev) => ({ ...prev, [e.id]: data.events || [] }));
    } catch {
      setHistoryById((prev) => ({ ...prev, [e.id]: "error" }));
    }
  }

  return (
    <div>
      <div className="trade-cal-filter-bar">
        <button type="button" className="trade-ghost-btn" onClick={() => setFiltersOpen((v) => !v)}>
          <Filter size={13} /> فیلتر
          {(currencies.length || impacts.length || otherCurrencies) ? ` (${faNum(currencies.length + impacts.length + (otherCurrencies ? 1 : 0))})` : ""}
        </button>
        {(currencies.length > 0 || impacts.length > 0 || otherCurrencies) && (
          <button type="button" className="trade-ghost-btn" onClick={() => { setCurrencies([]); setImpacts([]); setOtherCurrencies(false); }}>
            پاک‌کردن فیلترها
          </button>
        )}
      </div>

      {filtersOpen && (
        <div className="trade-surface trade-cal-filters">
          <label className="exercise-form-label">سطح تأثیر</label>
          <div className="trade-choice-grid">
            {IMPACT_ORDER.map((i) => (
              <button
                key={i}
                type="button"
                className={`trade-choice${impacts.includes(i) ? " active" : ""}`}
                style={impacts.includes(i) ? { borderColor: IMPACT_COLORS[i], color: IMPACT_COLORS[i] } : undefined}
                onClick={() => setImpacts((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))}
              >
                {IMPACT_LABELS[i]}
              </button>
            ))}
          </div>

          <label className="exercise-form-label">ارز</label>
          <div className="trade-choice-grid">
            {CALENDAR_CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                className={`trade-choice${currencies.includes(c.code) ? " active" : ""}`}
                onClick={() => setCurrencies((p) => (p.includes(c.code) ? p.filter((x) => x !== c.code) : [...p, c.code]))}
              >
                {c.code}
              </button>
            ))}
            <button
              type="button"
              className={`trade-choice${otherCurrencies ? " active" : ""}`}
              onClick={() => setOtherCurrencies((v) => !v)}
            >
              سایر ارزها
            </button>
          </div>
        </div>
      )}

      {/* طبقِ درخواستِ صریح: این بخش هم داخلِ یک باکسِ صفحه‌بزرگ — هم‌الگویِ
          چک‌لیست‌ها/یادداشت‌ها — نه یک ناحیه‌ی کوچیکِ شناور روی بک‌گراند. */}
      <div className="trade-surface trade-page-box trade-cal-box">
      {/* ناوبری — به‌جای «روزهای بیشتر»ی که همه‌چیز رو یک‌جا پشتِ هم
          می‌ریخت، حالا مثلِ هفته‌ی «برنامه‌ی هفتگی»ِ روتین من (همان تعریفِ
          هفته‌ی شنبه‌تا‌جمعه): یک ردیفِ ثابتِ ۷ روزِ کلیک‌پذیر، به‌جای فقط
          یک فلشِ قبلی/بعدی که هیچ‌وقت نمی‌گفت «چند روزِ دیگه چی هست». */}
      <div className="trade-cal-daynav">
        <button type="button" className="trade-icon-btn" onClick={() => goWeek(-1)} aria-label="هفته‌ی قبل">
          <ChevronRight size={16} />
        </button>
        <div className="trade-cal-week-viewport">
          <AnimatePresence mode="popLayout" initial={false} custom={weekDir}>
            <motion.div
              key={isoLocal(weekStartOf(date))}
              custom={weekDir}
              initial={{ x: weekDir > 0 ? 56 : -56, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: weekDir > 0 ? -56 : 56, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={(_e, info) => {
                if (info.offset.x < -55 || info.velocity.x < -500) goWeek(1);
                else if (info.offset.x > 55 || info.velocity.x > 500) goWeek(-1);
              }}
              className="trade-cal-week-strip"
            >
              {Array.from({ length: 7 }, (_, i) => addDays(weekStartOf(date), i)).map((d) => (
                <button
                  key={isoLocal(d)}
                  type="button"
                  className={`trade-cal-day-pill${isSameDay(d, date) ? " active" : ""}${isSameDay(d, today) ? " today" : ""}`}
                  onClick={() => pickDate(d)}
                >
                  <span className="trade-cal-day-pill-wd">{enWeekdayShort.format(d)}</span>
                  <span className="trade-cal-day-pill-num mono">{d.getDate()}</span>
                </button>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
        <button type="button" className="trade-icon-btn" onClick={() => goWeek(1)} aria-label="هفته‌ی بعد">
          <ChevronLeft size={16} />
        </button>
      </div>
      <div className="trade-cal-daynav-sub">
        <span className="ltr-inline">{isSameDay(date, today) ? "Today: " : ""}{enDayFmt.format(date)}</span>
        <button type="button" className="trade-ghost-btn trade-cal-month-btn" onClick={() => setMonthPickerOpen((v) => !v)}>
          <CalendarDays size={13} /> تقویم
        </button>
        {!isSameDay(date, today) && (
          <button type="button" className="trade-ghost-btn" onClick={() => { setWeekDir(1); setDate(today); }}>
            امروز
          </button>
        )}
      </div>

      {monthPickerOpen && (
        <EconMonthPicker date={date} onPick={pickDate} onClose={() => setMonthPickerOpen(false)} />
      )}

      {loading && firstLoad && <PanelSkeleton />}

      {!firstLoad && !loading && !events.length && (
        <div className="item-line empty" style={{ marginTop: 16 }}>
          رویدادی برای این روز ثبت نشده است.
        </div>
      )}

      {!firstLoad && !!events.length && (
        <div style={{ opacity: loading ? 0.55 : 1, transition: "opacity .2s ease" }}>
          <div className="trade-cal-table-scroll">
            <div className="trade-cal-table ltr-inline">
              <div className="trade-cal-thead">
                <span className="tc-col-time">Time</span>
                <span className="tc-col-cur">Currency</span>
                <span className="tc-col-event">Event</span>
                <span className="tc-col-num">Actual</span>
                <span className="tc-col-num">Forecast</span>
                <span className="tc-col-num">Previous</span>
              </div>
              {events.map((e) => {
                const hist = historyById[e.id];
                const expanded = expandedId === e.id;
                return (
                  <Fragment key={e.id}>
                    <div
                      className={`trade-cal-tr${expanded ? " expanded" : ""}`}
                      onClick={() => toggleExpand(e)}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="tc-col-time mono">{enTimeFmt.format(new Date(e.occursAt))}</span>
                      <span className="tc-col-cur">
                        <span className="trade-cal-impact-dot" style={{ background: IMPACT_COLORS[e.impact] }} title={IMPACT_LABELS[e.impact]} />
                        <b className="mono">{e.currency}</b>
                      </span>
                      <span className="tc-col-event" title={e.title}>{e.title}</span>
                      <span className={`tc-col-num mono${e.actual ? "" : " muted"}`}>{e.actual || "—"}</span>
                      <span className="tc-col-num mono">{e.forecast || "—"}</span>
                      <span className="tc-col-num mono">{e.previous || "—"}</span>
                    </div>

                    {expanded && (
                      <div className="trade-cal-history">
                        {hist === "loading" && (
                          <div className="trade-cal-history-status"><Loader2 size={14} className="trade-spin" /></div>
                        )}
                        {hist === "error" && (
                          <div className="trade-cal-history-status">تاریخچه در دسترس نیست</div>
                        )}
                        {Array.isArray(hist) && !hist.length && (
                          <div className="trade-cal-history-status">انتشارِ قبلی‌ای برای این رویداد ثبت نشده</div>
                        )}
                        {Array.isArray(hist) && !!hist.length && (
                          <div className="trade-cal-history-table ltr-inline">
                            <div className="trade-cal-history-head">
                              <span>Date</span><span>Actual</span><span>Forecast</span><span>Previous</span>
                            </div>
                            {hist.map((h) => (
                              <div key={h.id} className="trade-cal-history-row">
                                <span>{enShortDateFmt.format(new Date(h.occursAt))}</span>
                                <span className="mono">{h.actual || "—"}</span>
                                <span className="mono">{h.forecast || "—"}</span>
                                <span className="mono">{h.previous || "—"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// دکمه‌ی «تقویم» یک ماه‌شمارِ کامل باز می‌کند — دقیقاً هم‌الگویِ ماه‌شمارِ
// «روتین من» (cal-grid/cal-cell)، فقط با تاریخِ میلادی چون کلِ این بخش
// عمداً میلادی مانده (طبقِ همان قاعده‌ی بالای فایل).
function EconMonthPicker({ date, onPick, onClose }: { date: Date; onPick: (d: Date) => void; onClose: () => void }) {
  const [viewYear, setViewYear] = useState(date.getFullYear());
  const [viewMonth, setViewMonth] = useState(date.getMonth());
  const today = startOfLocalDay(new Date());

  const monthLen = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startCol = (new Date(viewYear, viewMonth, 1).getDay() + 1) % 7;

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1); }

  const cells: JSX.Element[] = [];
  for (let i = 0; i < startCol; i++) cells.push(<div key={"e" + i} className="cal-cell empty" />);
  for (let d = 1; d <= monthLen; d++) {
    const cellDate = new Date(viewYear, viewMonth, d);
    cells.push(
      <div
        key={d}
        onClick={() => onPick(cellDate)}
        className={`cal-cell${isSameDay(cellDate, today) ? " today" : ""}${isSameDay(cellDate, date) ? " selected" : ""}`}
      >
        <span className="cal-daynum mono">{d}</span>
      </div>
    );
  }

  return (
    <>
      <div className="trade-econ-monthpicker-backdrop" onClick={onClose} />
      <div className="trade-surface trade-econ-monthpicker ltr-inline">
        <div className="cal-controls">
          <button type="button" className="small mono" onClick={prevMonth}>‹</button>
          <div className="cal-label">{enMonthYearFmt.format(new Date(viewYear, viewMonth, 1))}</div>
          <button type="button" className="small mono" onClick={nextMonth}>›</button>
        </div>
        <div className="cal-grid">
          {WEEKDAY_HEADERS.map((w, i) => <div key={i} className="cal-weekday">{w}</div>)}
          {cells}
        </div>
      </div>
    </>
  );
}
