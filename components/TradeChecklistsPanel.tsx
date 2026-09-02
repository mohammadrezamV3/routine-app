"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Reorder, motion } from "framer-motion";
import { ClipboardList, Copy, GripVertical, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { PanelSkeleton } from "./PanelSkeleton";
import { takePreloaded } from "@/lib/preload";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { LockBodyScroll } from "./LockBodyScroll";
import { TradeKebabMenu } from "./TradeKebabMenu";
import {
  MAX_CHECKLIST_ITEMS, TAG_COLORS,
} from "@/lib/tradeTypes";

type Item = { id: string; text: string; order: number };
type Checklist = { id: string; name: string; color: string; required: boolean; archived: boolean; order: number; note: string | null; items: Item[] };

// مثل حساب‌ها: فهرست فشرده‌ی چک‌لیست‌ها، نه کارت‌های باز همیشه‌گسترده.
// انتخاب یک چک‌لیست به صفحه‌ی اختصاصی‌اش می‌رود (/trade/checklists/[id]) —
// آنجاست که آیتم‌ها تیک می‌خورند و معامله شروع می‌شود، نه این‌جا.
export function TradeChecklistsPanel({
  creating,
  onCreatingChange,
}: {
  creating: boolean;
  onCreatingChange: (v: boolean) => void;
}) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Checklist | null>(null);
  const { pendingKey, error: actionError, run } = useAsyncAction();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // پرانتز لازم است: بدون آن `takePreloaded(...) ?? await fetch(...)` یعنی
      // اگر پیش‌درخواستی وجود داشت، خودِ Promise (نه مقدار resolve شده) توی
      // cRes می‌نشست و `cRes?.checklists` همیشه undefined می‌شد — یعنی لیست
      // با وجود داشتن داده، خالی نشان داده می‌شد.
      const cRes = await (takePreloaded("/api/trade/checklists") ?? fetch("/api/trade/checklists").then((r) => (r.ok ? r.json() : null)));
      setChecklists(cRes?.checklists || []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function duplicate(id: string) {
    const ok = await run(`dup:${id}`, () =>
      fetch("/api/trade/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateOf: id }),
      })
    );
    if (ok) load(true);
  }

  async function remove(id: string) {
    setChecklists((prev) => prev.filter((c) => c.id !== id));
    const ok = await run(`del:${id}`, () => fetch(`/api/trade/checklists?id=${id}`, { method: "DELETE" }));
    load(true);
    if (!ok) return;
  }

  if (loading) return <PanelSkeleton />;

  return (
    <div>
      {actionError && <div className="trade-form-error">{actionError}</div>}

      {!checklists.length && (
        <div className="trade-empty-state">
          <ClipboardList size={32} />
          <p>هنوز چک‌لیستی نساختی</p>
        </div>
      )}

      {/* همه‌ی چک‌لیست‌ها داخل یک باکس واحدند، نه هرکدام یک کارت شناور روی
          بک‌گراند اصلی (درخواست صریح). */}
      {!!checklists.length && (
        <div className="trade-surface trade-checklist-box">
          {checklists.map((c, idx) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: Math.min(idx, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
              className="trade-checklist-row"
            >
              <span className="trade-checklist-row-stripe" style={{ background: c.color }} />
              <div className="trade-checklist-row-kebab">
                <TradeKebabMenu
                  label={`گزینه‌های ${c.name}`}
                  actions={[
                    { label: "ویرایش", icon: <Pencil size={14} />, onClick: () => setEditing(c) },
                    { label: "کپی", icon: <Copy size={14} />, onClick: () => duplicate(c.id), disabled: pendingKey === `dup:${c.id}` },
                    { label: "حذف", icon: <Trash2 size={14} />, onClick: () => remove(c.id), danger: true },
                  ]}
                />
              </div>
              <Link href={`/trade/checklists/${c.id}`} prefetch className="trade-checklist-row-main">
                <span className="trade-account-name">{c.name}</span>
                {c.required && <span className="trade-account-type">الزامی</span>}
                <span className="trade-checklist-row-count mono">{faNum(c.items.length)} مورد</span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ChecklistEditor
          checklist={editing}
          onClose={() => { onCreatingChange(false); setEditing(null); }}
          onSaved={() => { onCreatingChange(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

// ویرایشگر چک‌لیست — آیتم‌ها با درگ واقعی جابه‌جا می‌شوند (نه دکمه‌ی
// بالا/پایین) و کل لیست یکجا ذخیره می‌شود.
function ChecklistEditor({
  checklist,
  onClose,
  onSaved,
}: {
  checklist: Checklist | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(checklist?.name || "");
  const [color, setColor] = useState(checklist?.color || TAG_COLORS[3]);
  const [required, setRequired] = useState(checklist?.required || false);
  const [items, setItems] = useState<{ key: string; text: string }[]>(
    checklist?.items.map((i) => ({ key: i.id, text: i.text })) || []
  );
  const [note, setNote] = useState(checklist?.note || "");
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addItem() {
    const t = newText.trim();
    if (!t || items.length >= MAX_CHECKLIST_ITEMS) return;
    setItems((prev) => [...prev, { key: `new-${Date.now()}-${prev.length}`, text: t }]);
    setNewText("");
  }

  async function save() {
    if (saving) return;
    if (!name.trim()) { setError("نام چک‌لیست را وارد کن"); return; }
    setSaving(true);
    setError(null);
    const body = {
      id: checklist?.id,
      name: name.trim(),
      color,
      required,
      note,
      items: items.map((i) => i.text),
    };
    const res = await fetch("/api/trade/checklists", {
      method: checklist ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) { setError(data?.error || "خطا در ذخیره چک‌لیست"); return; }
    onSaved();
  }

  return (
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="modal-title">{checklist ? "ویرایش چک‌لیست" : "چک‌لیست جدید"}</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن"><X size={16} /></button>
        </div>

        <label className="exercise-form-label">نام چک‌لیست</label>
        <input className="wsearch-newform-name trade-glass-field" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="مثلا London Breakout" />

        <label className="exercise-form-label">رنگ</label>
        <div className="trade-color-row">
          {TAG_COLORS.map((c) => (
            <button key={c} type="button" className={`trade-color-dot${c === color ? " active" : ""}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
          ))}
        </div>

        <label className="exercise-form-label">الزام تکمیل برای ورود طبق پلن</label>
        <button type="button" className={`trade-toggle${required ? " on" : ""}`} onClick={() => setRequired((v) => !v)}>
          <span className="trade-toggle-knob" />
          <span className="trade-toggle-label">
            {required ? "تکمیل‌نکردنش فقط هشدار می‌دهد — جلوی ثبت معامله را نمی‌گیرد" : "بدون الزام"}
          </span>
        </button>

        <label className="exercise-form-label">موارد ({faNum(items.length)}/{faNum(MAX_CHECKLIST_ITEMS)})</label>
        <Reorder.Group axis="y" values={items} onReorder={setItems} className="trade-checklist-edit-list">
          {items.map((it) => (
            <Reorder.Item key={it.key} value={it} className="trade-checklist-edit-row">
              <GripVertical size={15} className="trade-grip" />
              <input className="wsearch-newform-name trade-glass-field"
                value={it.text}
                onChange={(e) => setItems((prev) => prev.map((p) => (p.key === it.key ? { ...p, text: e.target.value } : p)))}
                maxLength={200}
              />
              <button type="button" className="trade-icon-btn danger" onClick={() => setItems((prev) => prev.filter((p) => p.key !== it.key))} aria-label="حذف">
                <Trash2 size={14} />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {items.length < MAX_CHECKLIST_ITEMS && (
          <div className="trade-checklist-add-row">
            <input className="wsearch-newform-name trade-glass-field"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              maxLength={200}
              placeholder="مورد جدید..."
            />
            <button type="button" className="trade-icon-btn" onClick={addItem} aria-label="افزودن"><Plus size={16} /></button>
          </div>
        )}

        {/* نکات آزاد — چیزهایی که مورد تیک‌خور نیستن ولی موقع اجرای ستاپ
            باید جلوی چشم باشن (شرایط بازار، ساعت مجاز، ...) */}
        <label className="exercise-form-label">نکات (اختیاری)</label>
        <textarea
          className="wsearch-newform-name trade-glass-field"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          placeholder="مثلا: فقط توی سشن لندن، نه نیم‌ساعت قبل از خبر"
        />

        {error && <div className="trade-form-error">{error}</div>}

        <div className="trade-modal-actions">
          <button type="button" className="account-outline-btn" onClick={onClose}>لغو</button>
          <button type="button" className="trade-primary-btn" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={15} className="trade-spin" /> : "ذخیره"}
          </button>
        </div>
      </div>
    </>
  );
}
