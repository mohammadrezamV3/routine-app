"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import {
  DatabaseProperty, PROPERTY_TYPE_META, PROPERTY_TYPE_ORDER, PropertyType,
  SelectOption, makeSelectOption,
} from "@/lib/notepadDb";

// پاپ‌آپِ افزودن/ویرایشِ یک property — اسم، نوع (فقط موقعِ افزودن قابل‌تغییره،
// عوض‌کردنِ نوعِ یه propertyِ موجود دامنه‌ی این فاز نیست)، و ادیتورِ
// گزینه‌های اختصاصیِ همون نوع (select/multi_select choices یا فرمول)
export function NotepadDbPropertyMenu({
  property,
  onCreate,
  onUpdate,
  onDelete,
  onClose,
}: {
  property?: DatabaseProperty | null;
  onCreate?: (input: { name: string; type: PropertyType }) => void;
  onUpdate?: (patch: { name?: string; options?: DatabaseProperty["options"] }) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const isEdit = !!property;
  const [name, setName] = useState(property?.name || "");
  const [type, setType] = useState<PropertyType>(property?.type || "text");
  const [choices, setChoices] = useState<SelectOption[]>((property?.options as any)?.choices || []);
  const [expression, setExpression] = useState((property?.options as any)?.expression || "");
  const [newChoiceLabel, setNewChoiceLabel] = useState("");

  function addChoice() {
    if (!newChoiceLabel.trim()) return;
    setChoices((c) => [...c, makeSelectOption(newChoiceLabel.trim())]);
    setNewChoiceLabel("");
  }

  function save() {
    const trimmed = name.trim() || "بدون‌عنوان";
    if (isEdit) {
      const options = type === "select" || type === "multi_select" ? { choices } : type === "formula" ? { expression } : property!.options;
      onUpdate?.({ name: trimmed, options });
    } else {
      onCreate?.({ name: trimmed, type });
    }
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-[19]" onClick={onClose} />
      <div className="notepad-db-property-menu">
        <div className="notepad-db-property-menu-head">
          <input
            autoFocus
            type="text"
            className="notepad-db-property-name-input"
            placeholder="اسمِ property"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="button" className="notepad-icon-btn" onClick={onClose} style={{ width: 28, height: 28 }}>
            <X size={14} />
          </button>
        </div>

        {!isEdit && (
          <div className="notepad-db-type-grid">
            {PROPERTY_TYPE_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                className={`notepad-db-type-item${type === t ? " active" : ""}`}
                onClick={() => setType(t)}
              >
                {PROPERTY_TYPE_META[t].label}
              </button>
            ))}
          </div>
        )}

        {(type === "select" || type === "multi_select") && (
          <div className="notepad-db-choices-editor">
            {choices.map((c) => (
              <div key={c.id} className="notepad-db-choice-row">
                <span className="notepad-db-color-dot" style={{ background: c.color }} />
                <input
                  type="text"
                  value={c.label}
                  onChange={(e) => setChoices((arr) => arr.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)))}
                />
                <button type="button" onClick={() => setChoices((arr) => arr.filter((x) => x.id !== c.id))}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <div className="notepad-db-choice-row">
              <input
                type="text"
                placeholder="گزینه‌ی جدید…"
                value={newChoiceLabel}
                onChange={(e) => setNewChoiceLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChoice(); } }}
              />
              <button type="button" onClick={addChoice}><Plus size={12} /></button>
            </div>
          </div>
        )}

        {type === "formula" && (
          <div className="notepad-db-choices-editor">
            <label className="notepad-db-formula-label">فرمول (اسمِ propertyهای عددی + عملگرهای + - × ÷)</label>
            <input
              type="text"
              className="notepad-db-property-name-input"
              placeholder="مثلاً: قیمت * تعداد"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              dir="ltr"
            />
          </div>
        )}

        <div className="notepad-db-property-menu-actions">
          {isEdit && onDelete && (
            <button type="button" className="notepad-db-property-delete-btn" onClick={() => { onDelete(); onClose(); }}>
              <Trash2 size={12} /> حذفِ property
            </button>
          )}
          <button type="button" className="notepad-db-property-save-btn" onClick={save}>ثبت</button>
        </div>
      </div>
    </>
  );
}
