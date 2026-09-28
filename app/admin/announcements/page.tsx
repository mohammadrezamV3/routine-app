"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { formatDateTime } from "@/lib/adminFormat";
import { ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX } from "@/lib/announcements";

type Row = {
  id: string; title: string; body: string; active: boolean;
  expiresAt: string | null; createdAt: string; updatedAt: string;
};
type Resp = { announcements: Row[] };

// مقدارِ input[type=datetime-local] به وقتِ محلیِ مرورگر
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminAnnouncementsPage() {
  const toast = useAdminToast();
  const [data, setData] = useState<Resp | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [active, setActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(() => {
    adminFetch<Resp>("/api/admin/announcements")
      .then((d) => { setData(d); setLoadError(null); })
      .catch((e) => setLoadError(e.message));
  }, []);
  useEffect(load, [load]);

  function resetForm() {
    setEditing(null);
    setTitle("");
    setBody("");
    setActive(true);
    setExpiresAt("");
    setError(null);
  }

  function startEdit(row: Row) {
    setEditing(row);
    setTitle(row.title);
    setBody(row.body);
    setActive(row.active);
    setExpiresAt(toLocalInput(row.expiresAt));
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (saving) return;
    const t = title.trim();
    const b = body.trim();
    if (!t) { setError("عنوان لازمه"); return; }
    if (!b) { setError("متن اطلاعیه لازمه"); return; }
    // انقضا فقط وقتی فرستاده می‌شه که عوض شده — وگرنه ویرایشِ اطلاعیه‌ی
    // منقضی‌شده به‌خاطرِ «تاریخ باید در آینده باشد» رد می‌شد.
    const expiryChanged = !editing || expiresAt !== toLocalInput(editing.expiresAt);
    if (expiryChanged && expiresAt) {
      const ms = new Date(expiresAt).getTime();
      if (Number.isNaN(ms)) { setError("تاریخ انقضا معتبر نیست"); return; }
      if (ms <= Date.now()) { setError("تاریخ انقضا باید در آینده باشد"); return; }
    }
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = { title: t, body: b, active };
    if (expiryChanged) payload.expiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;
    try {
      if (editing) {
        await adminFetch(`/api/admin/announcements/${editing.id}`, { method: "PATCH", json: payload });
        toast("اطلاعیه ویرایش شد");
      } else {
        await adminFetch("/api/admin/announcements", { method: "POST", json: payload });
        toast("اطلاعیه منتشر شد");
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
      toast(row.active ? "اطلاعیه غیرفعال شد" : "اطلاعیه فعال شد");
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
      toast("اطلاعیه حذف شد");
      setPendingDelete(null);
      if (editing?.id === row.id) resetForm();
      load();
    } catch (e: any) {
      toast(e.message, "err");
    }
  }

  return (
    <section>
      <div className="admin-chart-card">
        <div className="admin-chart-head">
          <span className="admin-chart-title">{editing ? "ویرایش اطلاعیه" : "اطلاعیه‌ی جدید"}</span>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>عنوان</span>
              <input className="admin-input" maxLength={ANNOUNCEMENT_TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />
            </label>
            <label className="admin-field">
              <span>انقضا (اختیاری)</span>
              <input className="admin-input" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </label>
            <div className="admin-field">
              <span>وضعیت</span>
              <div className="admin-tabs" role="radiogroup" aria-label="وضعیت" style={{ marginBottom: 0 }}>
                {([true, false] as const).map((v) => (
                  <button
                    key={String(v)} type="button" role="radio" aria-checked={active === v}
                    className={`admin-tab${active === v ? " active" : ""}${!v ? " is-off" : ""}`}
                    onClick={() => setActive(v)}
                  >
                    {v ? "فعال" : "غیرفعال"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <label className="admin-field" style={{ marginTop: 12 }}>
            <span>متن (متن ساده)</span>
            <textarea className="admin-input" rows={5} maxLength={ANNOUNCEMENT_BODY_MAX} value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          {error && <div className="admin-form-error" role="alert">{error}</div>}
          <div className="admin-modal-actions">
            {editing && <button type="button" className="admin-btn" onClick={resetForm} disabled={saving}>انصراف</button>}
            <button type="submit" className="admin-btn primary" disabled={saving || !title.trim() || !body.trim()}>
              {saving ? "در حال ذخیره…" : editing ? "ذخیره تغییرات" : "انتشار اطلاعیه"}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">اطلاعیه‌ها</span></div>
        {loadError && !data ? (
          <EmptyState message={loadError} />
        ) : !data ? (
          <div className="admin-empty is-loading">در حال بارگذاری…</div>
        ) : data.announcements.length === 0 ? (
          <EmptyState message="هنوز اطلاعیه‌ای منتشر نشده" />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>عنوان</th><th>متن</th><th>وضعیت</th><th>انقضا</th><th>ساخته‌شده</th><th aria-label="عملیات" /></tr></thead>
              <tbody>
                {data.announcements.map((a) => {
                  const expired = a.expiresAt ? new Date(a.expiresAt).getTime() < Date.now() : false;
                  return (
                    <tr key={a.id}>
                      <td>{a.title}</td>
                      <td className="admin-muted" style={{ maxWidth: 320, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={a.body}>{a.body}</td>
                      <td>
                        {!a.active ? <span className="admin-badge gray">غیرفعال</span>
                          : expired ? <span className="admin-badge amber">منقضی‌شده</span>
                          : <span className="admin-badge green">فعال</span>}
                      </td>
                      <td className={a.expiresAt ? "admin-ltr" : "admin-muted"}>{a.expiresAt ? formatDateTime(a.expiresAt) : "بدون انقضا"}</td>
                      <td className="admin-ltr">{formatDateTime(a.createdAt)}</td>
                      <td className="admin-cell-actions">
                        <div style={{ display: "inline-flex", gap: 6, whiteSpace: "nowrap" }}>
                        <button type="button" className="admin-btn sm" onClick={() => toggleActive(a)} disabled={toggling === a.id}>
                          {a.active ? "غیرفعال‌کردن" : "فعال‌کردن"}
                        </button>
                        <button type="button" className="admin-btn sm" onClick={() => startEdit(a)} aria-label={`ویرایش ${a.title}`} title="ویرایش">
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="admin-btn danger sm" onClick={() => setPendingDelete(a)} aria-label={`حذف ${a.title}`} title="حذف">
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
          title="حذف اطلاعیه"
          message={<>اطلاعیه‌ی <b>{pendingDelete.title}</b> برای همیشه حذف می‌شه و از پنل اطلاعیه‌های کاربران هم برداشته می‌شه.</>}
          confirmLabel="حذف اطلاعیه"
          onConfirm={() => remove(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
