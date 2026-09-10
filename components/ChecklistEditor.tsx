"use client";

import { useState } from "react";
import { Reorder } from "framer-motion";
import { GripVertical, Loader2, Plus, Trash2, X } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { LockBodyScroll } from "./LockBodyScroll";
import { MAX_CHECKLIST_ITEMS, TAG_COLORS } from "@/lib/tradeTypes";

type Item = { id: string; text: string; order: number };
type Checklist = { id: string; name: string; color: string; required: boolean; archived: boolean; order: number; note: string | null; items: Item[] };

// ویرایشگر چک‌لیست — از TradeChecklistsPanel جدا شد تا هم از فهرست چک‌لیست‌ها
// هم از صفحه‌ی اختصاصیِ یک چک‌لیست (TradeChecklistDetailView) قابل استفاده
// باشد؛ یک فرم، نه دو نسخه‌ی جداگانه که از هم دور می‌افتند.
export function ChecklistEditor({
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
      <div className="modal-panel open modal-panel-notransform" role="dialog" aria-modal="true">
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
