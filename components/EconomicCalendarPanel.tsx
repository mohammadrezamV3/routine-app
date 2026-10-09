"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, BellRing, Calendar, ChevronLeft, ChevronRight, Filter, History, Search, X } from "lucide-react";
import { useDayStrip } from "@/lib/useDayStrip";
import { jMonthName, weekdayName, faNum, isoLocal, toJalali } from "@/lib/jalali";
import { gMonthName } from "@/lib/gregorian";
import { tr, isEn } from "@/lib/i18n";
import { getSetting, setSetting } from "@/lib/storage";
import { PanelSkeleton } from "./PanelSkeleton";
import {
  CALENDAR_CURRENCIES, EconomicEventDto, EconomicImpact,
  IMPACT_COLORS, IMPACT_LABELS, IMPACT_ORDER, RELEASE_WATCH_WINDOW_MS, compareActualToForecast,
} from "@/lib/economicCalendar";
import { CAL_SYSTEM_KEY, CalSystem } from "@/lib/tradeTypes";
import {
  DEFAULT_NEWS_ALERT_PREFS, NEWS_ALERT_KEY,
  NewsAlertPrefs, newsEventWatchKey, normalizeNewsAlertPrefs,
} from "@/lib/tradeNewsAlerts";

// طبق درخواست صریح: خود جدول رویدادها (اسم و اعداد
// Actual/Forecast/Previous) دقیقا مثل فارکس‌فکتوری انگلیسی می‌ماند —
// نگاه کن به lib/economicCalendar.ts. نوار بالای صفحه (استریپ روزها +
// تاریخچه/امروز/فیلتر) فارسی/شمسی است و با calSystem سراسری ماژول ترید
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
/** «سه‌شنبه ۱۷ شهریور» یا معادل میلادی‌اش — طبق calSystem انتخابی کاربر */
function dayLabel(d: Date, calSystem: CalSystem): { weekday: string; date: string } {
  const weekday = weekdayName(d.getDay());
  if (calSystem === "jalali") {
    const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { weekday, date: `${faNum(j[2])} ${jMonthName(j[1] - 1)}` };
  }
  return { weekday, date: `${faNum(d.getDate())} ${gMonthName(d.getMonth())}` };
}
function fullDayLabel(d: Date, calSystem: CalSystem): string {
  const { weekday, date } = dayLabel(d, calSystem);
  return `${weekday} ${date}`;
}
const enMonthYearFmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const enWeekdayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const WEEKDAY_HEADERS = Array.from({ length: 7 }, (_, i) => enWeekdayShort.format(addDays(startOfLocalDay(new Date()), i - new Date().getDay())));

/**
 * تازه‌سازی بی‌صدا وقتی رویداد منتشرنشده‌ای روی همین صفحه هست.
 * نصف بودجه‌ی ۱۰ثانیه‌ای «انتشار → دیده‌شدن» است؛ نصف دیگرش سمت سرور
 * (computeNextSyncDelayMs در lib/economicCalendar.ts).
 */
const LIVE_POLL_MS = 5_000;
/** پنجره‌ای که یک رویداد بی‌actual «در حال انتشار» حساب می‌شود */
const PENDING_BEFORE_MS = 2 * 60_000;
// بعد از زمان رویداد، دقیقا همان پنجره‌ای که سرور هم در آن دنبال actual
// می‌گردد (lib/economicCalendar.ts). دو عدد جدا یعنی کلاینت یا زودتر از
// سرور دست می‌کشد (آپدیت را نمی‌بیند) یا دیرتر (بی‌فایده poll می‌زند).
const PENDING_AFTER_MS = RELEASE_WATCH_WINDOW_MS;

