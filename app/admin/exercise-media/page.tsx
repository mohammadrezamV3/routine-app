"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageOff, Trash2, Upload } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateTime } from "@/lib/adminFormat";
import { EXERCISE_CATALOG } from "@/lib/exerciseCatalog";
import { MAX_MEDIA_DATA_URL_LENGTH, MEDIA_MAX_EDGE, mediaKey } from "@/lib/exerciseMedia";
import { normalizeFa } from "@/lib/utils";

type Item = { nameKey: string; name: string; updatedAt: string };

// عکسِ حرکات همیشه قبل از ارسال سمتِ کلاینت کوچک می‌شود، نه سمتِ سرور:
// عکسِ خامِ گوشی چند مگابایت است و همان‌طور که هست هم در دیتابیس می‌ماند و
// هم دوباره برای هر کاربر دانلود می‌شود. ۷۲۰px برای کارتِ جزئیاتِ حرکت
// بیش‌ازحد کافی‌ست.
function compressToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MEDIA_MAX_EDGE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas")); return; }
      // PNGهای شفاف روی بومِ خالی سیاه می‌شوند؛ پس‌زمینه‌ی سفید همان چیزی‌ست
      // که کارتِ حرکت هم نشان می‌دهد.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}

// «عکس حرکات ورزشی» — ادمین برای هر حرکتِ کاتالوگ یک عکس می‌گذارد و همان
// عکس در کارتِ جزئیاتِ «مشاهده حرکات» به‌جای placeholder نشان داده می‌شود.
// نامِ حرکت از خودِ کاتالوگ انتخاب می‌شود (نه تایپِ آزاد) تا عکس به حرکتی
// که وجود ندارد نچسبد.
export default function AdminExerciseMediaPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch("/api/admin/exercise-media")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }
  useEffect(load, []);

  const haveKeys = useMemo(() => new Set((items || []).map((i) => i.nameKey)), [items]);

  // فقط وقتی کاربر چیزی تایپ کرده پیشنهاد می‌دهیم — رندرِ هر ~۳۰۰ حرکت
  // به‌صورت پیش‌فرض نه مفید است نه سریع.
  const suggestions = useMemo(() => {
    const q = normalizeFa(query);
    if (!q) return [];
    return EXERCISE_CATALOG.filter((e) => normalizeFa(e.name).includes(q)).slice(0, 8);
  }, [query]);

  async function pickFile(file: File | null) {
    if (!file) return;
    setError(null);
    try {
      const url = await compressToDataUrl(file);
      if (url.length > MAX_MEDIA_DATA_URL_LENGTH) {
        setError("حجم عکس حتی بعد از فشرده‌سازی زیاد است — عکس کوچک‌تری انتخاب کن");
        return;
      }
      setDataUrl(url);
    } catch {
      setError("این فایل عکس معتبری نیست");
    }
  }

  async function save() {
    if (!name || !dataUrl || saving) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/exercise-media", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, dataUrl }),
    });
    const body = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) { setError(body?.error || "ثبت عکس ناموفق بود"); return; }
    setName(""); setQuery(""); setDataUrl(null);
    if (fileRef.current) fileRef.current.value = "";
    load();
  }

  /** ردیفِ موجود را برای جایگزینیِ عکس داخلِ فرم باز می‌کند. */
  async function edit(item: Item) {
    setError(null);
    setName(item.name);
    setQuery(item.name);
    setDataUrl(null);
    const res = await fetch(`/api/admin/exercise-media?name=${encodeURIComponent(item.name)}`);
    const body = await res.json().catch(() => null);
    if (body?.media?.dataUrl) setDataUrl(body.media.dataUrl);
  }

  async function remove(item: Item) {
    await fetch(`/api/admin/exercise-media?name=${encodeURIComponent(item.name)}`, { method: "DELETE" });
    load();
  }

  return (
    <section>
      <h1>عکس حرکات ورزشی</h1>
      <div className="account-content-hint">
        برای هر حرکتِ کاتالوگ می‌توانی یک عکس بگذاری؛ همان عکس در «مشاهده حرکات» بالای کارتِ جزئیات
        نشان داده می‌شود. حرکتی که عکس ندارد مثل قبل placeholder می‌گیرد. عکس قبل از ارسال خودکار به
        حداکثر {MEDIA_MAX_EDGE} پیکسل کوچک می‌شود.
      </div>

      <div className="admin-chart-card" style={{ marginTop: 14 }}>
        <div className="admin-chart-head"><span className="admin-chart-title">افزودن / جایگزینی عکس</span></div>
        <div className="admin-form-row">
          <div className="admin-form-field" style={{ position: "relative", minWidth: 260 }}>
            <label>حرکت</label>
            <input
              className="admin-input"
              style={{ width: 260 }}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setName(""); }}
              placeholder="اسم حرکت را بنویس و از لیست انتخاب کن…"
              maxLength={160}
            />
            {!name && suggestions.length > 0 && (
              <div className="admin-suggest">
                {suggestions.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    className="admin-suggest-row"
                    onClick={() => { setName(s.name); setQuery(s.name); }}
                  >
                    <span>{s.name}</span>
                    {haveKeys.has(mediaKey(s.name)) && <span className="admin-suggest-tag">عکس دارد</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="admin-form-field">
            <label>فایل عکس</label>
            <input
              ref={fileRef}
              className="admin-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ width: 240 }}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="admin-form-field">
            <label>پیش‌نمایش</label>
            <div className="admin-media-preview">
              {dataUrl ? <img src={dataUrl} alt="" /> : <ImageOff size={22} />}
            </div>
          </div>

          <div className="admin-form-field">
            <label>&nbsp;</label>
            <button className="account-outline-btn" onClick={save} disabled={!name || !dataUrl || saving}>
              <Upload size={14} style={{ marginLeft: 6, verticalAlign: "-2px" }} />
              {saving ? "..." : "ثبت عکس"}
            </button>
          </div>
        </div>
        {name && <div className="account-content-hint">حرکت انتخاب‌شده: <b>{name}</b></div>}
      </div>

      {error && <div className="trade-form-error">{error}</div>}

      {items && !items.length && <EmptyState message="هنوز برای هیچ حرکتی عکس ثبت نشده" />}

      <div className="trade-list" style={{ marginTop: 16 }}>
        {(items || []).map((item) => (
          <div key={item.nameKey} className="trade-row" style={{ cursor: "pointer" }} onClick={() => edit(item)}>
            <span className="trade-row-main">
              <span className="trade-row-symbol">{item.name}</span>
              <span className="trade-row-sub">آخرین تغییر: {formatDateTime(item.updatedAt)}</span>
            </span>
            <button
              type="button"
              className="trade-icon-btn danger"
              onClick={(e) => { e.stopPropagation(); remove(item); }}
              aria-label="حذف عکس"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
