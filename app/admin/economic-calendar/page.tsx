"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, RefreshCw, Search, Trash2, X } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/EmptyState";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { AdminTabBar } from "@/components/admin/TabBar";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { formatDateTime, toLocalInputValue } from "@/lib/adminFormat";
import { CALENDAR_CURRENCIES, EconomicImpact, IMPACT_LABELS, IMPACT_ORDER } from "@/lib/economicCalendar";
import { normalizeFa } from "@/lib/utils";

type EventRow = {
  id: string; title: string; country: string; currency: string; impact: EconomicImpact;
  occursAt: string; actual: string | null; forecast: string | null; previous: string | null;
  description: string | null; source: string;
};
type Resp = { events: EventRow[]; externalSource: string };
type SourceFilter = "all" | "manual" | "synced";
type SyncResult = { source: string; fetched: number; created: number; updated: number; removed?: number };

const IMPACT_BADGE: Record<EconomicImpact, "red" | "amber" | "gray"> = { HIGH: "red", MEDIUM: "amber", LOW: "gray" };
const SOURCE_TABS: { key: SourceFilter; label: string }[] = [
  { key: "all", label: "همه" },
  { key: "manual", label: "دستی" },
  { key: "synced", label: "همگام‌شده" },
];

// ورود دستی رویدادهای تقویم اقتصادی + همگام‌سازیِ دستی از منبعِ بیرونی.
// منبع با همون اولویتِ lib/economicCalendar انتخاب می‌شه (ECONOMIC_CALENDAR_URL
// → JBlanked با ECONOMIC_CALENDAR_API_KEY → TradingViewِ بی‌کلید). تقویم به
// هیچ زمان‌بندِ بیرونی وابسته نیست (کرانِ روزانه + ensureFreshCalendar روی
// روتِ خواندن) — این صفحه فقط راهِ دستی/فوریِ همون کار رو هم می‌ده.
export default function AdminEconomicCalendarPage() {
  const toast = useAdminToast();
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
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
  const [syncError, setSyncError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [deleting, setDeleting] = useState<EventRow | null>(null);
  // null یعنی حالتِ «ثبتِ جدید»؛ وگرنه همین فرم دارد همان رویداد را ویرایش
  // می‌کند. یک فرم برای هر دو کار، چون فیلدها دقیقاً یکی‌اند — دو فرمِ جدا
  // یعنی دو جا برای از قلم‌افتادنِ یک فیلد.
  const [editing, setEditing] = useState<EventRow | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/admin/economic-events");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // برای وقتی ادمین نمی‌خواد تا اجرای بعدیِ کران/تازه‌سازیِ خودکار صبر کنه —
  // همون منطقِ کران رو دستی و فوری صدا می‌زنه.
  async function syncNow() {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg(null);
    setSyncError(null);
    try {
      const r = await adminFetch<SyncResult>("/api/admin/economic-events/sync", { method: "POST" });
      setSyncMsg(
        `${r.fetched} رویداد از ${r.source} گرفته شد (${r.created} جدید، ${r.updated} به‌روزشده` +
        `${r.removed ? `، ${r.removed} حذف‌شده` : ""})`,
      );
      load();
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "همگام‌سازی ناموفق بود");
    } finally {
      setSyncing(false);
    }
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
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save() {
    if (!title.trim() || !occursAt || saving) return;
    const when = new Date(occursAt);
    if (isNaN(when.getTime())) { setError("تاریخ و ساعت رویداد نامعتبر است"); return; }
    setSaving(true);
    setError(null);
    const country = CALENDAR_CURRENCIES.find((c) => c.code === currency)?.country || currency.slice(0, 2);
    const payload = {
      title: title.trim(), currency, country, impact,
      // فیلد datetime-local وقت محلی ادمین را می‌دهد؛ اینجا به ISO/UTC
      // تبدیل می‌شود تا با بقیه‌ی داده‌ی اپ هم‌قرارداد بماند.
      occursAt: when.toISOString(),
      forecast: forecast.trim() || null,
      previous: previous.trim() || null,
      actual: actual.trim() || null,
      description: description.trim() || null,
    };
    try {
      await adminFetch("/api/admin/economic-events", {
        method: editing ? "PATCH" : "POST",
        json: editing ? { ...payload, id: editing.id } : payload,
      });
      toast(editing ? "تغییرات ذخیره شد" : "رویداد ثبت شد");
      resetForm();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : (editing ? "خطا در ویرایش رویداد" : "خطا در ثبت رویداد"));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await adminFetch(`/api/admin/economic-events?id=${encodeURIComponent(deleting.id)}`, { method: "DELETE" });
      toast("رویداد حذف شد");
      if (editing?.id === deleting.id) resetForm();
      setDeleting(null);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "حذف ناموفق بود", "err");
    }
  }

  const events = useMemo(() => {
    const q = normalizeFa(query);
    return (data?.events || []).filter((e) => {
      if (sourceFilter === "manual" && e.source !== "MANUAL") return false;
      if (sourceFilter === "synced" && e.source === "MANUAL") return false;
      return !q || normalizeFa(`${e.title} ${e.currency}`).includes(q);
    });
  }, [data, query, sourceFilter]);

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">تقویم اقتصادی</div>
          <div className="admin-section-hint" style={{ margin: 0 }}>
            منبعِ فعلی: <b className="admin-ltr-inline">{data?.externalSource || "…"}</b> — تقویم خودکار تازه می‌شه
            (کرانِ روزانه + تازه‌سازیِ خودکارِ داده‌ی کهنه)؛ اگه می‌خوای همین الان به‌روز بشه، «همگام‌سازی الان»
            رو بزن. رویدادهایی که این‌جا دستی می‌سازی از همگام‌سازی دست‌نخورده می‌مانند.
          </div>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="admin-btn" onClick={syncNow} disabled={syncing}>
            {syncing ? <Loader2 size={14} className="trade-spin" /> : <RefreshCw size={14} />}
            {syncing ? "در حال همگام‌سازی…" : "همگام‌سازی الان"}
          </button>
        </div>
      </div>
      {syncMsg && <div className="admin-sync-msg" role="status">{syncMsg}</div>}
      {syncError && <div className="admin-form-error" role="alert">{syncError}</div>}

      <div className="admin-card admin-econ-form" ref={formRef}>
        <div className="admin-chart-head">
          <span className="admin-chart-title">{editing ? `ویرایش: ${editing.title}` : "ثبت رویداد جدید"}</span>
        </div>
        {/* رویدادِ همگام‌شده را sync بعدی دوباره می‌نویسد — جز توضیحات، که
            عمداً محافظت شده (lib/economicCalendar.ts). بدونِ این هشدار،
            ادمین عددی را اصلاح می‌کند و چند دقیقه بعد بی‌دلیل برمی‌گردد. */}
        {editing && editing.source !== "MANUAL" && (
          <div className="admin-section-hint" style={{ margin: "0 0 12px" }}>
            این رویداد از <b>{editing.source}</b> همگام‌سازی شده — هر تغییری جز «توضیحات» در
            همگام‌سازیِ بعدی با مقدارِ خودِ منبع بازنویسی می‌شود.
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>عنوان</span>
              <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلا CPI" maxLength={160} required />
            </label>
            <label className="admin-field">
              <span>ارز</span>
              <select className="admin-input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {/* ارزِ رویدادهای همگام‌شده همیشه توی این نُه‌تا نیست؛ بدونِ این
                    گزینه‌ی اضافه، باز کردنِ چنین رویدادی در فرم بی‌صدا ارزش را
                    به USD عوض می‌کرد و ذخیره همان را می‌نوشت. */}
                {!CALENDAR_CURRENCIES.some((c) => c.code === currency) && (
                  <option value={currency}>{currency}</option>
                )}
                {CALENDAR_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
              </select>
            </label>
            <label className="admin-field">
              <span>سطح تأثیر</span>
              <select className="admin-input" value={impact} onChange={(e) => setImpact(e.target.value as EconomicImpact)}>
                {IMPACT_ORDER.map((i) => <option key={i} value={i}>{IMPACT_LABELS[i]}</option>)}
              </select>
            </label>
            <label className="admin-field">
              <span>زمان رویداد (وقتِ محلیِ خودت)</span>
              <input className="admin-input" type="datetime-local" value={occursAt} onChange={(e) => setOccursAt(e.target.value)} required />
            </label>
            <label className="admin-field">
              <span>پیش‌بینی</span>
              <input className="admin-input admin-ltr" value={forecast} onChange={(e) => setForecast(e.target.value)} maxLength={24} />
            </label>
            <label className="admin-field">
              <span>قبلی</span>
              <input className="admin-input admin-ltr" value={previous} onChange={(e) => setPrevious(e.target.value)} maxLength={24} />
            </label>
            <label className="admin-field">
              <span>واقعی</span>
              <input className="admin-input admin-ltr" value={actual} onChange={(e) => setActual(e.target.value)} maxLength={24} />
            </label>
            <label className="admin-field admin-field-wide">
              <span>توضیحات (بخش دیتیل)</span>
              <textarea
                className="admin-input"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اختیاری — مثلا منبع، معنی شاخص، اثر معمولش روی ارز…"
                maxLength={600}
              />
            </label>
          </div>
          {error && <div className="admin-form-error" role="alert">{error}</div>}
          <div className="admin-modal-actions">
            {editing && (
              <button type="button" className="admin-btn" onClick={resetForm} disabled={saving}>
                <X size={14} /> انصراف
              </button>
            )}
            <button type="submit" className="admin-btn primary" disabled={!title.trim() || !occursAt || saving}>
              {saving && <Loader2 size={14} className="trade-spin" />}
              {editing ? "ذخیره‌ی تغییرات" : "ثبت رویداد"}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-toolbar admin-econ-toolbar">
        <label className="admin-search">
          <Search size={15} />
          <input className="admin-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجوی عنوان یا ارز…" aria-label="جستجو" />
        </label>
        <AdminTabBar items={SOURCE_TABS} active={sourceFilter} onChange={setSourceFilter} />
      </div>

      {!data ? (
        loading || !failed ? <LoadingState /> : <ErrorState onRetry={load} />
      ) : events.length === 0 ? (
        <EmptyState message={data.events.length ? "رویدادی با این فیلتر پیدا نشد" : "هنوز رویدادی ثبت نشده"} />
      ) : (
        <div className={`trade-list${loading ? " admin-list-dim" : ""}`}>
          {events.map((e) => (
            <div key={e.id} className={`trade-row admin-econ-row${editing?.id === e.id ? " is-editing" : ""}`}>
              <span className="trade-row-main">
                <span className="trade-row-symbol">
                  <span className="admin-ltr-inline">{e.currency}</span> — {e.title}
                </span>
                <span className="trade-row-sub">
                  <span className="admin-ltr-inline">{formatDateTime(e.occursAt)}</span>
                  {(e.actual || e.forecast || e.previous) && (
                    <> · <span className="admin-ltr-inline">A {e.actual || "—"} / F {e.forecast || "—"} / P {e.previous || "—"}</span></>
                  )}
                </span>
                <span className="admin-badge-row">
                  <span className={`admin-badge ${IMPACT_BADGE[e.impact]}`}>{IMPACT_LABELS[e.impact]}</span>
                  <span className={`admin-badge ${e.source === "MANUAL" ? "green" : "gray"}`}>{e.source === "MANUAL" ? "دستی" : e.source}</span>
                </span>
              </span>
              <span className="admin-row-actions">
                <button type="button" className="admin-icon-btn" onClick={() => startEdit(e)} aria-label="ویرایش" title="ویرایش">
                  <Pencil size={15} />
                </button>
                <button type="button" className="admin-icon-btn admin-icon-danger" onClick={() => setDeleting(e)} aria-label="حذف" title="حذف">
                  <Trash2 size={15} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {deleting && (
        <ConfirmModal
          title="حذف رویداد"
          message={
            <>
              «{deleting.title}» حذف می‌شه.
              {deleting.source !== "MANUAL" && " این رویداد همگام‌شده‌ست — اگه هنوز توی منبع باشه، همگام‌سازیِ بعدی دوباره اضافه‌اش می‌کنه."}
            </>
          }
          confirmLabel="حذف"
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
