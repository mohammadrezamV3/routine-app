"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Filter, Loader2 } from "lucide-react";
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

export function EconomicCalendarPanel() {
  // مثلِ خودِ ForexFactory: یک روز در یک لحظه، با فلشِ قبلی/بعدی — نه
  // «روزهای بیشتر»ی که همه‌چیز رو یک‌جا پشتِ هم می‌ریخت.
  const [date, setDate] = useState(() => startOfLocalDay(new Date()));
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

      {/* ناوبریِ روز-به-روز، دقیقاً مثلِ خودِ ForexFactory — به‌جای دکمه‌ی
          «روزهای بیشتر»ی که همه‌ی روزها رو زیرِ هم تلنبار می‌کرد. */}
      <div className="trade-cal-daynav">
        <button type="button" className="trade-icon-btn" onClick={() => setDate((d) => addDays(d, -1))} aria-label="روزِ قبل">
          <ChevronRight size={18} />
        </button>
        <span className="trade-cal-daynav-label ltr-inline">
          {isSameDay(date, today) ? "Today: " : ""}
          {enDayFmt.format(date)}
        </span>
        <button type="button" className="trade-icon-btn" onClick={() => setDate((d) => addDays(d, 1))} aria-label="روزِ بعد">
          <ChevronLeft size={18} />
        </button>
        {!isSameDay(date, today) && (
          <button type="button" className="trade-ghost-btn trade-cal-daynav-today" onClick={() => setDate(today)}>
            امروز
          </button>
        )}
      </div>

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
                          <div className="trade-cal-history-status"><Loader2 size={14} className="trade-spin" /> در حال بارگذاری تاریخچه…</div>
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
  );
}
