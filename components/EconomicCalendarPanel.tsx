"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, BellRing, Calendar, Filter, History, Search, X } from "lucide-react";
import { FA_WEEKDAY, J_MONTHS, faNum, isoLocal, toJalali } from "@/lib/jalali";
import { G_MONTHS } from "@/lib/gregorian";
import { getSetting, setSetting } from "@/lib/storage";
import { PanelSkeleton } from "./PanelSkeleton";
import {
  CALENDAR_CURRENCIES, EconomicEventDto, EconomicImpact,
  IMPACT_COLORS, IMPACT_LABELS, IMPACT_ORDER, compareActualToForecast,
} from "@/lib/economicCalendar";
import { CAL_SYSTEM_KEY, CalSystem } from "@/lib/tradeTypes";
import {
  DEFAULT_NEWS_ALERT_PREFS, NEWS_ALERT_KEY,
  NewsAlertPrefs, newsEventWatchKey, normalizeNewsAlertPrefs,
} from "@/lib/tradeNewsAlerts";

// طبقِ درخواستِ صریح: خودِ جدولِ رویدادها (اسم و اعدادِ
// Actual/Forecast/Previous) دقیقاً مثلِ فارکس‌فکتوریِ انگلیسی می‌ماند —
// نگاه کن به lib/economicCalendar.ts. نوارِ بالای صفحه (استریپِ روزها +
// تاریخچه/امروز/فیلتر) فارسی/شمسی است و با calSystem سراسریِ ماژولِ ترید
// جابه‌جا می‌شود.
const enTimeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfLocalDay(b).getTime() - startOfLocalDay(a).getTime()) / 86_400_000);
}
/** «سه‌شنبه ۱۷ شهریور» یا معادلِ میلادی‌اش — طبقِ calSystemِ انتخابیِ کاربر */
function dayLabel(d: Date, calSystem: CalSystem): { weekday: string; date: string } {
  const weekday = FA_WEEKDAY[d.getDay()];
  if (calSystem === "jalali") {
    const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { weekday, date: `${faNum(j[2])} ${J_MONTHS[j[1] - 1]}` };
  }
  return { weekday, date: `${faNum(d.getDate())} ${G_MONTHS[d.getMonth()]}` };
}
function fullDayLabel(d: Date, calSystem: CalSystem): string {
  const { weekday, date } = dayLabel(d, calSystem);
  return `${weekday} ${date}`;
}
const enMonthYearFmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const enWeekdayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const WEEKDAY_HEADERS = Array.from({ length: 7 }, (_, i) => enWeekdayShort.format(addDays(startOfLocalDay(new Date()), i - new Date().getDay())));

/** سقفِ نوارِ روزها وقتی هنوز نمی‌دانیم منبع چه بازه‌ای دارد (اولین لود) */
const FALLBACK_BACK = 7;
const FALLBACK_FORWARD = 7;

/**
 * تازه‌سازیِ بی‌صدا وقتی رویدادِ منتشرنشده‌ای روی همین صفحه هست.
 * نصفِ بودجه‌ی ۱۰ثانیه‌ایِ «انتشار → دیده‌شدن» است؛ نصفِ دیگرش سمتِ سرور
 * (computeNextSyncDelayMs در lib/economicCalendar.ts).
 */
const LIVE_POLL_MS = 5_000;
/** پنجره‌ای که یک رویدادِ بی‌actual «در حالِ انتشار» حساب می‌شود */
const PENDING_BEFORE_MS = 2 * 60_000;
const PENDING_AFTER_MS = 15 * 60_000;

