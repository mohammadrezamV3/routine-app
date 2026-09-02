"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2, RefreshCw } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { formatTradeDateTime } from "@/lib/tradeDateTime";
import {
  CalSystem, CAL_SYSTEM_KEY,
} from "@/lib/tradeTypes";
import { getSetting } from "@/lib/storage";
import {
  EconomicEventDto, IMPACT_COLORS, IMPACT_LABELS, currencyMeta,
} from "@/lib/economicCalendar";

// کارتِ فشرده‌ی تقویم اقتصادی برای صفحه‌ی چارت — جایگزینِ «اخبار بازار».
//
// هر ردیف دقیقاً همان هشت فیلدی را دارد که فارکس‌فکتوری می‌دهد: رویداد،
// ارز، تاریخ، ساعت، اهمیت، پیش‌بینی، قبلی و واقعی.
//
// داده مثل بقیه‌ی اپ از جدولِ خودمان می‌آید (`/api/trade/economic-calendar`)
// نه مستقیم از فارکس‌فکتوری — کرانِ سمتِ سرور فید را داخلِ همان جدول
// می‌ریزد. مرورگر هیچ‌وقت به سرویسِ بیرونی وصل نمی‌شود.

function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeOf(iso: string) {
  const d = new Date(iso);
  return faNum(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
}

export function ChartCalendarPanel() {
  const [events, setEvents] = useState<EconomicEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [highOnly, setHighOnly] = useState(false);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");

  useEffect(() => { getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const to = new Date(now.getTime() + 6 * 86_400_000);
      const qs = new URLSearchParams({ from: isoLocal(now), to: isoLocal(to) });
      if (highOnly) qs.set("impacts", "HIGH");
      const res = await fetch(`/api/trade/economic-calendar?${qs}`);
      setEvents(res.ok ? (await res.json()).events || [] : []);
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [highOnly]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="trade-surface trade-cal-card">
      <div className="trade-panel-head">
        <span className="trade-panel-title">
          <CalendarClock size={16} /> تقویم اقتصادی
        </span>
        <div className="trade-cal-card-actions">
          <button
            type="button"
            className={`trade-ghost-btn${highOnly ? " active" : ""}`}
            onClick={() => setHighOnly((v) => !v)}
          >
            فقط تأثیر بالا
          </button>
          <button type="button" className="trade-icon-btn" onClick={load} disabled={loading} aria-label="به‌روزرسانی">
            {loading ? <Loader2 size={14} className="trade-spin" /> : <RefreshCw size={14} />}
          </button>
        </div>
      </div>

      {firstLoad && <div className="trade-chat-empty">در حال بارگذاری…</div>}

      {!firstLoad && !events.length && (
        <div className="trade-chat-empty">
          رویدادی برای هفت روز آینده ثبت نشده است.
        </div>
      )}

      {!firstLoad && !!events.length && (
        <div
          className="trade-cal-card-list thin-scroll"
          style={{ opacity: loading ? 0.55 : 1, transition: "opacity .2s ease" }}
        >
          {events.map((e) => {
            const meta = currencyMeta(e.currency);
            return (
              <div key={e.id} className="trade-cal-card-row">
                <span
                  className="trade-cal-impact"
                  style={{ background: IMPACT_COLORS[e.impact] }}
                  title={IMPACT_LABELS[e.impact]}
                />
                <span className="trade-cal-card-when">
                  <b className="mono">{timeOf(e.occursAt)}</b>
                  <span>{formatTradeDateTime(e.occursAt, calSystem, false)}</span>
                </span>
                <span className="trade-cal-card-main">
                  <span className="trade-cal-card-title">
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
      )}
    </div>
  );
}
