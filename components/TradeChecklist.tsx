"use client";

import { useEffect, useRef, useState } from "react";
import { Reorder } from "framer-motion";

type ChecklistItem = { id: string; text: string; order: number };
const MAX_ITEMS = 40;

// دو حالت جدا: «استفاده» (چک‌لیست ساده و تمیز، فقط تیک بزن) و «ویرایش»
// (با زدن دکمه‌ی افزودن باز می‌شه — همون‌جا هم آیتم‌های قبلی برای ویرایشِ
// متن/جابه‌جایی میان، هم می‌تونی آیتم جدید اضافه کنی). جابه‌جایی با درگ واقعی
// (framer-motion Reorder) نه دکمه‌های بالا/پایین — حس گرفتن و کشیدن واقعی داره.
export function TradeChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [newText, setNewText] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/trade/checklist");
      const data = await res.json();
      setItems(res.ok ? data.items || [] : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function addItem() {
    const text = newText.trim();
    if (!text || items.length >= MAX_ITEMS) return;
    setNewText("");
    const res = await fetch("/api/trade/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) load();
    addInputRef.current?.focus();
  }

  async function removeItem(id: string) {
    setItems((its) => its.filter((i) => i.id !== id));
    await fetch(`/api/trade/checklist?id=${id}`, { method: "DELETE" });
  }

  function updateTextLocal(id: string, text: string) {
    setItems((its) => its.map((i) => (i.id === id ? { ...i, text } : i)));
  }

  async function commitText(id: string, text: string) {
    if (!text.trim()) return;
    await fetch("/api/trade/checklist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, text: text.trim() }),
    });
  }

  async function handleReorder(newOrder: ChecklistItem[]) {
    setItems(newOrder);
    await fetch("/api/trade/checklist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: newOrder.map((i) => i.id) }),
    });
  }

  if (loading) return <div className="item-line" style={{ marginTop: 14 }}>در حال بارگذاری…</div>;

  if (!editMode) {
    return (
      <div style={{ marginTop: 14 }}>
        <div className="checklist-glass">
          {items.length ? items.map((item) => {
            const on = !!checked[item.id];
            return (
              <div key={item.id} onClick={() => setChecked((c) => ({ ...c, [item.id]: !c[item.id] }))} className="task">
                <div className={`check${on ? " on" : ""}`}>
                  <svg className="c-check" viewBox="0 0 24 24" fill="none">
                    <path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className={`task-name${on ? " done" : ""}`}>{item.text}</div>
              </div>
            );
          }) : (
            <div className="item-line empty">هنوز آیتمی نساختی.</div>
          )}
        </div>
        <button type="button" className="tc-manage-btn" onClick={() => setEditMode(true)}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          افزودن و ویرایش آیتم‌ها
        </button>
      </div>
    );
  }

  return (
    <div className="tc-edit-wrap" style={{ marginTop: 14 }}>
      <div className="tc-edit-head">
        <span>ویرایش چک‌لیست</span>
        <button type="button" className="tc-done-btn" onClick={() => setEditMode(false)}>تمام</button>
      </div>

      <Reorder.Group as="div" axis="y" values={items} onReorder={handleReorder} className="tc-reorder-group">
        {items.map((item) => (
          <Reorder.Item
            key={item.id}
            value={item}
            className="tc-edit-row"
            whileDrag={{ scale: 1.03, boxShadow: "0 10px 28px rgba(0,0,0,.35)", zIndex: 5 }}
          >
            <span className="tc-drag-handle" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
                <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
                <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
              </svg>
            </span>
            <input
              className="tc-edit-input"
              value={item.text}
              onChange={(e) => updateTextLocal(item.id, e.target.value)}
              onBlur={(e) => commitText(item.id, e.target.value)}
            />
            <button type="button" className="tc-delete-btn" onClick={() => removeItem(item.id)} aria-label="حذف">×</button>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <div className="tc-add-row">
        <input
          ref={addInputRef}
          className="wsearch-newform-name"
          placeholder="آیتم جدید…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
          disabled={items.length >= MAX_ITEMS}
        />
        <button type="button" className="tc-add-btn" onClick={addItem} disabled={!newText.trim() || items.length >= MAX_ITEMS}>+</button>
      </div>
      <div className="trade-checklist-count" dir="ltr">{items.length} / {MAX_ITEMS}</div>
    </div>
  );
}
