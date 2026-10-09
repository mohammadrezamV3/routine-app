"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { TickOption } from "@/components/TickOption";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { AnnouncementView } from "@/components/AnnouncementView";
import { formatDateTime } from "@/lib/adminFormat";
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_CTA_LABEL_MAX,
  ANNOUNCEMENT_DISPLAYS,
  ANNOUNCEMENT_DISPLAY_LABELS,
  ANNOUNCEMENT_FREQUENCIES,
  ANNOUNCEMENT_FREQUENCY_LABELS,
  ANNOUNCEMENT_PAGE_PRESETS,
  ANNOUNCEMENT_POSITIONS,
  ANNOUNCEMENT_POSITION_LABELS,
  ANNOUNCEMENT_PRIORITY_MAX,
  ANNOUNCEMENT_PRIORITY_MIN,
  ANNOUNCEMENT_TITLE_MAX,
  ANNOUNCEMENT_TONES,
  ANNOUNCEMENT_TONE_LABELS,
  ANNOUNCEMENT_URL_MAX,
  announcementStatus,
  isSafeAnnouncementUrl,
  normalizePagePrefix,
  validateAnnouncementMerged,
  type AnnouncementAudience,
  type AnnouncementDisplay,
  type AnnouncementFrequency,
  type AnnouncementPosition,
  type AnnouncementStatus,
  type AnnouncementTone,
} from "@/lib/announcements";
import { tr } from "@/lib/i18n";

type Row = {
  id: string; title: string; body: string; active: boolean;
  startsAt: string | null; expiresAt: string | null; createdAt: string; updatedAt: string;
  showInList: boolean; display: AnnouncementDisplay; position: AnnouncementPosition; pages: string[];
  audience: AnnouncementAudience; tone: AnnouncementTone; priority: number; dismissible: boolean;
  frequency: AnnouncementFrequency; ctaLabel: string | null; ctaUrl: string | null; imageUrl: string | null;
  _count?: { dismissals: number };
};
type Resp = { announcements: Row[] };

type Form = {
  title: string; body: string; active: boolean; startsAt: string; expiresAt: string;
  showInList: boolean; display: AnnouncementDisplay; position: AnnouncementPosition;
  pagesMode: "all" | "some"; pages: string[]; customPages: string;
  audience: AnnouncementAudience; tone: AnnouncementTone; priority: string; dismissible: boolean;
  frequency: AnnouncementFrequency; ctaLabel: string; ctaUrl: string; imageUrl: string;
};

const EMPTY: Form = {
  title: "", body: "", active: true, startsAt: "", expiresAt: "",
  showInList: true, display: "NONE", position: "TOP", pagesMode: "all", pages: [], customPages: "",
  audience: "ALL", tone: "INFO", priority: "0", dismissible: true, frequency: "UNTIL_DISMISSED",
  ctaLabel: "", ctaUrl: "", imageUrl: "",
};

const PRESET_VALUES = new Set(ANNOUNCEMENT_PAGE_PRESETS.map((p) => p.value));

// تابع، نه ثابت سطح ماژول: برچسب‌ها موقع رندر به زبان جاری وابسته‌ان.
const statusBadge = (): Record<AnnouncementStatus, { cls: string; label: string }> => ({
  disabled: { cls: "gray", label: tr("غیرفعال", "Inactive") },
  scheduled: { cls: "amber", label: tr("زمان‌بندی‌شده", "Scheduled") },
  live: { cls: "green", label: tr("در حال نمایش", "Live") },
  ended: { cls: "red", label: tr("پایان‌یافته", "Ended") },
});

// مقدار input[type=datetime-local] به وقت محلی مرورگر
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function rowToForm(r: Row): Form {
  const custom = r.pages.filter((p) => !PRESET_VALUES.has(p));
  return {
    title: r.title, body: r.body, active: r.active, startsAt: toLocalInput(r.startsAt), expiresAt: toLocalInput(r.expiresAt),
    showInList: r.showInList, display: r.display, position: r.position,
    pagesMode: r.pages.length ? "some" : "all", pages: r.pages.filter((p) => PRESET_VALUES.has(p)), customPages: custom.join(", "),
    audience: r.audience, tone: r.tone, priority: String(r.priority), dismissible: r.dismissible, frequency: r.frequency,
    ctaLabel: r.ctaLabel ?? "", ctaUrl: r.ctaUrl ?? "", imageUrl: r.imageUrl ?? "",
  };
}

