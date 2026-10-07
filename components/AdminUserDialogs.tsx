"use client";

import { useState } from "react";
import { AdminModal } from "@/components/admin/AdminModal";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { Spinner } from "@/components/Spinner";
import { TickOption } from "@/components/TickOption";
import { MAX_SEGMENT_NAME, MAX_TAG_LEN, UsersFilters } from "@/lib/adminUsersView";
import { formatNumber } from "@/lib/adminFormat";
import { ALL_MODULES, MODULE_LABELS_FA } from "@/components/AdminUserManageTabs";

type BulkResult = { done: number; failed: { id: string; error: string }[] };

// اقدام گروهی/تکی از همان روت bulk رد می‌شه تا هر کاربر جدا با قوانین «کی روی کی» چک بشه
export async function postBulk(ids: string[], action: string, extra: Record<string, unknown>): Promise<BulkResult> {
  return adminFetch<BulkResult>("/api/admin/users/bulk", { method: "POST", json: { ids, action, ...extra } });
}

function Footer({ busy, label, onClose, onSubmit, disabled }: { busy: boolean; label: string; onClose: () => void; onSubmit: () => void; disabled?: boolean }) {
  return (
    <div className="admin-modal-actions">
      <button type="button" className="admin-btn" onClick={onClose} disabled={busy}>انصراف</button>
      <button type="button" className="admin-btn primary" onClick={onSubmit} disabled={busy || disabled}>
        {busy && <Spinner size={14} label={null} />} {label}
      </button>
    </div>
  );
}

function useRunner(onDone: () => void, onClose: () => void) {
  const toast = useAdminToast();
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<BulkResult | void>, okMsg: (n: number) => string) {
    setBusy(true);
    try {
      const r = await fn();
      if (r && r.failed.length) toast(`${formatNumber(r.done)} انجام شد، ${formatNumber(r.failed.length)} ناموفق: ${r.failed[0].error}`, "err");
      else toast(okMsg(r ? r.done : 1));
      onDone();
      onClose();
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}

export function MessageDialog({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const { busy, run } = useRunner(onDone, onClose);
  return (
    <AdminModal title={`ارسال پیام به ${formatNumber(ids.length)} کاربر`} eyebrow="اعلان درون‌برنامه‌ای" onClose={onClose}>
      <div className="au-form">
        <label className="admin-field"><span>عنوان</span>
          <input className="admin-input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>
        <label className="admin-field"><span>متن</span>
          <textarea className="admin-input" rows={4} maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
      </div>
      <Footer busy={busy} label="ارسال" onClose={onClose} disabled={!title.trim() || !body.trim()}
        onSubmit={() => run(() => postBulk(ids, "message", { title, body }), (n) => `پیام برای ${formatNumber(n)} کاربر رفت`)} />
    </AdminModal>
  );
}

export function GrantDialog({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone: () => void }) {
  const [mods, setMods] = useState<Set<string>>(new Set());
  const [days, setDays] = useState("30");
  const { busy, run } = useRunner(onDone, onClose);
  const n = Math.floor(Number(days));
  const valid = mods.size > 0 && Number.isFinite(n) && n >= 1 && n <= 3650;
  return (
    <AdminModal title={`اعطای ماژول به ${formatNumber(ids.length)} کاربر`} eyebrow="دسترسی" onClose={onClose}>
      <div className="au-form">
        <div className="au-checks">
          {ALL_MODULES.map((m) => (
            <TickOption key={m} checked={mods.has(m)} onChange={(v) => setMods((s) => { const x = new Set(s); if (v) x.add(m); else x.delete(m); return x; })}>
              {MODULE_LABELS_FA[m]}
            </TickOption>
          ))}
        </div>
        <label className="admin-field"><span>تعداد روز (از انقضای فعلی یا از الان)</span>
          <input className="admin-input admin-ltr" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ""))} />
        </label>
      </div>
      <Footer busy={busy} label="اعطا" onClose={onClose} disabled={!valid}
        onSubmit={() => run(() => postBulk(ids, "grant", { modules: Array.from(mods), days: n }), (c) => `دسترسی برای ${formatNumber(c)} کاربر ثبت شد`)} />
    </AdminModal>
  );
}

export function TagDialog({ ids, mode = "tag", suggestions = [], onClose, onDone }: { ids: string[]; mode?: "tag" | "untag"; suggestions?: string[]; onClose: () => void; onDone: () => void }) {
  const [tag, setTag] = useState("");
  const { busy, run } = useRunner(onDone, onClose);
  return (
    <AdminModal title={mode === "tag" ? "افزودن برچسب" : "حذف برچسب"} eyebrow={`${formatNumber(ids.length)} کاربر`} onClose={onClose}>
      <div className="au-form">
        <label className="admin-field"><span>برچسب</span>
          <input className="admin-input" value={tag} maxLength={MAX_TAG_LEN} onChange={(e) => setTag(e.target.value)} autoFocus />
        </label>
        {suggestions.length > 0 && (
          <div className="au-chips">
            {suggestions.slice(0, 12).map((s) => <button key={s} type="button" className="au-chip" onClick={() => setTag(s)}>{s}</button>)}
          </div>
        )}
      </div>
      <Footer busy={busy} label={mode === "tag" ? "افزودن" : "حذف"} onClose={onClose} disabled={!tag.trim()}
        onSubmit={() => run(() => postBulk(ids, mode, { tag }), (c) => `برچسب برای ${formatNumber(c)} کاربر ثبت شد`)} />
    </AdminModal>
  );
}

export function ExtendDialog({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [days, setDays] = useState("30");
  const { busy, run } = useRunner(onDone, onClose);
  const n = Math.floor(Number(days));
  return (
    <AdminModal title="تمدید دستی اشتراک" eyebrow="اشتراک" onClose={onClose}>
      <div className="au-form">
        <label className="admin-field"><span>تعداد روز</span>
          <input className="admin-input admin-ltr" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ""))} autoFocus />
        </label>
      </div>
      <Footer busy={busy} label="تمدید" onClose={onClose} disabled={!(n >= 1 && n <= 3650)}
        onSubmit={() => run(async () => { await adminFetch(`/api/admin/users/${id}/extend`, { method: "POST", json: { days: n } }); }, () => "اشتراک تمدید شد")} />
    </AdminModal>
  );
}

export function SaveSegmentDialog({ filters, onClose, onDone }: { filters: UsersFilters; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const { busy, run } = useRunner(onDone, onClose);
  return (
    <AdminModal title="ذخیره به‌عنوان بخش" eyebrow="فیلترهای فعلی" onClose={onClose}>
      <div className="au-form">
        <label className="admin-field"><span>اسم بخش</span>
          <input className="admin-input" value={name} maxLength={MAX_SEGMENT_NAME} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
      </div>
      <Footer busy={busy} label="ذخیره" onClose={onClose} disabled={!name.trim()}
        onSubmit={() => run(async () => { await adminFetch("/api/admin/users/segments", { method: "POST", json: { name, filters } }); }, () => "بخش ذخیره شد")} />
    </AdminModal>
  );
}
