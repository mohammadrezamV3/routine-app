"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateTime } from "@/lib/adminFormat";
import { CALENDAR_CURRENCIES, EconomicImpact, IMPACT_LABELS, IMPACT_ORDER } from "@/lib/economicCalendar";

type EventRow = {
  id: string; title: string; country: string; currency: string; impact: EconomicImpact;
  occursAt: string; actual: string | null; forecast: string | null; previous: string | null; source: string;
};
type Resp = { events: EventRow[]; externalSource: string };

// ورود دستی رویدادهای تقویم اقتصادی + همگام‌سازیِ دستی از منبعِ بیرونی
// (پیش‌فرض فارکس‌فکتوری، یا ECONOMIC_CALENDAR_URL اگه ست شده باشه). همگام‌سازیِ
// خودکار با یک crontab بیرونی روی /api/cron/economic-calendar انجام می‌شه —
// این صفحه راهِ دستی/فوریِ همون کار رو هم می‌ده.
export default function AdminEconomicCalendarPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [impact, setImpact] = useState<EconomicImpact>("HIGH");
  const [occursAt, setOccursAt] = useState("");
  const [forecast, setForecast] = useState("");
  const [previous, setPrevious] = useState("");
  const [actual, setActual] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/economic-events").then((r) => r.json()).then(setData);
  }
  useEffect(load, []);

  // برای وقتی crontabِ سرور (deploy/cron.example) هنوز ست نشده یا ادمین
  // نمی‌خواد تا اجرای بعدیِ کرانِ روزانه صبر کنه — همون منطقِ کران رو دستی
  // و فوری صدا می‌زنه.
  async function syncNow() {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg(null);
    setError(null);
    const res = await fetch("/api/admin/economic-events/sync", { method: "POST" });
    const body = await res.json().catch(() => null);
    setSyncing(false);
    if (!res.ok) { setError(body?.error || "همگام‌سازی ناموفق بود"); return; }
    setSyncMsg(`${body.fetched} رویداد از ${body.source} گرفته شد (${body.created} جدید، ${body.updated} به‌روزشده)`);
    load();
  }

  async function create() {
    if (!title.trim() || !occursAt || saving) return;
    setSaving(true);
    setError(null);
    const country = CALENDAR_CURRENCIES.find((c) => c.code === currency)?.country || currency.slice(0, 2);
    const res = await fetch("/api/admin/economic-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(), currency, country, impact,
        // فیلد datetime-local وقت محلی ادمین را می‌دهد؛ اینجا به ISO/UTC
        // تبدیل می‌شود تا با بقیه‌ی داده‌ی اپ هم‌قرارداد بماند.
        occursAt: new Date(occursAt).toISOString(),
        forecast: forecast.trim() || null,
        previous: previous.trim() || null,
        actual: actual.trim() || null,
      }),
    });
    const body = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) { setError(body?.error || "خطا در ثبت رویداد"); return; }
    setTitle(""); setForecast(""); setPrevious(""); setActual("");
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/economic-events?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <section>
      <h1>تقویم اقتصادی</h1>
      <div className="account-content-hint">
        منبعِ فعلی: <b>{data?.externalSource || "…"}</b> — یک crontab بیرونی روی سرور باید روزی یک‌بار
        <code style={{ margin: "0 4px" }}>/api/cron/economic-calendar</code>
        رو صدا بزنه (نگاه کن به <code>deploy/cron.example</code>)؛ اگه هنوز ست نشده یا می‌خوای همین الان
        به‌روز بشه، دکمه‌ی «همگام‌سازی الان» رو بزن. رویدادهایی که این‌جا دستی می‌سازی از همگام‌سازی
        دست‌نخورده می‌مانند.
      </div>
      <div style={{ margin: "8px 0 16px" }}>
        <button className="account-outline-btn" onClick={syncNow} disabled={syncing}>
          {syncing ? "در حال همگام‌سازی..." : "همگام‌سازی الان"}
        </button>
        {syncMsg && <span className="account-content-hint" style={{ marginRight: 10 }}>{syncMsg}</span>}
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">ثبت رویداد جدید</span></div>
        <div className="admin-form-row">
          <div className="admin-form-field">
            <label>عنوان</label>
            <input className="admin-input" style={{ width: 220 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلا CPI" maxLength={160} />
          </div>
          <div className="admin-form-field">
            <label>ارز</label>
            <select className="admin-input" style={{ width: 130 }} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CALENDAR_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
            </select>
          </div>
          <div className="admin-form-field">
            <label>سطح تأثیر</label>
            <select className="admin-input" style={{ width: 140 }} value={impact} onChange={(e) => setImpact(e.target.value as EconomicImpact)}>
              {IMPACT_ORDER.map((i) => <option key={i} value={i}>{IMPACT_LABELS[i]}</option>)}
            </select>
          </div>
          <div className="admin-form-field">
            <label>زمان رویداد</label>
            <input className="admin-input" type="datetime-local" style={{ width: 200 }} value={occursAt} onChange={(e) => setOccursAt(e.target.value)} />
          </div>
          <div className="admin-form-field">
            <label>پیش‌بینی</label>
            <input className="admin-input" style={{ width: 100 }} value={forecast} onChange={(e) => setForecast(e.target.value)} maxLength={24} />
          </div>
          <div className="admin-form-field">
            <label>قبلی</label>
            <input className="admin-input" style={{ width: 100 }} value={previous} onChange={(e) => setPrevious(e.target.value)} maxLength={24} />
          </div>
          <div className="admin-form-field">
            <label>واقعی</label>
            <input className="admin-input" style={{ width: 100 }} value={actual} onChange={(e) => setActual(e.target.value)} maxLength={24} />
          </div>
          <div className="admin-form-field">
            <label>&nbsp;</label>
            <button className="account-outline-btn" onClick={create} disabled={!title.trim() || !occursAt || saving}>
              {saving ? "..." : "ثبت رویداد"}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="trade-form-error">{error}</div>}

      {!data?.events.length && <EmptyState message="هنوز رویدادی ثبت نشده" />}

      <div className="trade-list" style={{ marginTop: 16 }}>
        {data?.events.map((e) => (
          <div key={e.id} className="trade-row" style={{ cursor: "default" }}>
            <span className="trade-row-main">
              <span className="trade-row-symbol">{e.currency} — {e.title}</span>
              <span className="trade-row-sub">
                {formatDateTime(e.occursAt)} · {IMPACT_LABELS[e.impact]} · منبع: {e.source}
              </span>
            </span>
            <button type="button" className="trade-icon-btn danger" onClick={() => remove(e.id)} aria-label="حذف">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
