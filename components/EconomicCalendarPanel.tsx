"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import { createPortal } from "react-dom";
import { Bell, BellRing, Calendar, Filter, History, Info, Loader2, Search, X } from "lucide-react";
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

type HistoryRow = { id: string; occursAt: string; actual: string | null; forecast: string | null; previous: string | null };

// طبقِ درخواستِ صریح: خودِ جدولِ رویدادها (اسم/اعداد Actual-Forecast-Previous)
// همچنان باید دقیقاً مثلِ خودِ فارکس‌فکتوریِ انگلیسی بمونه — نگاه کن به
// lib/economicCalendar.ts. این تصمیم عوض نشده و فقط شاملِ خودِ جدوله؛
// نوارِ بالای صفحه (استریپِ روزها + فیلتر/امروز/تاریخچه) از این‌جا به بعد
// طبقِ شماتیکِ تازه‌ی کاربر فارسی/شمسی شد (سازگار با calSystem سراسریِ
// ماژولِ ترید، هم‌الگویِ TradeAccountView/TradeCalendarPanel).
const enTimeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
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
/** «سه‌شنبه ۱۷ شهریور» یا معادلِ میلادی‌اش — طبقِ calSystemِ انتخابیِ کاربر،
 * دقیقا هم‌قاعده‌ی formatTradeDateTime (lib/tradeDateTime.ts). */
function dayLabel(d: Date, calSystem: CalSystem): { weekday: string; date: string } {
  const weekday = FA_WEEKDAY[d.getDay()];
  if (calSystem === "jalali") {
    const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { weekday, date: `${faNum(j[2])} ${J_MONTHS[j[1] - 1]}` };
  }
  return { weekday, date: `${faNum(d.getDate())} ${G_MONTHS[d.getMonth()]}` };
}
const enMonthYearFmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const enWeekdayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const WEEKDAY_HEADERS = Array.from({ length: 7 }, (_, i) => enWeekdayShort.format(addDays(startOfLocalDay(new Date()), i - new Date().getDay())));
// استریپِ روزها یک بازه‌ی ثابتِ پیوسته (نه هفته‌به‌هفته) — امروز همیشه
// همون اول‌ها می‌شینه، اسکرولِ افقیِ خودِ مرورگر (نه drag دستی) کاربر رو
// می‌بره عقب/جلوتر؛ برای پرش دور «تاریخچه» (ماه‌شمارِ کامل) هست.
const DAY_STRIP_BACK = 7;
const DAY_STRIP_FORWARD = 21;

