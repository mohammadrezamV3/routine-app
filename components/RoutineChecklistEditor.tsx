"use client";

// ویرایشگرِ آیتم‌های برنامه‌ی لیستی (lib/routineChecklist.ts) — داخلِ فرمِ
// افزودن/ویرایشِ برنامه. هر آیتم یک اسم داره؛ Enter روی فیلدِ پایین آیتمِ تازه
// اضافه می‌کنه. همون کلاس‌های فیلد/دکمه‌ی خودِ فرم.

import { useState } from "react";
import { Minus } from "lucide-react";
import { MAX_CHECKLIST_ITEMS, newItemId, type ChecklistItem } from "@/lib/routineChecklist";

export function RoutineChecklistEditor({ items, onChange, error }: { items: ChecklistItem[]; onChange: (items: ChecklistItem[]) => void; error?: boolean }) {
  const [draft, setDraft] = useState("");
  const full = items.length >= MAX_CHECKLIST_ITEMS;

  function add() {
    const name = draft.trim().slice(0, 80);
    if (!name || full) return;
    onChange([...items, { id: newItemId(), name }]);
    setDraft("");
  }

  return (
    <div className={`checklist-editor${error ? " field-error" : ""}`}>
      {items.map((it, i) => (
        <div key={it.id} className="checklist-editor-row">
          <span className="checklist-editor-num">{i + 1}</span>
          <input
            type="text"
            className="wsearch-newform-name"
            value={it.name}
            maxLength={80}
            aria-label={`آیتمِ ${i + 1}`}
            onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, name: e.target.value } : x)))}
          />
          <button type="button" className="wsearch-newrow-remove-text" onClick={() => onChange(items.filter((x) => x.id !== it.id))} aria-label={`حذفِ ${it.name}`}>
            <Minus size={12} />
            حذف
          </button>
        </div>
      ))}
      {!full && (
        <div className="checklist-editor-row">
          <span className="checklist-editor-num">+</span>
          <input
            type="text"
            className="wsearch-newform-name"
            placeholder={items.length ? "آیتمِ بعدی…" : "مثلا: نان، شیر، میوه…"}
            value={draft}
            maxLength={80}
            // Enter آیتم اضافه می‌کنه (نه پرش به فیلدِ بعدیِ فرم)
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); add(); } }}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="button" className="wsearch-add-btn checklist-editor-add" onClick={add} disabled={!draft.trim()}>
            افزودن
            <span className="wsearch-add-btn-icon">+</span>
          </button>
        </div>
      )}
    </div>
  );
}
