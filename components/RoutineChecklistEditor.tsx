"use client";

// ویرایشگر آیتم‌های برنامه‌ی لیستی (lib/routineChecklist.ts) — داخل فرم
// افزودن/ویرایش برنامه. هر آیتم یک اسم داره؛ Enter روی فیلد پایین آیتم تازه
// اضافه می‌کنه. همون کلاس‌های فیلد/دکمه‌ی خود فرم. جای آیتم‌ها با درگ و دراپ
// از دستگیره‌ی سمت راست (ماوس و لمس) یا با ArrowUp/ArrowDown روی دستگیره عوض
// می‌شه؛ idها دست نمی‌خورن و ترتیب همون ترتیب items ذخیره‌شده‌ست.

import { useState } from "react";
import { GripVertical, Minus, Plus } from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import { MAX_CHECKLIST_ITEMS, newItemId, type ChecklistItem } from "@/lib/routineChecklist";

function ItemRow({ item, index, count, onRename, onRemove, onMove }: {
  item: ChecklistItem; index: number; count: number;
  onRename: (v: string) => void; onRemove: () => void; onMove: (delta: -1 | 1) => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      as="div"
      className="checklist-editor-row"
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, zIndex: 5 }}
    >
      <button
        type="button"
        className="checklist-editor-grip"
        aria-label={`جابه‌جایی آیتم ${index + 1}`}
        onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" && index > 0) { e.preventDefault(); e.stopPropagation(); onMove(-1); }
          else if (e.key === "ArrowDown" && index < count - 1) { e.preventDefault(); e.stopPropagation(); onMove(1); }
        }}
      >
        <GripVertical size={16} />
      </button>
      <input
        type="text"
        className="wsearch-newform-name"
        value={item.name}
        maxLength={80}
        aria-label={`آیتم ${index + 1}`}
        onChange={(e) => onRename(e.target.value)}
      />
      <button type="button" className="wsearch-newrow-remove-text" onClick={onRemove} aria-label={`حذف ${item.name}`}>
        <Minus size={12} />
        حذف
      </button>
    </Reorder.Item>
  );
}

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
      <Reorder.Group axis="y" as="div" values={items} onReorder={onChange} className="checklist-editor-list">
        {items.map((it, i) => (
          <ItemRow
            key={it.id}
            item={it}
            index={i}
            count={items.length}
            onRename={(v) => onChange(items.map((x) => (x.id === it.id ? { ...x, name: v } : x)))}
            onRemove={() => onChange(items.filter((x) => x.id !== it.id))}
            onMove={(d) => {
              const next = [...items];
              [next[i], next[i + d]] = [next[i + d], next[i]];
              onChange(next);
            }}
          />
        ))}
      </Reorder.Group>
      {!full && (
        <div className="checklist-editor-row">
          <span className="checklist-editor-spacer" aria-hidden="true" />
          <input
            type="text"
            className="wsearch-newform-name"
            placeholder={items.length ? "آیتم بعدی…" : "مثلا: نان، شیر، میوه…"}
            value={draft}
            maxLength={80}
            // Enter آیتم اضافه می‌کنه (نه پرش به فیلد بعدی فرم)
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); add(); } }}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="button" className="wsearch-add-btn checklist-editor-add" onClick={add} disabled={!draft.trim()}>
            <Plus size={14} />
            افزودن
          </button>
        </div>
      )}
    </div>
  );
}
