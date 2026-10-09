"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageOff, ImagePlus, Search, Trash2, Upload, X } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/EmptyState";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { formatDateTime } from "@/lib/adminFormat";
import { EXERCISE_CATALOG, exerciseSearchText, matchesExerciseQuery } from "@/lib/exerciseCatalog";
import { MAX_MEDIA_DATA_URL_LENGTH, MEDIA_MAX_EDGE, mediaKey } from "@/lib/exerciseMedia";
import { normalizeFa } from "@/lib/utils";
import { Spinner } from "@/components/Spinner";
import { tr } from "@/lib/i18n";

type Item = { nameKey: string; name: string; updatedAt: string };

// همون سه فرمتی که سرور قبول می‌کنه (lib/exerciseMedia → checkMediaDataUrl).
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
// سقف فایل *خام* قبل از فشرده‌سازی — فقط تا مرورگر یه عکس چند ده مگابایتی
// رو برای دیکود توی حافظه باز نکنه؛ خروجی نهایی سقف خودش رو داره.
const MAX_RAW_BYTES = 15 * 1024 * 1024;

// عکس حرکات همیشه قبل از ارسال سمت کلاینت کوچک می‌شود، نه سمت سرور:
// عکس خام گوشی چند مگابایت است و همان‌طور که هست هم در دیتابیس می‌ماند و
// هم دوباره برای هر کاربر دانلود می‌شود. ۷۲۰px برای کارت جزئیات حرکت
// بیش‌ازحد کافی‌ست.
function compressToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (!img.width || !img.height) { reject(new Error("image")); return; }
      const scale = Math.min(1, MEDIA_MAX_EDGE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas")); return; }
      // PNGهای شفاف روی بوم خالی سیاه می‌شوند؛ پس‌زمینه‌ی سفید همان چیزی‌ست
      // که کارت حرکت هم نشان می‌دهد.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}

// «عکس حرکات ورزشی» — ادمین برای هر حرکت کاتالوگ یک عکس می‌گذارد و همان
// عکس در کارت جزئیات «مشاهده حرکات» به‌جای placeholder نشان داده می‌شود.
// نام حرکت از خود کاتالوگ انتخاب می‌شود (نه تایپ آزاد) تا عکس به حرکتی
// که وجود ندارد نچسبد.
export default function AdminExerciseMediaPage() {
  const toast = useAdminToast();
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [listQuery, setListQuery] = useState("");
  const [deleting, setDeleting] = useState<Item | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  // کلیک پشت‌سرهم روی دو ردیف: پاسخ ردیف قبلی اگه دیرتر برسه نباید عکس
  // حرکت اشتباه رو توی پیش‌نمایش حرکت فعلی بذاره.
  const editSeq = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/admin/exercise-media");
      if (!res.ok) throw new Error();
      const d = await res.json();
      setItems(d.items || []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const haveKeys = useMemo(() => new Set((items || []).map((i) => i.nameKey)), [items]);

  // فقط وقتی کاربر چیزی تایپ کرده پیشنهاد می‌دهیم — رندر هر ~۳۰۰ حرکت
  // به‌صورت پیش‌فرض نه مفید است نه سریع.
  const suggestions = useMemo(() => {
    const q = normalizeFa(query).replace(/\s+/g, " ");
    if (!q) return [];
    return EXERCISE_CATALOG.filter((e) => matchesExerciseQuery(exerciseSearchText(e), q)).slice(0, 8);
  }, [query]);
  const showSuggest = suggestOpen && !name && suggestions.length > 0;

  function pick(n: string) {
    setName(n);
    setQuery(n);
    setSuggestOpen(false);
    setActiveIdx(-1);
    setError(null);
  }

  function onQueryKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { setSuggestOpen(false); setActiveIdx(-1); return; }
    if (!suggestions.length || name) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestOpen(true);
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestOpen(true);
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const s = suggestions[activeIdx >= 0 ? activeIdx : 0];
      if (s) pick(s.name);
    }
  }

  function resetFile() {
    if (fileRef.current) fileRef.current.value = "";
  }

  async function pickFile(file: File | null) {
    if (!file) return;
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(tr("فقط عکس JPG، PNG یا WebP قابل قبول است", "Only JPG, PNG or WebP images are accepted"));
      resetFile();
      return;
    }
    if (file.size > MAX_RAW_BYTES) {
      setError(tr("فایل بیش از حد بزرگ است (حداکثر 15 مگابایت)", "The file is too large (15 MB max)"));
      resetFile();
      return;
    }
    setCompressing(true);
    try {
      const url = await compressToDataUrl(file);
      if (url.length > MAX_MEDIA_DATA_URL_LENGTH) {
        setError(tr("حجم عکس حتی بعد از فشرده‌سازی زیاد است — عکس کوچک‌تری انتخاب کن", "The image is still too large after compression. Choose a smaller image"));
        return;
      }
      editSeq.current++; // پیش‌نمایش در-راه یک ردیف دیگه نباید این عکس رو پاک کنه
      setLoadingPreview(false);
      setDataUrl(url);
    } catch {
      setError(tr("این فایل عکس معتبری نیست", "This file isn't a valid image"));
    } finally {
      setCompressing(false);
      // همون فایل رو دوباره انتخاب‌کردن هم باید onChange بده.
      resetFile();
    }
  }

  function clearForm() {
    editSeq.current++;
    setName(""); setQuery(""); setDataUrl(null); setError(null); setLoadingPreview(false);
    resetFile();
  }

  async function save() {
    if (!name || !dataUrl || saving) return;
    setSaving(true);
    setError(null);
    try {
      await adminFetch("/api/admin/exercise-media", { method: "PUT", json: { name, dataUrl } });
      toast(tr("عکس ثبت شد", "Image saved"));
      clearForm();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("ثبت عکس ناموفق بود", "Couldn't save the image"));
    } finally {
      setSaving(false);
    }
  }

  /** ردیف موجود را برای جایگزینی عکس داخل فرم باز می‌کند. */
  async function edit(item: Item) {
    const seq = ++editSeq.current;
    setError(null);
    setName(item.name);
    setQuery(item.name);
    setSuggestOpen(false);
    setDataUrl(null);
    setLoadingPreview(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const res = await fetch(`/api/admin/exercise-media?name=${encodeURIComponent(item.name)}`);
      const body = await res.json().catch(() => null);
      if (seq !== editSeq.current) return;
      if (!res.ok) { setError(body?.error || tr("دریافت عکس ناموفق بود", "Couldn't load the image")); return; }
      setDataUrl(body?.media?.dataUrl || null);
    } catch {
      if (seq === editSeq.current) setError(tr("ارتباط با سرور برقرار نشد", "Couldn't reach the server"));
    } finally {
      if (seq === editSeq.current) setLoadingPreview(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await adminFetch(`/api/admin/exercise-media?name=${encodeURIComponent(deleting.name)}`, { method: "DELETE" });
      toast(tr("عکس حذف شد", "Image deleted"));
      if (mediaKey(name) === deleting.nameKey) clearForm();
      setDeleting(null);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : tr("حذف ناموفق بود", "Delete failed"), "err");
    }
  }

  const visibleItems = useMemo(() => {
    const q = normalizeFa(listQuery);
    return (items || []).filter((i) => !q || normalizeFa(i.name).includes(q));
  }, [items, listQuery]);

  const busy = saving || compressing;

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">{tr("عکس حرکات ورزشی", "Workout exercise images")}</div>
          <div className="admin-section-hint" style={{ margin: 0 }}>
            {tr(
              `برای هر حرکت کاتالوگ می‌توانی یک عکس بگذاری؛ همان عکس در «مشاهده حرکات» بالای کارت جزئیات نشان داده می‌شود. حرکتی که عکس ندارد مثل قبل placeholder می‌گیرد. عکس قبل از ارسال خودکار به حداکثر ${MEDIA_MAX_EDGE} پیکسل کوچک می‌شود.`,
              `You can add one image for each exercise in the catalog. The same image shows at the top of the exercise details card under "View exercises". Exercises without an image keep the placeholder. Before sending, images are automatically resized to a maximum of ${MEDIA_MAX_EDGE} pixels.`,
            )}
          </div>
        </div>
      </div>

      <div className="admin-card admin-media-form" ref={formRef}>
        <div className="admin-chart-head"><span className="admin-chart-title">{tr("افزودن / جایگزینی عکس", "Add / replace image")}</span></div>
        <form onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="admin-media-layout">
            <div className="admin-media-fields">
              <div className="admin-field admin-suggest-wrap">
                <label htmlFor="exmedia-name">{tr("حرکت", "Exercise")}</label>
                <input
                  id="exmedia-name"
                  className="admin-input"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setName(""); setSuggestOpen(true); setActiveIdx(-1); }}
                  onFocus={() => setSuggestOpen(true)}
                  // با تاخیر، تا کلیک روی یک پیشنهاد قبل از بسته‌شدن لیست ثبت بشه.
                  onBlur={() => setTimeout(() => setSuggestOpen(false), 120)}
                  onKeyDown={onQueryKey}
                  placeholder={tr("اسم حرکت را بنویس و از لیست انتخاب کن…", "Type the exercise name and pick it from the list…")}
                  maxLength={160}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={showSuggest}
                  aria-controls="exmedia-suggest"
                  aria-autocomplete="list"
                  aria-activedescendant={showSuggest && activeIdx >= 0 ? `exmedia-opt-${activeIdx}` : undefined}
                />
                {showSuggest && (
                  <div className="admin-suggest" id="exmedia-suggest" role="listbox">
                    {suggestions.map((s, i) => (
                      <button
                        key={s.name}
                        id={`exmedia-opt-${i}`}
                        type="button"
                        role="option"
                        aria-selected={i === activeIdx}
                        tabIndex={-1}
                        className={`admin-suggest-row${i === activeIdx ? " is-active" : ""}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActiveIdx(i)}
                        onClick={() => pick(s.name)}
                      >
                        <span>{s.name}</span>
                        {haveKeys.has(mediaKey(s.name)) && <span className="admin-suggest-tag">{tr("عکس دارد", "Has image")}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {query && !name && !showSuggest && suggestions.length === 0 && (
                  <span className="admin-media-note">{tr("حرکتی با این اسم در کاتالوگ نیست", "No exercise with this name in the catalog")}</span>
                )}
                {name && (
                  <span className="admin-media-note">
                    {tr("حرکت انتخاب‌شده: ", "Selected exercise: ")}<b>{name}</b>
                    {haveKeys.has(mediaKey(name)) && tr(" — عکس فعلی جایگزین می‌شود", " — the current image will be replaced")}
                  </span>
                )}
              </div>

              <div className="admin-field">
                <span>{tr("فایل عکس", "Image file")}</span>
                <input
                  ref={fileRef}
                  id="exmedia-file"
                  className="admin-file-hidden"
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                <span className="admin-media-file-row">
                  <button type="button" className="admin-btn" onClick={() => fileRef.current?.click()} disabled={busy}>
                    {compressing ? <Spinner size={13} /> : <ImagePlus size={14} />}
                    {dataUrl ? tr("انتخاب عکس دیگر", "Choose another image") : tr("انتخاب عکس", "Choose image")}
                  </button>
                  <span className="admin-media-note">{tr("JPG، PNG یا WebP", "JPG, PNG or WebP")}</span>
                </span>
              </div>
            </div>

            <div className="admin-field">
              <span>{tr("پیش‌نمایش", "Preview")}</span>
              <div className={`admin-media-preview${loadingPreview ? " is-loading" : ""}`}>
                {dataUrl ? <img src={dataUrl} alt={name ? tr(`عکس ${name}`, `Image of ${name}`) : ""} /> : !loadingPreview && <ImageOff size={22} />}
              </div>
            </div>
          </div>

          {error && <div className="admin-form-error" role="alert">{error}</div>}

          <div className="admin-modal-actions">
            {(name || query || dataUrl) && (
              <button type="button" className="admin-btn" onClick={clearForm} disabled={saving}>
                <X size={14} /> {tr("پاک کردن فرم", "Clear form")}
              </button>
            )}
            <button type="submit" className="admin-btn primary" disabled={!name || !dataUrl || busy}>
              {saving ? <Spinner size={13} /> : <Upload size={14} />}
              {tr("ثبت عکس", "Save image")}
            </button>
          </div>
        </form>
      </div>

      {items && items.length > 0 && (
        <div className="admin-toolbar">
          <label className="admin-search">
            <Search size={15} />
            <input className="admin-input" value={listQuery} onChange={(e) => setListQuery(e.target.value)} placeholder={tr("جستجو در حرکت‌های دارای عکس…", "Search exercises with images…")} aria-label={tr("جستجو", "Search")} />
          </label>
        </div>
      )}

      {!items ? (
        loading || !failed ? <LoadingState /> : <ErrorState onRetry={load} />
      ) : visibleItems.length === 0 ? (
        <EmptyState message={items.length ? tr("حرکتی با این جستجو پیدا نشد", "No exercises match this search") : tr("هنوز برای هیچ حرکتی عکس ثبت نشده", "No images have been added for any exercise yet")} />
      ) : (
        <div className={`trade-list${loading ? " admin-list-dim" : ""}`}>
          {visibleItems.map((item) => (
            <div key={item.nameKey} className={`trade-row admin-media-row${mediaKey(name) === item.nameKey ? " is-editing" : ""}`}>
              <button type="button" className="admin-media-row-main" onClick={() => edit(item)} title={tr("جایگزینی عکس", "Replace image")}>
                <span className="trade-row-symbol">{item.name}</span>
                <span className="trade-row-sub">{tr("آخرین تغییر: ", "Last changed: ")}<span className="admin-ltr-inline">{formatDateTime(item.updatedAt)}</span></span>
              </button>
              <button
                type="button"
                className="admin-icon-btn admin-icon-danger"
                onClick={() => setDeleting(item)}
                aria-label={tr(`حذف عکس ${item.name}`, `Delete image of ${item.name}`)}
                title={tr("حذف عکس", "Delete image")}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {deleting && (
        <ConfirmModal
          title={tr("حذف عکس", "Delete image")}
          message={<>{tr("عکس «", "Image \"")}{deleting.name}{tr("» حذف می‌شه و کارت این حرکت دوباره placeholder نشون می‌ده.", "\" will be deleted, and this exercise's card will show the placeholder again.")}</>}
          confirmLabel={tr("حذف عکس", "Delete image")}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