export function EconomicCalendarPanel() {
  // مثلِ خودِ فارکس‌فکتوری: یک روز در یک لحظه.
  const [date, setDate] = useState(() => startOfLocalDay(new Date()));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  useEffect(() => { getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem); }, []);

  const [events, setEvents] = useState<EconomicEventDto[]>([]);
  /** مرزهای واقعیِ داده‌ای که داریم — از خودِ سرور، نه حدس */
  const [range, setRange] = useState<{ from: Date; to: Date } | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── فیلترها (همه داخلِ یک پنل، طبقِ شماتیک) ──
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [otherCurrencies, setOtherCurrencies] = useState(false);
  const [impacts, setImpacts] = useState<EconomicImpact[]>([]);
  // طبقِ درخواستِ صریح، جستجوی نامِ رویداد دیگر دکمه‌ی جدا ندارد — یک
  // فیلدِ فیلتر مثلِ بقیه است و مثلِ آن‌ها روی همان روزِ انتخاب‌شده اعمال
  // می‌شود (نه یک حالتِ جداگانه که کلِ صفحه را عوض کند).
  const [nameInput, setNameInput] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setNameQuery(nameInput.trim()), 300);
    return () => clearTimeout(t);
  }, [nameInput]);

  const activeFilterCount =
    currencies.length + impacts.length + (otherCurrencies ? 1 : 0) + (nameQuery ? 1 : 0);

  // هشدارِ هر رویداد (ستونِ Alert) — تنظیماتِ کلی‌اش توی «تنظیمات › ترید» است.
  const [alerts, setAlerts] = useState<NewsAlertPrefs>(DEFAULT_NEWS_ALERT_PREFS);
  useEffect(() => {
    getSetting<unknown>(NEWS_ALERT_KEY, DEFAULT_NEWS_ALERT_PREFS).then((v) => setAlerts(normalizeNewsAlertPrefs(v)));
  }, []);
  function toggleWatchEvent(e: EconomicEventDto) {
    const key = newsEventWatchKey(e.currency, e.title);
    setAlerts((prev) => {
      const has = prev.watchedEventKeys.includes(key);
      const watchedEventKeys = has ? prev.watchedEventKeys.filter((x) => x !== key) : [...prev.watchedEventKeys, key];
      const next = normalizeNewsAlertPrefs({ ...prev, watchedEventKeys });
      setSetting(NEWS_ALERT_KEY, next);
      return next;
    });
  }

  // هر درخواست یک شماره می‌گیرد و فقط تازه‌ترین اجازه‌ی نشستن روی state
  // دارد. بدونِ این، تندتند عوض‌کردنِ روز می‌توانست پاسخِ روزِ قبلی را
  // *بعدِ* پاسخِ روزِ جدید بنشاند — از بیرون دقیقاً «این روز داده‌ی روزِ
  // دیگری را نشان می‌دهد / لود نمی‌شود».
  const reqSeq = useRef(0);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const seq = ++reqSeq.current;
    if (!opts?.silent) setLoading(true);
    try {
      const iso = isoLocal(date);
      const qs = new URLSearchParams({ from: iso, to: iso });
      // افستِ واقعیِ تایم‌زونِ مرورگر (دقیقه، شرقِ UTC مثبت) — سرور با این
      // «روزِ محلی» را درست حساب می‌کند، نه روی نیمه‌شبِ UTC.
      qs.set("tz", String(-new Date().getTimezoneOffset()));
      if (nameQuery) qs.set("q", nameQuery);
      if (currencies.length) qs.set("currencies", currencies.join(","));
      if (otherCurrencies) qs.set("other", "1");
      if (impacts.length) qs.set("impacts", impacts.join(","));

      const res = await fetch(`/api/trade/economic-calendar?${qs}`);
      if (seq !== reqSeq.current) return;
      if (!res.ok) {
        setLoadError("گرفتن داده‌ی این روز ناموفق بود");
        setEvents([]);
        return;
      }
      const data = await res.json();
      if (seq !== reqSeq.current) return;
      setLoadError(null);
      setEvents(data.events || []);
      if (data.range?.from && data.range?.to) {
        setRange({ from: startOfLocalDay(new Date(data.range.from)), to: startOfLocalDay(new Date(data.range.to)) });
      } else {
        setRange(null);
      }
    } catch {
      if (seq !== reqSeq.current) return;
      setLoadError("مشکلی در اتصال به سرور پیش آمد");
      setEvents([]);
    } finally {
      if (seq === reqSeq.current) {
        setLoading(false);
        setFirstLoad(false);
      }
    }
  }, [date, currencies, otherCurrencies, impacts, nameQuery]);

  useEffect(() => { load(); }, [load]);

  const today = startOfLocalDay(new Date());

  // ── تازه‌سازیِ زنده ─────────────────────────────────────────────────────
  // فقط وقتی واقعاً منتظرِ انتشارِ چیزی هستیم (رویدادِ بی‌actual که زمانش
  // همین حالاست) هر ۵ثانیه بی‌صدا دوباره می‌خوانیم — نه یک polling دائمیِ
  // بی‌دلیل روی هر صفحه.
  const hasPending = useMemo(() => {
    const now = Date.now();
    return events.some((e) => {
      if (e.actual) return false;
      const t = new Date(e.occursAt).getTime();
      return t <= now + PENDING_BEFORE_MS && t >= now - PENDING_AFTER_MS;
    });
  }, [events]);

  useEffect(() => {
    if (!hasPending) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load({ silent: true });
    }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [hasPending, load]);

  // برگشتن به تب هم باید تازه‌سازی کند — یک تبِ باز از دیروز نباید داده‌ی
  // کهنه نشان بدهد.
  useEffect(() => {
    function onVisible() { if (document.visibilityState === "visible") load({ silent: true }); }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load]);

  // ── نوارِ روزها ─────────────────────────────────────────────────────────
  // از مرزهای واقعیِ داده ساخته می‌شود (نه یک بازه‌ی حدسیِ ثابت)، ولی امروز
  // همیشه داخلش هست حتی اگر جدول خالی باشد.
  const dayStrip = useMemo(() => {
    const from = range ? (range.from < today ? range.from : today) : addDays(today, -FALLBACK_BACK);
    const to = range ? (range.to > today ? range.to : today) : addDays(today, FALLBACK_FORWARD);
    const len = Math.min(daysBetween(from, to) + 1, 120);
    return Array.from({ length: Math.max(len, 1) }, (_, i) => addDays(from, i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.from.getTime(), range?.to.getTime(), today.getTime()]);

  const outOfRange = !!range && (date < range.from || date > range.to);

  const activeDayRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeDayRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [date, dayStrip]);

  function pickDate(d: Date) {
    setDate(startOfLocalDay(d));
    setMonthPickerOpen(false);
  }

  const now = Date.now();

  return (
    <div>
      {/* ── نوارِ روزها ── */}
      <div className="trade-cal-week-strip thin-scroll">
        {dayStrip.map((d) => {
          const active = isSameDay(d, date);
          const { weekday, date: dateLabel } = dayLabel(d, calSystem);
          return (
            <button
              key={isoLocal(d)}
              ref={active ? activeDayRef : undefined}
              type="button"
              className={`trade-cal-day-pill${active ? " active" : ""}${!active && isSameDay(d, today) ? " today" : ""}`}
              onClick={() => pickDate(d)}
            >
              <span className="trade-cal-day-pill-wd">{weekday}</span>
              <span className="trade-cal-day-pill-num mono">{dateLabel}</span>
            </button>
          );
        })}
      </div>

      {/* ── سه دکمه، دقیقاً به همین ترتیب (راست به چپ): تاریخچه · امروز · فیلتر ── */}
      <div className="trade-cal-actions-row">
        <button type="button" className="trade-cal-pill-btn" onClick={() => setMonthPickerOpen((v) => !v)}>
          <History size={15} /> تاریخچه
        </button>
        <button
          type="button"
          className={`trade-cal-pill-btn today${isSameDay(date, today) ? " active" : ""}`}
          onClick={() => pickDate(today)}
        >
          <Calendar size={15} /> امروز
        </button>
        <button
          type="button"
          className={`trade-cal-pill-btn${filtersOpen || activeFilterCount ? " on" : ""}`}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <Filter size={15} /> فیلتر{activeFilterCount ? ` (${faNum(activeFilterCount)})` : ""}
        </button>
      </div>

      {/* ── پنلِ فیلتر ── */}
      {filtersOpen && (
        <div className="trade-surface trade-cal-filters trade-cal-below">
          <label className="exercise-form-label">نام رویداد</label>
          {/* ترتیبِ DOM عمدی‌ست: در RTL آخرین فرزند سمتِ چپ می‌نشیند، پس
              ذره‌بین بعد از input می‌آید تا طبقِ درخواستِ صریح چپِ فیلد باشد. */}
          <div className="trade-cal-search">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="مثلا CPI یا Non-Farm"
              className="ltr-inline"
            />
            {nameInput && (
              <button type="button" onClick={() => setNameInput("")} aria-label="پاک‌کردن نام رویداد">
                <X size={13} />
              </button>
            )}
            <Search size={14} />
          </div>

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

          {activeFilterCount > 0 && (
            <button
              type="button"
              className="trade-ghost-btn"
              style={{ marginTop: 10 }}
              onClick={() => { setCurrencies([]); setImpacts([]); setOtherCurrencies(false); setNameInput(""); }}
            >
              پاک‌کردن فیلترها
            </button>
          )}
        </div>
      )}

      {monthPickerOpen && (
        <EconMonthPicker date={date} range={range} onPick={pickDate} onClose={() => setMonthPickerOpen(false)} />
      )}

      {loading && firstLoad && <div className="trade-cal-below"><PanelSkeleton /></div>}

      {!firstLoad && loadError && (
        <div className="item-line empty trade-cal-below">
          {loadError} — <button type="button" className="trade-ghost-btn" onClick={() => load()}>تلاش دوباره</button>
        </div>
      )}

      {!firstLoad && !loadError && !loading && !events.length && (
        <div className="item-line empty trade-cal-below">
          {/* توضیحِ صادقانه‌ی «چرا این روز خالیه»: یا منبع هنوز تا این تاریخ
              نرسیده، یا فیلترها چیزی باقی نگذاشته‌اند، یا واقعاً رویدادی
              نیست. قبلاً هر سه حالت یک پیام می‌گرفتند و روزهای بیرونِ بازه
              شبیهِ «لود نشد» دیده می‌شدند. */}
          {outOfRange && range
            ? `منبع فعلی فقط از ${fullDayLabel(range.from, calSystem)} تا ${fullDayLabel(range.to, calSystem)} داده دارد — این تاریخ هنوز منتشر نشده.`
            : activeFilterCount
              ? "با این فیلترها رویدادی پیدا نشد."
              : "رویدادی برای این روز ثبت نشده است."}
        </div>
      )}

      {!firstLoad && !!events.length && (
        <div className="trade-cal-below" style={{ opacity: loading ? 0.55 : 1, transition: "opacity .2s ease" }}>
          <div className="trade-cal-table-scroll">
            <div className="trade-cal-table ltr-inline">
              <div className="trade-cal-thead">
                <span className="tc-col-time">Time</span>
                <span className="tc-col-cur">Currency</span>
                <span className="tc-col-event">Event</span>
                <span className="tc-col-num">Actual</span>
                <span className="tc-col-num">Forecast</span>
                <span className="tc-col-num">Previous</span>
                <span className="tc-col-icon">Alert</span>
              </div>
              {events.map((e) => {
                const occursAt = new Date(e.occursAt);
                const isPast = occursAt.getTime() < now;
                const cmp = compareActualToForecast(e.actual, e.forecast);
                const watched = alerts.watchedEventKeys.includes(newsEventWatchKey(e.currency, e.title));
                return (
                  <div key={e.id} className={`trade-cal-tr${isPast ? " past" : ""}`}>
                    <span className="tc-col-time mono">{enTimeFmt.format(occursAt)}</span>
                    <span className="tc-col-cur">
                      <span className="trade-cal-impact-dot" style={{ background: IMPACT_COLORS[e.impact] }} title={IMPACT_LABELS[e.impact]} />
                      <b className="mono">{e.currency}</b>
                    </span>
                    <span className="tc-col-event" title={e.title}>{e.title}</span>
                    <span
                      className={`tc-col-num mono${e.actual ? "" : " muted"}`}
                      data-label="Actual"
                      style={cmp === "up" ? { color: "var(--accent)" } : cmp === "down" ? { color: "#E05252" } : undefined}
                    >
                      {e.actual || "—"}
                    </span>
                    <span className="tc-col-num mono" data-label="Forecast">{e.forecast || "—"}</span>
                    <span className="tc-col-num mono" data-label="Previous">{e.previous || "—"}</span>
                    <span className="tc-col-icon">
                      <button
                        type="button"
                        className={`trade-cal-icon-btn${watched ? " active" : ""}`}
                        onClick={() => toggleWatchEvent(e)}
                        aria-label={watched ? "حذفِ هشدار برای این رویداد" : "هشدار برای این رویداد"}
                        title={watched ? "هشدار روشن است" : "هشدار بده"}
                      >
                        {watched ? <BellRing size={13} /> : <Bell size={13} />}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// دکمه‌ی «تاریخچه» یک ماه‌شمارِ کامل باز می‌کند — هم‌الگویِ ماه‌شمارِ
// «روتین من» (cal-grid/cal-cell). روزهای بیرونِ بازه‌ی داده‌ی موجود عمداً
// غیرفعال‌اند: قبلاً انتخاب‌شدنی بودند و بعد یک صفحه‌ی خالی می‌دادند، که
// دقیقاً همان «بعضی روزها اصلاً لود نمی‌شن»ِ گزارش‌شده بود.
function EconMonthPicker({
  date, range, onPick, onClose,
}: { date: Date; range: { from: Date; to: Date } | null; onPick: (d: Date) => void; onClose: () => void }) {
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
    const disabled = !!range && (cellDate < range.from || cellDate > range.to);
    cells.push(
      <div
        key={d}
        onClick={() => { if (!disabled) onPick(cellDate); }}
        className={`cal-cell${isSameDay(cellDate, today) ? " today" : ""}${isSameDay(cellDate, date) ? " selected" : ""}${disabled ? " econ-disabled" : ""}`}
      >
        <span className="cal-daynum mono">{d}</span>
      </div>
    );
  }

  // createPortal چون هر جدِ دارایِ filter/backdrop-filter برای فرزندهای
  // position:fixed یک containing-block جدید می‌سازد و پاپ‌آپ جای درستی
  // نمی‌نشیند — همان ترفندِ TradeKebabMenu.
  return createPortal(
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
    </>,
    document.body
  );
}
