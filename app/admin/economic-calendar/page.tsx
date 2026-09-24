"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateTime, toLocalInputValue } from "@/lib/adminFormat";
import { CALENDAR_CURRENCIES, EconomicImpact, IMPACT_LABELS, IMPACT_ORDER } from "@/lib/economicCalendar";

type EventRow = {
  id: string; title: string; country: string; currency: string; impact: EconomicImpact;
  occursAt: string; actual: string | null; forecast: string | null; previous: string | null;
  description: string | null; source: string;
};
type Resp = { events: EventRow[]; externalSource: string };

// ورود دستی رویدادهای تقویم اقتصادی + همگام‌سازیِ دستی از منبعِ بیرونی
// (پیش‌فرض JBlanked Calendar API — نیازمندِ ECONOMIC_CALENDAR_API_KEY، یا
// ECONOMIC_CALENDAR_URL اگه ست شده باشه). همگام‌سازیِ خودکار با یک crontab
// بیرونی روی /api/cron/economic-calendar انجام می‌شه — این صفحه راهِ
// دستی/فوریِ همون کار رو هم می‌ده.
export default function AdminEconomicCalendarPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [impact, setImpact] = useState<EconomicImpact>("HIGH");
  const [occursAt, setOccursAt] = useState("");
  const [forecast, setForecast] = useState("");
  const [previous, setPrevious] = useState("");
  const [actual, setActual] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  // null یعنی حالتِ «ثبتِ جدید»؛ وگرنه همین فرم دارد همان رویداد را ویرایش
  // می‌کند. یک فرم برای هر دو کار، چون فیلدها دقیقاً یکی‌اند — دو فرمِ جدا
  // یعنی دو جا برای از قلم‌افتادنِ یک فیلد.
  const [editing, setEditing] = useState<EventRow | null>(null);

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

  function resetForm() {
    setEditing(null);
    setTitle(""); setForecast(""); setPrevious(""); setActual(""); setDescription("");
    setOccursAt(""); setCurrency("USD"); setImpact("HIGH");
    setError(null);
  }

  /** ردیف را داخلِ همان فرمِ بالا باز می‌کند. */
  function startEdit(e: EventRow) {
    setEditing(e);
    setTitle(e.title);
    setCurrency(e.currency);
    setImpact(e.impact);
    setOccursAt(toLocalInputValue(e.occursAt));
    setForecast(e.forecast || "");
    setPrevious(e.previous || "");
    setActual(e.actual || "");
    setDescription(e.description || "");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!title.trim() || !occursAt || saving) return;
    setSaving(true);
    setError(null);
    const country = CALENDAR_CURRENCIES.find((c) => c.code === currency)?.country || currency.slice(0, 2);
    const payload = {
      title: title.trim(), currency, country, impact,
      // فیلد datetime-local وقت محلی ادمین را می‌دهد؛ اینجا به ISO/UTC
      // تبدیل می‌شود تا با بقیه‌ی داده‌ی اپ هم‌قرارداد بماند.
      occursAt: new Date(occursAt).toISOString(),
      forecast: forecast.trim() || null,
      previous: previous.trim() || null,
      actual: actual.trim() || null,
      description: description.trim() || null,
    };
    const res = await fetch("/api/admin/economic-events", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { ...payload, id: editing.id } : payload),
    });
    const body = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) { setError(body?.error || (editing ? "خطا در ویرایش رویداد" : "خطا در ثبت رویداد")); return; }
    resetForm();
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
        <div className="admin-chart-head">
          <span className="admin-chart-title">{editing ? `ویرایش: ${editing.title}` : "ثبت رویداد جدید"}</span>
          {editing && (
            <button type="button" className="account-outline-btn" onClick={resetForm}>
              <X size={14} style={{ marginLeft: 5, verticalAlign: "-2px" }} /> انصراف
            </button>
          )}
        </div>
        {/* رویدادِ همگام‌شده را sync بعدی دوباره می‌نویسد — جز توضیحات، که
            عمداً محافظت شده (lib/economicCalendar.ts). بدونِ این هشدار،
            ادمین عددی را اصلاح می‌کند و چند دقیقه بعد بی‌دلیل برمی‌گردد. */}
        {editing && editing.source !== "MANUAL" && (
          <div className="account-content-hint" style={{ marginBottom: 10 }}>
            این رویداد از <b>{editing.source}</b> همگام‌سازی شده — هر تغییری جز «توضیحات» در
            همگام‌سازیِ بعدی با مقدارِ خودِ منبع بازنویسی می‌شود.
          </div>
        )}
        <div className="admin-form-row">
          <div className="admin-form-field">
            <label>عنوان</label>
            <input className="admin-input" style={{ width: 220 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلا CPI" maxLength={160} />
          </div>
          <div className="admin-form-field">
            <label>ارز</label>
            <select className="admin-input" style={{ width: 130 }} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {/* ارزِ رویدادهای همگام‌شده همیشه توی این نُه‌تا نیست؛ بدونِ این
                  گزینه‌ی اضافه، باز کردنِ چنین رویدادی در فرم بی‌صدا ارزش را
                  به USD عوض می‌کرد و ذخیره همان را می‌نوشت. */}
              {!CALENDAR_CURRENCIES.some((c) => c.code === currency) && (
                <option value={currency}>{currency}</option>
              )}
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
          <div className="admin-form-field" style={{ flex: 1, minWidth: 220 }}>
            <label>توضیحات (بخش دیتیل)</label>
            <textarea
              className="admin-input"
              style={{ width: "100%", minHeight: 44, resize: "vertical" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اختیاری — مثلا منبع، معنی شاخص، اثر معمولش روی ارز…"
              maxLength={600}
            />
          </div>
          <div className="admin-form-field">
            <label>&nbsp;</label>
            <button className="account-outline-btn" onClick={save} disabled={!title.trim() || !occursAt || saving}>
              {saving ? "..." : editing ? "ذخیره‌ی تغییرات" : "ثبت رویداد"}
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
            <button type="button" className="trade-icon-btn" onClick={() => startEdit(e)} aria-label="ویرایش">
              <Pencil size={15} />
            </button>
            <button type="button" className="trade-icon-btn danger" onClick={() => remove(e.id)} aria-label="حذف">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
