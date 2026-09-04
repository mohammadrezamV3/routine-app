"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Filter, Loader2 } from "lucide-react";
import { faNum, isoLocal } from "@/lib/jalali";
import { PanelSkeleton } from "./PanelSkeleton";
// توجه: SegmentedTabs امروز/فردا/این‌هفته دیگه لازم نیست — لیست حالا
// پیوسته‌ست، مثل ForexFactory.
import {
  CALENDAR_CURRENCIES, EconomicEventDto, EconomicImpact,
  IMPACT_COLORS, IMPACT_LABELS, IMPACT_ORDER, currencyMeta,
} from "@/lib/economicCalendar";

const DAYS_PAGE = 14;
const MAX_DAYS_AHEAD = 60;

// دیگه سه‌تب امروز/فردا/این‌هفته نداریم — درست مثل ForexFactory، یک لیست
// پیوسته‌ی ردیفی از روزهای پیش‌رو (با دکمه‌ی «روزهای بیشتر» برای ادامه‌ش).
function rangeFromToday(daysAhead: number): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { from: isoLocal(start), to: isoLocal(new Date(start.getTime() + daysAhead * 86_400_000)) };
}

// طبقِ درخواستِ صریح: این جدول باید دقیقاً مثلِ خودِ فارکس‌فکتوری انگلیسی
// بمونه — هم متنِ رویدادها (که از منبع همین‌جوری میان، دیگه به فارسی
// ترجمه نمی‌شن — نگاه کن به lib/economicCalendar.ts) هم اعداد (رقمِ
// لاتین، نه faNum). برای همین اینجا از calSystem/formatTradeTime/
// formatTradeDateتِ سراسریِ اپ (که رقم‌ها رو فارسی می‌کنن) استفاده نمی‌کنیم؛
// یک فرمتِ محلیِ انگلیسیِ مستقل داریم، فقط برای همین بخش.
const enTimeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
const enDayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });

export function EconomicCalendarPanel() {
  const [daysAhead, setDaysAhead] = useState(DAYS_PAGE);
  const [events, setEvents] = useState<EconomicEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  // فقط بار اول اسکلت نشان می‌دهیم؛ با هر تغییر فیلتر/بازه، لیست قبلی سر
  // جایش می‌ماند و کمی کم‌رنگ می‌شود. قبلا هر کلیک روی یک فیلتر کل لیست را
  // با اسکلت جایگزین می‌کرد و همان پرش، حس کندی و ناپایداری می‌داد.
  const [firstLoad, setFirstLoad] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [otherCurrencies, setOtherCurrencies] = useState(false);
  const [impacts, setImpacts] = useState<EconomicImpact[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = rangeFromToday(daysAhead);
      const qs = new URLSearchParams({ from, to });
      if (currencies.length) qs.set("currencies", currencies.join(","));
      if (otherCurrencies) qs.set("other", "1");
      if (impacts.length) qs.set("impacts", impacts.join(","));
      const res = await fetch(`/api/trade/economic-calendar?${qs}`);
      setEvents(res.ok ? (await res.json()).events || [] : []);
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [daysAhead, currencies, otherCurrencies, impacts]);

  useEffect(() => { load(); }, [load]);

  // گروه‌بندی بر اساس روز محلی
  const groups = useMemo(() => {
    const map = new Map<string, EconomicEventDto[]>();
    for (const e of events) {
      const key = isoLocal(new Date(e.occursAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [events]);

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
                {c.flag} {c.code}
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

      {loading && firstLoad && <PanelSkeleton />}

      {!firstLoad && !loading && !events.length && (
        <div className="item-line empty" style={{ marginTop: 16 }}>
          <CalendarClock size={15} style={{ verticalAlign: "-2px", marginLeft: 6 }} />
          رویدادی برای این بازه ثبت نشده است.
        </div>
      )}

      {!firstLoad && (
      <div style={{ opacity: loading ? 0.55 : 1, transition: "opacity .2s ease" }}>
      {groups.map(([day, list]) => (
        <div key={day} className="trade-cal-day">
          <div className="trade-cal-day-title ltr-inline">{enDayFmt.format(new Date(list[0].occursAt))}</div>
          {/* جدولِ ردیفی مثل ForexFactory — ستون‌های زمان/ارز/رویداد/واقعی/
              پیش‌بینی/قبلی هم‌ردیف، نه زیرِ هم؛ روی صفحه‌ی خیلی باریک با
              اسکرولِ افقیِ همین باکس (نه کلِ صفحه) جا می‌شه. طبقِ درخواستِ
              صریح، انگلیسی‌ست — دقیقاً مثلِ خودِ فارکس‌فکتوری. */}
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
              {list.map((e) => {
                const meta = currencyMeta(e.currency);
                return (
                  <div key={e.id} className="trade-cal-tr">
                    <span className="tc-col-time mono">{enTimeFmt.format(new Date(e.occursAt))}</span>
                    <span className="tc-col-cur">
                      <span className="trade-cal-impact-dot" style={{ background: IMPACT_COLORS[e.impact] }} title={IMPACT_LABELS[e.impact]} />
                      {meta?.flag} <b className="mono">{e.currency}</b>
                    </span>
                    <span className="tc-col-event" title={e.title}>{e.title}</span>
                    <span className={`tc-col-num mono${e.actual ? "" : " muted"}`}>{e.actual || "—"}</span>
                    <span className="tc-col-num mono">{e.forecast || "—"}</span>
                    <span className="tc-col-num mono">{e.previous || "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
      </div>
      )}

      {!firstLoad && !!events.length && daysAhead < MAX_DAYS_AHEAD && (
        <button
          type="button"
          className="trade-ghost-btn"
          style={{ width: "100%", justifyContent: "center", marginTop: 14 }}
          onClick={() => setDaysAhead((d) => Math.min(d + DAYS_PAGE, MAX_DAYS_AHEAD))}
          disabled={loading}
        >
          {loading ? <Loader2 size={14} className="trade-spin" /> : "روزهای بیشتر"}
        </button>
      )}
    </div>
  );
}