/** صفحه‌های نهایی فرم؛ نامعتبر → رشته‌ی خطا */
function formPages(f: Form): string[] | string {
  if (f.pagesMode === "all") return [];
  const out = [...f.pages];
  for (const raw of f.customPages.split(/[,،\s]+/)) {
    if (!raw.trim()) continue;
    const p = normalizePagePrefix(raw);
    if (!p) return tr(`آدرس صفحه نامعتبر است: ${raw}`, `Invalid page path: ${raw}`);
    if (!out.includes(p)) out.push(p);
  }
  if (!out.length) return tr("حداقل یک صفحه انتخاب کنید", "Select at least one page");
  return out;
}

function placementLabel(r: Pick<Row, "display" | "position" | "pages">): string {
  if (r.display === "NONE") return "—";
  const where = r.pages.length ? r.pages.join(tr("، ", ", ")) : tr("همه‌ی صفحه‌ها", "All pages");
  return r.display === "BANNER" ? `${ANNOUNCEMENT_POSITION_LABELS[r.position]} · ${where}` : where;
}

export default function AdminAnnouncementsPage() {
  const toast = useAdminToast();
  const [data, setData] = useState<Resp | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(() => {
    adminFetch<Resp>("/api/admin/announcements")
      .then((d) => { setData(d); setLoadError(null); })
      .catch((e) => setLoadError(e.message));
  }, []);
  useEffect(load, [load]);

  function resetForm() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
  }

  function startEdit(row: Row) {
    setEditing(row);
    setForm(rowToForm(row));
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (saving) return;
    const f = form;
    const t = f.title.trim();
    const b = f.body.trim();
    if (!t) { setError(tr("عنوان لازمه", "A title is required")); return; }
    if (!b) { setError(tr("متن اطلاعیه لازمه", "The announcement text is required")); return; }
    // انقضا فقط وقتی فرستاده می‌شه که عوض شده — وگرنه ویرایش اطلاعیه‌ی
    // منقضی‌شده به‌خاطر «تاریخ باید در آینده باشد» رد می‌شد.
    const expiryChanged = !editing || f.expiresAt !== toLocalInput(editing.expiresAt);
    if (expiryChanged && f.expiresAt) {
      const ms = new Date(f.expiresAt).getTime();
      if (Number.isNaN(ms)) { setError(tr("تاریخ انقضا معتبر نیست", "The expiry date isn't valid")); return; }
      if (ms <= Date.now()) { setError(tr("تاریخ انقضا باید در آینده باشد", "The expiry date must be in the future")); return; }
    }
    const pages = formPages(f);
    if (typeof pages === "string") { setError(pages); return; }
    const priority = Number(f.priority || 0);
    if (!Number.isInteger(priority) || priority < ANNOUNCEMENT_PRIORITY_MIN || priority > ANNOUNCEMENT_PRIORITY_MAX) {
      setError(tr(`اولویت باید عدد صحیح بین ${ANNOUNCEMENT_PRIORITY_MIN} و ${ANNOUNCEMENT_PRIORITY_MAX} باشد`, `Priority must be a whole number from ${ANNOUNCEMENT_PRIORITY_MIN} to ${ANNOUNCEMENT_PRIORITY_MAX}`)); return;
    }
    const ctaUrl = f.ctaUrl.trim();
    const imageUrl = f.imageUrl.trim();
    if (ctaUrl && !isSafeAnnouncementUrl(ctaUrl)) { setError(tr("لینک دکمه باید مسیر داخلی (/...) یا https:// باشد", "The button link must be an internal path (/...) or https://")); return; }
    if (imageUrl && !isSafeAnnouncementUrl(imageUrl)) { setError(tr("آدرس تصویر باید مسیر داخلی (/...) یا https:// باشد", "The image URL must be an internal path (/...) or https://")); return; }
    const startsAt = f.startsAt ? new Date(f.startsAt) : null;
    const expiresAt = f.expiresAt ? new Date(f.expiresAt) : null;
    const merged = validateAnnouncementMerged({
      showInList: f.showInList, display: f.display, startsAt, expiresAt,
      ctaLabel: f.ctaLabel.trim() || null, ctaUrl: ctaUrl || null,
    });
    if (merged) { setError(merged); return; }

    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      title: t, body: b, active: f.active,
      startsAt: startsAt ? startsAt.toISOString() : null,
      showInList: f.showInList, display: f.display, position: f.position, pages,
      audience: f.audience, tone: f.tone, priority, dismissible: f.dismissible, frequency: f.frequency,
      ctaLabel: f.ctaLabel.trim() || null, ctaUrl: ctaUrl || null, imageUrl: imageUrl || null,
    };
    if (expiryChanged) payload.expiresAt = expiresAt ? expiresAt.toISOString() : null;
    try {
      if (editing) {
        await adminFetch(`/api/admin/announcements/${editing.id}`, { method: "PATCH", json: payload });
        toast(tr("اطلاعیه ویرایش شد", "Announcement updated"));
      } else {
        await adminFetch("/api/admin/announcements", { method: "POST", json: payload });
        toast(tr("اطلاعیه منتشر شد", "Announcement published"));
      }
      resetForm();
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: Row) {
    setToggling(row.id);
    try {
      await adminFetch(`/api/admin/announcements/${row.id}`, { method: "PATCH", json: { active: !row.active } });
      toast(row.active ? tr("اطلاعیه غیرفعال شد", "Announcement turned off") : tr("اطلاعیه فعال شد", "Announcement turned on"));
      load();
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setToggling(null);
    }
  }

  async function remove(row: Row) {
    try {
      await adminFetch(`/api/admin/announcements/${row.id}`, { method: "DELETE" });
      toast(tr("اطلاعیه حذف شد", "Announcement deleted"));
      setPendingDelete(null);
      if (editing?.id === row.id) resetForm();
      load();
    } catch (e: any) {
      toast(e.message, "err");
    }
  }

  const previewItem = useMemo(() => ({
    id: "preview",
    title: form.title.trim() || tr("عنوان اطلاعیه", "Announcement title"),
    body: form.body.trim() || tr("متن اطلاعیه این‌جا نشون داده می‌شه.", "The announcement text shows up here."),
    tone: form.tone,
    dismissible: form.dismissible,
    ctaLabel: form.ctaLabel.trim() || null,
    ctaUrl: form.ctaLabel.trim() ? form.ctaUrl.trim() || "#" : null,
    imageUrl: form.imageUrl.trim() && isSafeAnnouncementUrl(form.imageUrl.trim()) ? form.imageUrl.trim() : null,
  }), [form]);

  // روی موبایل گوشه‌ها کارت پایین می‌شن — پیش‌نمایش هم همین رو نشون می‌ده
  const previewPos: AnnouncementPosition = previewDevice === "mobile" && form.position !== "TOP" ? "BOTTOM" : form.position;
  const previewVariant = form.position === "TOP" || form.position === "BOTTOM" ? "bar" : "corner";

  return (
    <section>
      <div className="admin-chart-card">
        <div className="admin-chart-head">
          <span className="admin-chart-title">{editing ? tr("ویرایش اطلاعیه", "Edit announcement") : tr("اطلاعیه‌ی جدید", "New announcement")}</span>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>{tr("عنوان", "Title")}</span>
              <input className="admin-input" maxLength={ANNOUNCEMENT_TITLE_MAX} value={form.title} onChange={(e) => set("title", e.target.value)} autoComplete="off" />
            </label>
            <div className="admin-field">
              <span>{tr("وضعیت", "Status")}</span>
              <SegmentedTabs
                className="admin-seg"
                ariaLabel={tr("وضعیت", "Status")}
                options={[{ value: "on", label: tr("فعال", "Active") }, { value: "off", label: tr("غیرفعال", "Inactive") }]}
                active={form.active ? "on" : "off"}
                onChange={(v) => set("active", v === "on")}
              />
            </div>
          </div>
          <label className="admin-field" style={{ marginTop: 12 }}>
            <span>{tr("متن (متن ساده)", "Text (plain text)")}</span>
            <textarea className="admin-input" rows={4} maxLength={ANNOUNCEMENT_BODY_MAX} value={form.body} onChange={(e) => set("body", e.target.value)} />
          </label>

          <div className="ann-admin-section">
            <div className="ann-admin-section-title">{tr("نحوه‌ی نمایش", "How it's shown")}</div>
            <TickOption checked={form.showInList} onChange={(v) => set("showInList", v)}>{tr("در لیست اعلان‌ها (زنگوله)", "In the notifications list (bell)")}</TickOption>
            <div className="admin-field">
              <span>{tr("روی صفحه", "On the page")}</span>
              <SegmentedTabs
                className="admin-seg ann-seg"
                ariaLabel={tr("نمایش روی صفحه", "On-page display")}
                options={ANNOUNCEMENT_DISPLAYS.map((d) => ({ value: d, label: d === "NONE" ? tr("هیچ", "None") : ANNOUNCEMENT_DISPLAY_LABELS[d] }))}
                active={form.display}
                onChange={(v) => set("display", v)}
              />
            </div>
            {form.display === "BANNER" && (
              <div className="admin-field">
                <span>{tr("جایگاه بنر", "Banner placement")}</span>
                <SegmentedTabs
                  className="admin-seg ann-seg"
                  ariaLabel={tr("جایگاه بنر", "Banner placement")}
                  options={ANNOUNCEMENT_POSITIONS.map((p) => ({ value: p, label: ANNOUNCEMENT_POSITION_LABELS[p] }))}
                  active={form.position}
                  onChange={(v) => set("position", v)}
                />
              </div>
            )}
            {form.display !== "NONE" && (
              <>
                <div className="admin-field">
                  <span>{tr("صفحه‌ها", "Pages")}</span>
                  <SegmentedTabs
                    className="admin-seg"
                    ariaLabel={tr("صفحه‌ها", "Pages")}
                    options={[{ value: "all", label: tr("همه‌ی صفحه‌ها", "All pages") }, { value: "some", label: tr("صفحه‌های مشخص", "Specific pages") }]}
                    active={form.pagesMode}
                    onChange={(v) => set("pagesMode", v)}
                  />
                </div>
                {form.pagesMode === "some" && (
                  <>
                    <div className="ann-admin-ticks">
                      {ANNOUNCEMENT_PAGE_PRESETS.map((p) => (
                        <TickOption
                          key={p.value}
                          checked={form.pages.includes(p.value)}
                          onChange={(v) => set("pages", v ? [...form.pages, p.value] : form.pages.filter((x) => x !== p.value))}
                        >
                          {p.label} <span className="admin-ltr admin-muted">{p.value}</span>
                        </TickOption>
                      ))}
                    </div>
                    <label className="admin-field">
                      <span>{tr("مسیرهای دیگر (با کاما جدا کنید، مثلا /trade/calendar)", "Other paths (separate with commas, e.g. /trade/calendar)")}</span>
                      <input className="admin-input admin-ltr" dir="ltr" value={form.customPages} onChange={(e) => set("customPages", e.target.value)} autoComplete="off" />
                    </label>
                  </>
                )}
                <div className="ann-admin-hint admin-muted">{tr("پاپ‌آپ و بنر هیچ‌وقت روی پنل ادمین و صفحه‌های ورود/ثبت‌نام نشون داده نمی‌شن.", "Popups and banners are never shown on the admin panel or on sign-in/sign-up pages.")}</div>
              </>
            )}
          </div>

          <div className="ann-admin-section">
            <div className="ann-admin-section-title">{tr("مخاطب و زمان‌بندی", "Audience and schedule")}</div>
            <div className="admin-field">
              <span>{tr("مخاطب", "Audience")}</span>
              <SegmentedTabs
                className="admin-seg ann-seg"
                ariaLabel={tr("مخاطب", "Audience")}
                options={ANNOUNCEMENT_AUDIENCES.map((a) => ({ value: a, label: ANNOUNCEMENT_AUDIENCE_LABELS[a] }))}
                active={form.audience}
                onChange={(v) => set("audience", v)}
              />
            </div>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>{tr("شروع (اختیاری)", "Start (optional)")}</span>
                <input className="admin-input" type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
              </label>
              <label className="admin-field">
                <span>{tr("پایان (اختیاری)", "End (optional)")}</span>
                <input className="admin-input" type="datetime-local" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
              </label>
              <label className="admin-field">
                <span>{tr(`اولویت (${ANNOUNCEMENT_PRIORITY_MIN} تا ${ANNOUNCEMENT_PRIORITY_MAX}، بیشتر = جلوتر)`, `Priority (${ANNOUNCEMENT_PRIORITY_MIN} to ${ANNOUNCEMENT_PRIORITY_MAX}, higher = first)`)}</span>
                <input className="admin-input admin-ltr" type="number" inputMode="numeric" min={ANNOUNCEMENT_PRIORITY_MIN} max={ANNOUNCEMENT_PRIORITY_MAX} value={form.priority} onChange={(e) => set("priority", e.target.value)} />
              </label>
            </div>
          </div>

          {form.display !== "NONE" && (
            <div className="ann-admin-section">
              <div className="ann-admin-section-title">{tr("رفتار و ظاهر", "Behavior and look")}</div>
              <div className="admin-field">
                <span>{tr("حالت رنگ", "Color mode")}</span>
                <SegmentedTabs
                  className="admin-seg ann-seg"
                  ariaLabel={tr("حالت رنگ", "Color mode")}
                  options={ANNOUNCEMENT_TONES.map((t) => ({ value: t, label: ANNOUNCEMENT_TONE_LABELS[t] }))}
                  active={form.tone}
                  onChange={(v) => set("tone", v)}
                />
              </div>
              <div className="admin-field">
                <span>{tr("تکرار", "Repeat")}</span>
                <SegmentedTabs
                  className="admin-seg ann-seg"
                  ariaLabel={tr("تکرار", "Repeat")}
                  options={ANNOUNCEMENT_FREQUENCIES.map((x) => ({ value: x, label: ANNOUNCEMENT_FREQUENCY_LABELS[x] }))}
                  active={form.frequency}
                  onChange={(v) => set("frequency", v)}
                />
              </div>
              <TickOption checked={form.dismissible} onChange={(v) => set("dismissible", v)}>{tr("کاربر بتونه برای همیشه ببندتش", "Let users close it permanently")}</TickOption>
              <div className="ann-admin-hint admin-muted">
                {form.display === "POPUP"
                  ? tr("پاپ‌آپ همیشه دکمه‌ی بستن داره؛ اگه این گزینه خاموش باشه، بعد از بستن در بازدید بعدی دوباره میاد.", "A popup always has a close button. If this is off, it comes back on the next visit after closing.")
                  : tr("اگه خاموش باشه، بنر دکمه‌ی بستن نداره و تا پایان زمان نمایش می‌مونه.", "If this is off, the banner has no close button and stays until its end time.")}
              </div>
              <div className="admin-form-grid">
                <label className="admin-field">
                  <span>{tr("متن دکمه (اختیاری)", "Button text (optional)")}</span>
                  <input className="admin-input" maxLength={ANNOUNCEMENT_CTA_LABEL_MAX} value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} autoComplete="off" />
                </label>
                <label className="admin-field">
                  <span>{tr("لینک دکمه (/مسیر یا https://)", "Button link (/path or https://)")}</span>
                  <input className="admin-input admin-ltr" dir="ltr" maxLength={ANNOUNCEMENT_URL_MAX} value={form.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} autoComplete="off" />
                </label>
                <label className="admin-field">
                  <span>{tr("آدرس تصویر (اختیاری)", "Image URL (optional)")}</span>
                  <input className="admin-input admin-ltr" dir="ltr" maxLength={ANNOUNCEMENT_URL_MAX} value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} autoComplete="off" />
                </label>
              </div>
            </div>
          )}

          {form.display !== "NONE" && (
            <div className="ann-admin-section">
              <div className="ann-admin-preview-head">
                <div className="ann-admin-section-title">{tr("پیش‌نمایش", "Preview")}</div>
                <SegmentedTabs
                  className="admin-seg"
                  ariaLabel={tr("دستگاه پیش‌نمایش", "Preview device")}
                  options={[{ value: "desktop", label: tr("دسکتاپ", "Desktop") }, { value: "mobile", label: tr("موبایل", "Mobile") }]}
                  active={previewDevice}
                  onChange={setPreviewDevice}
                />
              </div>
              <div className={`ann-preview${previewDevice === "mobile" ? " is-mobile" : ""}`} aria-hidden="true">
                <div className="ann-preview-bar" />
                <div className="ann-preview-lines"><i /><i /><i /><i /></div>
                {form.display === "POPUP" ? (
                  <div className="ann-preview-scrim">
                    <div className="ann-preview-modal">
                      <AnnouncementView item={previewItem} variant="popup" closable />
                    </div>
                  </div>
                ) : (
                  <div className={`ann-slot ann-pos-${previewPos.toLowerCase().replace("_", "-")}`}>
                    <AnnouncementView
                      item={previewItem}
                      variant={previewDevice === "mobile" && previewPos === "BOTTOM" && form.position !== "BOTTOM" ? "corner" : previewVariant}
                      closable={form.dismissible}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <div className="admin-form-error" role="alert">{error}</div>}
          <div className="admin-modal-actions">
            {editing && <button type="button" className="admin-btn" onClick={resetForm} disabled={saving}>{tr("انصراف", "Cancel")}</button>}
            <button type="submit" className="admin-btn primary" disabled={saving || !form.title.trim() || !form.body.trim()}>
              {saving ? tr("در حال ذخیره…", "Saving…") : editing ? tr("ذخیره تغییرات", "Save changes") : tr("انتشار اطلاعیه", "Publish announcement")}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">{tr("اطلاعیه‌ها", "Announcements")}</span></div>
        {loadError && !data ? (
          <EmptyState message={loadError} />
        ) : !data ? (
          <div className="admin-empty is-loading">{tr("در حال بارگذاری…", "Loading…")}</div>
        ) : data.announcements.length === 0 ? (
          <EmptyState message={tr("هنوز اطلاعیه‌ای منتشر نشده", "No announcements published yet")} />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>{tr("عنوان", "Title")}</th><th>{tr("وضعیت", "Status")}</th><th>{tr("نمایش", "Display")}</th><th>{tr("جایگاه", "Placement")}</th><th>{tr("مخاطب", "Audience")}</th><th>{tr("اولویت", "Priority")}</th><th>{tr("بازه", "Period")}</th><th aria-label={tr("عملیات", "Actions")} /></tr>
              </thead>
              <tbody>
                {data.announcements.map((a) => {
                  const st = statusBadge()[announcementStatus(a, new Date())];
                  return (
                    <tr key={a.id}>
                      <td style={{ maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={a.body}>{a.title}</td>
                      <td><span className={`admin-badge ${st.cls}`}>{st.label}</span></td>
                      <td>
                        <div style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                          {a.showInList && <span className="admin-badge gray">{tr("اعلان", "Notification")}</span>}
                          {a.display !== "NONE" && <span className="admin-badge green">{ANNOUNCEMENT_DISPLAY_LABELS[a.display]}</span>}
                        </div>
                      </td>
                      <td className="admin-muted" style={{ maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={placementLabel(a)}>{placementLabel(a)}</td>
                      <td>{ANNOUNCEMENT_AUDIENCE_LABELS[a.audience]}</td>
                      <td className="admin-ltr">{a.priority}</td>
                      <td className="admin-ltr admin-muted" style={{ whiteSpace: "nowrap" }}>
                        {a.startsAt ? formatDateTime(a.startsAt) : tr("اکنون", "Now")} → {a.expiresAt ? formatDateTime(a.expiresAt) : "∞"}
                      </td>
                      <td className="admin-cell-actions">
                        <div style={{ display: "inline-flex", gap: 6, whiteSpace: "nowrap" }}>
                          <button type="button" className="admin-btn sm" onClick={() => toggleActive(a)} disabled={toggling === a.id}>
                            {a.active ? tr("غیرفعال‌کردن", "Turn off") : tr("فعال‌کردن", "Turn on")}
                          </button>
                          <button type="button" className="admin-btn sm" onClick={() => startEdit(a)} aria-label={tr(`ویرایش ${a.title}`, `Edit ${a.title}`)} title={tr("ویرایش", "Edit")}>
                            <Pencil size={14} />
                          </button>
                          <button type="button" className="admin-btn danger sm" onClick={() => setPendingDelete(a)} aria-label={tr(`حذف ${a.title}`, `Delete ${a.title}`)} title={tr("حذف", "Delete")}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pendingDelete && (
        <ConfirmModal
          title={tr("حذف اطلاعیه", "Delete announcement")}
          message={<>{tr("اطلاعیه‌ی ", "The announcement ")}<b>{pendingDelete.title}</b>{tr(" برای همیشه حذف می‌شه و از اعلان‌ها، پاپ‌آپ و بنرهای کاربران هم برداشته می‌شه.", " will be deleted permanently and removed from users' notifications, popups and banners.")}</>}
          confirmLabel={tr("حذف اطلاعیه", "Delete announcement")}
          onConfirm={() => remove(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