export function EconomicCalendarPanel() {
  // مثلِ خودِ ForexFactory: یک روز در یک لحظه.
  const [date, setDate] = useState(() => startOfLocalDay(new Date()));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  useEffect(() => { getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem); }, []);
  const [events, setEvents] = useState<EconomicEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [otherCurrencies, setOtherCurrencies] = useState(false);
  const [impacts, setImpacts] = useState<EconomicImpact[]>([]);

  // جستجوی یک رویداد خاص — طبق درخواستِ صریح، مثل فارکس‌فکتوری. وقتی
  // متنی تایپ شده، دیگر محدود به «یک روز» نیستیم — بازه‌ی خیلی وسیع‌تری
  // (۹۰ روز قبل تا ۹۰ روز بعد) از سرور خواسته می‌شود تا نتیجه‌ی جستجو به
  // روز انتخاب‌شده گیر نکند.
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);
  const searching = query.length > 0;
  // نوارِ جستجو دیگه همیشه‌باز نیست — طبقِ درخواستِ صریح، یک دکمه کنارِ
  // فیلتر/تاریخچه/امروزه که با زدنش، بدونِ پاپ‌اپ، همین‌جا با انیمیشن باز
  // می‌شه (نه یک مودالِ جدا).
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  function toggleSearch() {
    setSearchOpen((v) => {
      const next = !v;
      if (!next) { setSearchInput(""); }
      return next;
    });
  }
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyById, setHistoryById] = useState<Record<string, HistoryRow[] | "loading" | "error">>({});

  // هشدار پیش از اخبار — طبقِ درخواستِ صریح، دیگر دکمه/پنلِ کلیِ بالای صفحه
  // ندارد؛ کاربر خودش دونه‌به‌دونه از ستونِ «Alert»ِ همین جدول فعال می‌کند.
  // تنظیماتِ کلی (enabled/impacts/currencies) هنوز روی سرور/کران موجودند
  // (سازگاریِ عقب‌رو) ولی از این پنل دیگر قابلِ تغییر نیستند.
  const [alerts, setAlerts] = useState<NewsAlertPrefs>(DEFAULT_NEWS_ALERT_PREFS);
  useEffect(() => {
    getSetting<unknown>(NEWS_ALERT_KEY, DEFAULT_NEWS_ALERT_PREFS).then((v) => setAlerts(normalizeNewsAlertPrefs(v)));
  }, []);
  // ستونِ «Alert» جدول — زنگوله‌ی هر ردیف. کلید بر اساسِ currency|title
  // است نه idِ همین یک وقوع، تا وقوعِ بعدیِ همین شاخص هم هشدار بدهد —
  // نگاه کن به newsEventWatchKey (رفعِ باگِ «هشدار یک‌بارمصرف»).
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (searching) {
        qs.set("from", isoLocal(addDays(date, -90)));
        qs.set("to", isoLocal(addDays(date, 90)));
        qs.set("q", query);
      } else {
        const iso = isoLocal(date);
        qs.set("from", iso);
        qs.set("to", iso);
      }
      // افستِ واقعیِ تایم‌زونِ کاربر (دقیقه، شرقِ UTC مثبت) — سرور با این
      // «روزِ محلی» رو درست حساب می‌کنه، نه رویِ نیمه‌شبِ UTC.
      qs.set("tz", String(-new Date().getTimezoneOffset()));
      if (currencies.length) qs.set("currencies", currencies.join(","));
      if (otherCurrencies) qs.set("other", "1");
      if (impacts.length) qs.set("impacts", impacts.join(","));
      const res = await fetch(`/api/trade/economic-calendar?${qs}`);
      setEvents(res.ok ? (await res.json()).events || [] : []);
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [date, currencies, otherCurrencies, impacts, searching, query]);

  useEffect(() => { load(); }, [load]);
  // عوض‌شدنِ روز یعنی هیچ ردیفی نباید بازمونده باز باشه (متعلق به روزِ قبله)
  useEffect(() => { setExpandedId(null); }, [date]);

  const today = startOfLocalDay(new Date());
  const now = new Date();

  // استریپِ روزها یک بازه‌ی ثابتِ پیوسته حولِ امروز است (نه هفته‌به‌هفته‌ی
  // قبلی) — دقیقا هم‌شکلِ ردیفِ روزهای تصویرِ مرجع. برای رفتنِ به تاریخ‌های
  // دورتر «تاریخچه» (ماه‌شمارِ کامل) هست.
  const dayStrip = useMemo(
    () => Array.from({ length: DAY_STRIP_BACK + DAY_STRIP_FORWARD + 1 }, (_, i) => addDays(today, i - DAY_STRIP_BACK)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const stripRef = useRef<HTMLDivElement>(null);
  const activeDayRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeDayRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [date]);

  function pickDate(d: Date) {
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

      {/* طبقِ درخواستِ صریحِ تازه: این بخش دیگه توی هیچ باکس/قابِ شیشه‌ای
          نیست — دقیقا مثلِ ماه‌شمارِ «روتین من» (cal-controls/cal-grid) که
          مستقیم روی بک‌گراندِ صفحه می‌شینه، نه یک ناحیه‌ی جداگانه‌ی بوردردار.
          تصمیمِ قبلی (باکسِ صفحه‌بزرگ، هم‌الگویِ چک‌لیست‌ها/یادداشت‌ها) عمدا
          نقض شد. */}
      {searching ? (
        <div className="trade-cal-search-banner">
          نتیجه‌ی جستجو برای «<b>{query}</b>» — {faNum(events.length)} رویداد
        </div>
      ) : (
        <>
          <div ref={stripRef} className="trade-cal-week-strip thin-scroll">
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

          <div className="trade-cal-actions-row">
            <button
              type="button"
              className={`trade-cal-search-icon-btn${searchOpen ? " active" : ""}`}
              onClick={toggleSearch}
              aria-label={searchOpen ? "بستن جستجو" : "جستجو"}
            >
              <Search size={14} />
            </button>
            {searchOpen && (
              <div className="trade-cal-search">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") toggleSearch(); }}
                  placeholder="جستجوی یک رویداد خاص…"
                  className="ltr-inline"
                />
                {searchInput && (
                  <button type="button" onClick={() => setSearchInput("")} aria-label="پاک‌کردن جستجو">
                    <X size={13} />
                  </button>
                )}
              </div>
            )}
            {!searchOpen && (
              <>
                <button type="button" className="trade-cal-pill-btn" onClick={() => setFiltersOpen((v) => !v)}>
                  <Filter size={13} /> فیلتر
                  {(currencies.length || impacts.length || otherCurrencies) ? ` (${faNum(currencies.length + impacts.length + (otherCurrencies ? 1 : 0))})` : ""}
                </button>
                <button
                  type="button"
                  className={`trade-cal-pill-btn today${isSameDay(date, today) ? " active" : ""}`}
                  onClick={() => setDate(today)}
                >
                  <Calendar size={13} /> امروز
                </button>
                <button type="button" className="trade-cal-pill-btn" onClick={() => setMonthPickerOpen((v) => !v)}>
                  <History size={13} /> تاریخچه
                </button>
              </>
            )}
          </div>

          {(currencies.length > 0 || impacts.length > 0 || otherCurrencies) && (
            <button
              type="button"
              className="trade-ghost-btn"
              style={{ marginTop: 6 }}
              onClick={() => { setCurrencies([]); setImpacts([]); setOtherCurrencies(false); }}
            >
              پاک‌کردن فیلترها
            </button>
          )}
        </>
      )}

      {monthPickerOpen && (
        <EconMonthPicker date={date} onPick={pickDate} onClose={() => setMonthPickerOpen(false)} />
      )}

      {loading && firstLoad && <PanelSkeleton />}

      {!firstLoad && !loading && !events.length && (
        <div className="item-line empty" style={{ marginTop: 16 }}>
          {searching ? "رویدادی با این عنوان پیدا نشد." : "رویدادی برای این روز ثبت نشده است."}
        </div>
      )}

      {!firstLoad && !!events.length && (
        <div style={{ opacity: loading ? 0.55 : 1, transition: "opacity .2s ease" }}>
          <div className="trade-cal-table-scroll">
            <div className="trade-cal-table ltr-inline">
              <div className="trade-cal-thead">
                <span className="tc-col-time">{searching ? "Date" : "Time"}</span>
                <span className="tc-col-cur">Currency</span>
                <span className="tc-col-event">Event</span>
                <span className="tc-col-icon">Alert</span>
                <span className="tc-col-icon">Detail</span>
                <span className="tc-col-num">Actual</span>
                <span className="tc-col-num">Forecast</span>
                <span className="tc-col-num">Previous</span>
              </div>
              {events.map((e) => {
                const hist = historyById[e.id];
                const expanded = expandedId === e.id;
                const occursAt = new Date(e.occursAt);
                const isPast = occursAt.getTime() < now.getTime();
                const cmp = compareActualToForecast(e.actual, e.forecast);
                const watched = alerts.watchedEventKeys.includes(newsEventWatchKey(e.currency, e.title));
                return (
                  <Fragment key={e.id}>
                    <div
                      className={`trade-cal-tr${expanded ? " expanded" : ""}${isPast ? " past" : ""}`}
                      onClick={() => toggleExpand(e)}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="tc-col-time mono">
                        {searching ? enShortDateFmt.format(occursAt) : enTimeFmt.format(occursAt)}
                      </span>
                      <span className="tc-col-cur">
                        <span className="trade-cal-impact-dot" style={{ background: IMPACT_COLORS[e.impact] }} title={IMPACT_LABELS[e.impact]} />
                        <b className="mono">{e.currency}</b>
                      </span>
                      <span className="tc-col-event" title={e.title}>{e.title}</span>
                      <span className="tc-col-icon">
                        <button
                          type="button"
                          className={`trade-cal-icon-btn${watched ? " active" : ""}`}
                          onClick={(ev) => { ev.stopPropagation(); toggleWatchEvent(e); }}
                          aria-label={watched ? "حذفِ هشدار برای این رویداد" : "هشدار برای این رویداد"}
                          title={watched ? "هشدار روشن است" : "هشدار بده"}
                        >
                          {watched ? <BellRing size={13} /> : <Bell size={13} />}
                        </button>
                      </span>
                      <span className="tc-col-icon">
                        <button
                          type="button"
                          className={`trade-cal-icon-btn${expanded ? " active" : ""}`}
                          onClick={(ev) => { ev.stopPropagation(); toggleExpand(e); }}
                          aria-label="دیتیل و تاریخچه"
                          title="دیتیل و تاریخچه"
                        >
                          <Info size={13} />
                        </button>
                      </span>
                      <span
                        className={`tc-col-num mono${e.actual ? "" : " muted"}`}
                        data-label="Actual"
                        style={cmp === "up" ? { color: "var(--accent)" } : cmp === "down" ? { color: "#E05252" } : undefined}
                      >
                        {e.actual || "—"}
                      </span>
                      <span className="tc-col-num mono" data-label="Forecast">{e.forecast || "—"}</span>
                      <span className="tc-col-num mono" data-label="Previous">{e.previous || "—"}</span>
                    </div>

                    {expanded && (
                      <div className="trade-cal-history">
                        <div className="trade-cal-impact-line">
                          <span className="trade-cal-impact-dot" style={{ background: IMPACT_COLORS[e.impact] }} />
                          میزان تأثیر: <b>{IMPACT_LABELS[e.impact]}</b>
                        </div>
                        <div className="trade-cal-detail">
                          {e.description || "توضیحی برای این رویداد ثبت نشده."}
                        </div>
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
                            {hist.map((h) => {
                              const hcmp = compareActualToForecast(h.actual, h.forecast);
                              return (
                                <div key={h.id} className="trade-cal-history-row">
                                  <span>{enShortDateFmt.format(new Date(h.occursAt))}</span>
                                  <span
                                    className="mono"
                                    style={hcmp === "up" ? { color: "var(--accent)" } : hcmp === "down" ? { color: "#E05252" } : undefined}
                                  >
                                    {h.actual || "—"}
                                  </span>
                                  <span className="mono">{h.forecast || "—"}</span>
                                  <span className="mono">{h.previous || "—"}</span>
                                </div>
                              );
                            })}
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

  // ریشه‌یابیِ باگِ قدیمیِ «تاریخچه کار نمی‌کند»: هر جدِ دارایِ
  // filter/backdrop-filter برای فرزندهایِ position:fixed یک
  // containing-block جدید می‌سازد — یعنی inset:0 این بک‌دراپ به‌جایِ کلِ
  // ویوپورت، فقط نسبت‌به همون جدِ شیشه‌ای حساب می‌شد و پاپ‌آپ یا اصلا دیده
  // نمی‌شد یا جایِ درستی نمی‌نشست (حالا که بارِ تقویم دیگه هیچ باکسِ
  // شیشه‌ای‌ای نداره، این خطر عملا از بین رفته، ولی createPortal همچنان
  // درستیه — هر جدِ آینده‌ای هم اگه backdrop-filter بگیره این پاپ‌آپ سالم
  // می‌مونه). createPortal با بردنِ این عنصر به body، مستقیم زیرِ
  // containing-blockِ ویوپورت می‌رود — دقیقاً همان ترفندِ TradeKebabMenu.
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
