"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Filter } from "lucide-react";
import { faNum, isoLocal } from "@/lib/jalali";
import { getSetting } from "@/lib/storage";
import { PanelSkeleton } from "./PanelSkeleton";
import { SegmentedTabs } from "./SegmentedTabs";
import { formatTradeDateTime, formatTradeTime } from "@/lib/tradeDateTime";
import { CAL_SYSTEM_KEY, CalSystem } from "@/lib/tradeTypes";
import {
  CALENDAR_CURRENCIES, EconomicEventDto, EconomicImpact,
  IMPACT_COLORS, IMPACT_LABELS, IMPACT_ORDER, currencyMeta,
} from "@/lib/economicCalendar";

type RangeKey = "today" | "tomorrow" | "week";

// همه‌ی ساعت‌ها به وقتِ محلیِ خودِ مرورگرِ کاربر نشان داده می‌شوند (رویدادها
// در دیتابیس UTCاند). گروه‌بندی هم بر اساس همان روزِ محلی است، نه روزِ UTC —
// وگرنه برای کاربرِ ایران، رویدادِ ۰۳:۳۰ بامداد در گروهِ «دیروز» می‌افتاد.
function rangeOf(key: RangeKey): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (key === "today") return { from: isoLocal(start), to: isoLocal(start) };
  if (key === "tomorrow") {
    const t = new Date(start.getTime() + 86_400_000);
    return { from: isoLocal(t), to: isoLocal(t) };
  }
  return { from: isoLocal(start), to: isoLocal(new Date(start.getTime() + 6 * 86_400_000)) };
}

export function EconomicCalendarPanel() {
  const [range, setRange] = useState<RangeKey>("today");
  const [events, setEvents] = useState<EconomicEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  // فقط بارِ اول اسکلت نشان می‌دهیم؛ با هر تغییرِ فیلتر، لیستِ قبلی سرِ جایش
  // می‌ماند و کمی کم‌رنگ می‌شود. قبلاً هر کلیک روی یک فیلتر کلِ لیست را با
  // اسکلت جایگزین می‌کرد و همان پرش، حسِ کُندی و ناپایداری می‌داد.
  const [firstLoad, setFirstLoad] = useState(true);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [impacts, setImpacts] = useState<EconomicImpact[]>([]);

  useEffect(() => { getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = rangeOf(range);
      const qs = new URLSearchParams({ from, to });
      if (currencies.length) qs.set("currencies", currencies.join(","));
      if (impacts.length) qs.set("impacts", impacts.join(","));
      const res = await fetch(`/api/trade/economic-calendar?${qs}`);
      setEvents(res.ok ? (await res.json()).events || [] : []);
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [range, currencies, impacts]);

  useEffect(() => { load(); }, [load]);

  // گروه‌بندی بر اساسِ روزِ محلی
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
      <SegmentedTabs
        active={range}
        onChange={setRange}
        options={[
          { value: "today" as const, label: "امروز" },
          { value: "tomorrow" as const, label: "فردا" },
          { value: "week" as const, label: "این هفته" },
        ]}
      />

      <div className="trade-cal-filter-bar">
        <button type="button" className="trade-ghost-btn" onClick={() => setFiltersOpen((v) => !v)}>
          <Filter size={13} /> فیلتر
          {(currencies.length || impacts.length) ? ` (${faNum(currencies.length + impacts.length)})` : ""}
        </button>
        {(currencies.length > 0 || impacts.length > 0) && (
          <button type="button" className="trade-ghost-btn" onClick={() => { setCurrencies([]); setImpacts([]); }}>
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
          <div className="trade-cal-day-title">{formatTradeDateTime(list[0].occursAt, calSystem, false)}</div>
          {list.map((e) => {
            const meta = currencyMeta(e.currency);
            return (
              <div key={e.id} className="trade-cal-event">
                <span className="trade-cal-time mono">{formatTradeTime(e.occursAt)}</span>
                <span className="trade-cal-impact" style={{ background: IMPACT_COLORS[e.impact] }} title={IMPACT_LABELS[e.impact]} />
                <span className="trade-cal-main">
                  <span className="trade-cal-title">
                    {meta?.flag} <b className="mono">{e.currency}</b> — {e.title}
                  </span>
                  <span className="trade-cal-values">
                    <span>واقعی: <b className={e.actual ? "mono" : "mono muted"}>{e.actual ? faNum(e.actual) : "—"}</b></span>
                    <span>پیش‌بینی: <b className="mono">{e.forecast ? faNum(e.forecast) : "—"}</b></span>
                    <span>قبلی: <b className="mono">{e.previous ? faNum(e.previous) : "—"}</b></span>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      ))}
      </div>
      )}
    </div>
  );
}