export function EconomicCalendarPanel() {
  // مثل خود فارکس‌فکتوری: یک روز در یک لحظه.
  const [date, setDate] = useState(() => startOfLocalDay(new Date()));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  useEffect(() => { getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem); }, []);

  const [events, setEvents] = useState<EconomicEventDto[]>([]);
  /** مرزهای واقعی داده‌ای که داریم — از خود سرور، نه حدس */
  const [range, setRange] = useState<{ from: Date; to: Date } | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── فیلترها (همه داخل یک پنل، طبق شماتیک) ──
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [otherCurrencies, setOtherCurrencies] = useState(false);
  const [impacts, setImpacts] = useState<EconomicImpact[]>([]);
  // طبق درخواست صریح، جستجوی نام رویداد دیگر دکمه‌ی جدا ندارد — یک
  // فیلد فیلتر مثل بقیه است و مثل آن‌ها روی همان روز انتخاب‌شده اعمال
  // می‌شود (نه یک حالت جداگانه که کل صفحه را عوض کند).
  const [nameInput, setNameInput] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setNameQuery(nameInput.trim()), 300);
    return () => clearTimeout(t);
  }, [nameInput]);

  const activeFilterCount =
    currencies.length + impacts.length + (otherCurrencies ? 1 : 0) + (nameQuery ? 1 : 0);

  // هشدار هر رویداد (ستون Alert) — تنظیمات کلی‌اش توی «تنظیمات › ترید» است.
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
  // دارد. بدون این، تندتند عوض‌کردن روز می‌توانست پاسخ روز قبلی را
  // *بعد* پاسخ روز جدید بنشاند — از بیرون دقیقا «این روز داده‌ی روز
  // دیگری را نشان می‌دهد / لود نمی‌شود».
  const reqSeq = useRef(0);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const seq = ++reqSeq.current;
    if (!opts?.silent) setLoading(true);
    try {
      const iso = isoLocal(date);
      const qs = new URLSearchParams({ from: iso, to: iso });
      // افست واقعی تایم‌زون مرورگر (دقیقه، شرق UTC مثبت) — سرور با این
      // «روز محلی» را درست حساب می‌کند، نه روی نیمه‌شب UTC.
      qs.set("tz", String(-new Date().getTimezoneOffset()));
      if (nameQuery) qs.set("q", nameQuery);
      if (currencies.length) qs.set("currencies", currencies.join(","));
      if (otherCurrencies) qs.set("other", "1");
      if (impacts.length) qs.set("impacts", impacts.join(","));

      const res = await fetch(`/api/trade/economic-calendar?${qs}`, { cache: "no-store" });
      if (seq !== reqSeq.current) return;
      if (!res.ok) {
        setLoadError(tr("گرفتن داده‌ی این روز ناموفق بود", "Failed to load data for this day"));
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
      setLoadError(tr("مشکلی در اتصال به سرور پیش آمد", "There was a problem connecting to the server"));
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

  // ── تازه‌سازی زنده ─────────────────────────────────────────────────────
  // فقط وقتی واقعا منتظر انتشار چیزی هستیم (رویداد بی‌actual که زمانش
  // همین حالاست) هر ۵ثانیه بی‌صدا دوباره می‌خوانیم — نه یک polling دائمی
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

  // برگشتن به تب هم باید تازه‌سازی کند — یک تب باز از دیروز نباید داده‌ی
  // کهنه نشان بدهد.
  // تبی که از دیروز باز مانده روی «دیروز» گیر می‌کرد: date فقط یک بار موقع
  // mount روی امروز ست می‌شد، پس روز جدید هیچ‌وقت خودش نمی‌آمد. اگر کاربر
  // روی «امروز آن موقع» بود، با عوض‌شدن روز به امروز جدید می‌رود.
  const dayAnchor = useRef(startOfLocalDay(new Date()).getTime());
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const nowDay = startOfLocalDay(new Date()).getTime();
      if (nowDay !== dayAnchor.current) {
        const wasOnToday = date.getTime() === dayAnchor.current;
        dayAnchor.current = nowDay;
        if (wasOnToday) { setDate(new Date(nowDay)); return; }
      }
      load({ silent: true });
    }
    // بدون فوکوس/تغییر تب هم روز جدید باید برسد (صفحه‌ی باز روی مانیتور).
    const tick = setInterval(onVisible, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load, date]);

  // ── نوار روزها ─────────────────────────────────────────────────────────
  // موبایل: نوار آزاد قابل‌کشیدن با شتاب (مشترک با «روتین من» —
  // lib/useDayStrip.ts)، بدون فلش، روزها نزدیک هر لبه تنبل اضافه می‌شوند.
  // دسکتاپ: طبق درخواست صریح، به رفتار قدیمی برمی‌گرده — کشیدن آزاد
  // خاموش و دو فلش قبلی/بعدی همون نوار رو پیج می‌کنن.
  const [recenterKey, setRecenterKey] = useState(0);
  const { scrollRef: weekStripRef, days: dayStrip, pageBy: pageWeekStrip } = useDayStrip(isoLocal(date), recenterKey);

  const outOfRange = !!range && (date < range.from || date > range.to);

  function pickDate(d: Date) {
    setDate(startOfLocalDay(d));
    setMonthPickerOpen(false);
  }

  // پرش تاریخ از ماه‌شمار: نوار خودش بازه را دور این روز باز و وسط‌چینش می‌کند.
  function jumpToDate(d: Date) {
    setDate(startOfLocalDay(d));
    setMonthPickerOpen(false);
  }

  const now = Date.now();

  return (
    <div>
      {/* ── نوار روزها + سه دکمه، دقیقا هم‌چیدمان «روتین من»: روی دسکتاپ
          کنار هم (دکمه‌ها سمت راست، نوار سمت چپ و flex-1)، روی موبایل
          زیر هم — نگاه کن به app/weekly/page.tsx (DashDateSelector +
          DashFilterButton، همون الگو). */}
      <div className="trade-cal-header-row flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="trade-cal-week-strip lg:order-2 lg:flex-1">
          {/* فلش قبلی/بعدی فقط دسکتاپ دیده می‌شن (globals.css) — پیج‌کردن
              همون نوار روزها، نه یک پنجره‌ی جدا. */}
          <button
            type="button"
            aria-label={tr("روزهای قبل", "Previous days")}
            className="trade-cal-week-arrow"
            onClick={() => pageWeekStrip("prev")}
          >
            <ChevronRight size={16} className="dir-flip" />
          </button>
          <div className="trade-cal-week-days" ref={weekStripRef}>
            {dayStrip.map(({ date: d, iso }) => {
              const active = isSameDay(d, date);
              const { weekday, date: dateLabel } = dayLabel(d, calSystem);
              return (
                <button
                  key={iso}
                  type="button"
                  data-iso={iso}
                  data-day-pill
                  draggable={false}
                  className={`trade-cal-day-pill${active ? " active" : ""}${!active && isSameDay(d, today) ? " today" : ""}`}
                  onClick={() => pickDate(d)}
                >
                  <span className="trade-cal-day-pill-wd">{weekday}</span>
                  <span className="trade-cal-day-pill-num mono">{dateLabel}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            aria-label={tr("روزهای بعد", "Next days")}
            className="trade-cal-week-arrow"
            onClick={() => pageWeekStrip("next")}
          >
            <ChevronLeft size={16} className="dir-flip" />
          </button>
        </div>

        {/* ── سه دکمه، دقیقا به همین ترتیب (راست به چپ): تاریخچه · امروز · فیلتر ── */}
        <div className="trade-cal-actions-row lg:order-1 lg:shrink-0 lg:flex-nowrap">
          <button type="button" className="trade-cal-pill-btn" onClick={() => setMonthPickerOpen((v) => !v)}>
            <History size={15} /> {tr("تاریخچه", "History")}
          </button>
          <button
            type="button"
            className={`trade-cal-pill-btn today${isSameDay(date, today) ? " active" : ""}`}
            onClick={() => { pickDate(today); setRecenterKey((k) => k + 1); }}
          >
            <Calendar size={15} /> {tr("امروز", "Today")}
          </button>
          <button
            type="button"
            className={`trade-cal-pill-btn${filtersOpen || activeFilterCount ? " on" : ""}`}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Filter size={15} /> {tr("فیلتر", "Filter")}{activeFilterCount ? ` (${faNum(activeFilterCount)})` : ""}
          </button>
        </div>
      </div>

      {/* ── پنل فیلتر ── */}
      {filtersOpen && (
        <div className="trade-surface trade-cal-filters trade-cal-below">
          <label className="exercise-form-label">{tr("نام رویداد", "Event name")}</label>
          {/* ترتیب DOM عمدی‌ست: در RTL آخرین فرزند سمت چپ می‌نشیند، پس
              ذره‌بین بعد از input می‌آید تا طبق درخواست صریح چپ فیلد باشد. */}
          <div className="trade-cal-search">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={tr("مثلا CPI یا Non-Farm", "e.g. CPI or Non-Farm")}
              // متن از راست شروع شود (طبق درخواست صریح) ولی جهت نوشتن
              // همچنان LTR بماند، چون نام رویدادها انگلیسی‌ست.
              className="ltr-inline"
              style={{ textAlign: isEn() ? "left" : "right" }}
            />
            {nameInput && (
              <button type="button" onClick={() => setNameInput("")} aria-label={tr("پاک‌کردن نام رویداد", "Clear event name")}>
                <X size={13} />
              </button>
            )}
            <Search size={14} />
          </div>

          <label className="exercise-form-label">{tr("سطح تاثیر", "Impact level")}</label>
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

          <label className="exercise-form-label">{tr("ارز", "Currency")}</label>
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
              {tr("سایر ارزها", "Other currencies")}
            </button>
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              className="trade-ghost-btn"
              style={{ marginTop: 10 }}
              onClick={() => { setCurrencies([]); setImpacts([]); setOtherCurrencies(false); setNameInput(""); }}
            >
              {tr("پاک‌کردن فیلترها", "Clear filters")}
            </button>
          )}
        </div>
      )}

      {monthPickerOpen && (
        <EconMonthPicker date={date} range={range} onPick={jumpToDate} onClose={() => setMonthPickerOpen(false)} />
      )}

      {loading && firstLoad && <div className="trade-cal-below"><PanelSkeleton /></div>}

      {!firstLoad && loadError && (
        <div className="item-line empty trade-cal-below">
          {loadError} — <button type="button" className="trade-ghost-btn" onClick={() => load()}>{tr("تلاش دوباره", "Try again")}</button>
        </div>
      )}

      {!firstLoad && !loadError && !loading && !events.length && (
        <div className="item-line empty trade-cal-below">
          {/* توضیح صادقانه‌ی «چرا این روز خالیه»: یا منبع هنوز تا این تاریخ
              نرسیده، یا فیلترها چیزی باقی نگذاشته‌اند، یا واقعا رویدادی
              نیست. قبلا هر سه حالت یک پیام می‌گرفتند و روزهای بیرون بازه
              شبیه «لود نشد» دیده می‌شدند. */}
          {outOfRange && range
            ? tr(
                `منبع فعلی فقط از ${fullDayLabel(range.from, calSystem)} تا ${fullDayLabel(range.to, calSystem)} داده دارد — این تاریخ هنوز منتشر نشده.`,
                `The current source only has data from ${fullDayLabel(range.from, calSystem)} to ${fullDayLabel(range.to, calSystem)}. This date has not been published yet.`
              )
            : activeFilterCount
              ? tr("با این فیلترها رویدادی پیدا نشد.", "No events found with these filters.")
              : tr("رویدادی برای این روز ثبت نشده است.", "No events are listed for this day.")}
        </div>
      )}

      {/* طبق درخواست صریح، خود اخبار توی یک باکس‌اند — ولی تقویم
          بالای سرشان نه. */}
      {!firstLoad && !!events.length && (
        <div className="trade-surface trade-page-box trade-cal-table-box trade-cal-below" style={{ opacity: loading ? 0.55 : 1, transition: "opacity .2s ease" }}>
          <div className="trade-cal-list ltr-inline">
            {events.map((e) => {
              const occursAt = new Date(e.occursAt);
              const isPast = occursAt.getTime() < now;
              const cmp = compareActualToForecast(e.actual, e.forecast);
              const watched = alerts.watchedEventKeys.includes(newsEventWatchKey(e.currency, e.title));
              return (
                <div key={e.id} className={`trade-cal-item${isPast ? " past" : ""}`}>
                  {/* ردیف اول: زمان، حساسیت، ارز، نام رویداد، هشدار */}
                  <div className="tc-line1">
                    <span className="tc-time mono">{enTimeFmt.format(occursAt)}</span>
                    <span
                      className="trade-cal-impact-dot"
                      style={{ background: IMPACT_COLORS[e.impact] }}
                      title={IMPACT_LABELS[e.impact]}
                    />
                    <b className="tc-cur mono">{e.currency}</b>
                    <span className="tc-title" title={e.title}>{e.title}</span>
                    <button
                      type="button"
                      className={`trade-cal-icon-btn tc-alert${watched ? " active" : ""}`}
                      onClick={() => toggleWatchEvent(e)}
                      aria-label={watched ? tr("حذف هشدار برای این رویداد", "Remove alert for this event") : tr("هشدار برای این رویداد", "Alert for this event")}
                      title={watched ? tr("هشدار روشن است", "Alert is on") : tr("هشدار بده", "Set alert")}
                    >
                      {watched ? <BellRing size={13} /> : <Bell size={13} />}
                    </button>
                  </div>
                  {/* ردیف دوم: اکشوال، پریویوس، فورکست — با برچسب، چون
                      بدون هدر ستونی سه عدد لخت قابل تشخیص نیستند. */}
                  <div className="tc-line2">
                    <span className="tc-stat">
                      <i>Actual</i>
                      <b
                        className={`mono${e.actual ? "" : " muted"}`}
                        style={cmp === "up" ? { color: "var(--accent)" } : cmp === "down" ? { color: "#E05252" } : undefined}
                      >
                        {e.actual || "—"}
                      </b>
                    </span>
                    <span className="tc-stat"><i>Previous</i><b className="mono">{e.previous || "—"}</b></span>
                    <span className="tc-stat"><i>Forecast</i><b className="mono">{e.forecast || "—"}</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// دکمه‌ی «تاریخچه» یک ماه‌شمار کامل باز می‌کند — هم‌الگوی ماه‌شمار
// «روتین من» (cal-grid/cal-cell). روزهای بیرون بازه‌ی داده‌ی موجود عمدا
// غیرفعال‌اند: قبلا انتخاب‌شدنی بودند و بعد یک صفحه‌ی خالی می‌دادند، که
// دقیقا همان «بعضی روزها اصلا لود نمی‌شن» گزارش‌شده بود.
function EconMonthPicker({
  date, range, onPick, onClose,
}: { date: Date; range: { from: Date; to: Date } | null; onPick: (d: Date) => void; onClose: () => void }) {
  const [viewYear, setViewYear] = useState(date.getFullYear());
  const [viewMonth, setViewMonth] = useState(date.getMonth());
  const today = startOfLocalDay(new Date());

  const monthLen = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startCol = new Date(viewYear, viewMonth, 1).getDay();

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

  // createPortal چون هر جد دارای filter/backdrop-filter برای فرزندهای
  // position:fixed یک containing-block جدید می‌سازد و پاپ‌آپ جای درستی
  // نمی‌نشیند — همان ترفند TradeKebabMenu.
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
