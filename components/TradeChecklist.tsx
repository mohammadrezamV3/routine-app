"use client";

import { useEffect, useRef, useState } from "react";

type ChecklistItem = { id: string; text: string; order: number };
const MAX_ITEMS = 40;

// چک‌لیست کاملاً دست‌ساز کاربر، نه قالب ثابت — می‌تونه متن آیتم‌ها رو عوض
// کنه، جابه‌جاشون کنه (دکمه‌های بالا/پایین به‌جای درگ‌اند‌دراپ لمسی شکننده،
// طبق تحقیق UX برای لیست‌های کوتاه-تا-متوسط رو موبایل قابل‌اعتمادتره)، حذف
// کنه یا تا ۴۰ تا آیتم جدید اضافه کنه. تیک هر آیتم فقط محلی و برای همون
// نشستِ بازبینیِ پیش از معامله‌ست، هر بار صفحه لود بشه از نو خالیه — چون این
// چک‌لیست قراره برای هر معامله دوباره مرور بشه، نه یه عادت روزانه‌ی دائمی.
export function TradeChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/trade/checklist");
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
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

  function startEdit(item: ChecklistItem) {
    setEditingId(item.id);
    setEditText(item.text);
  }

  async function saveEdit(id: string) {
    const text = editText.trim();
    setEditingId(null);
    if (!text) return;
    setItems((its) => its.map((i) => (i.id === id ? { ...i, text } : i)));
    await fetch("/api/trade/checklist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, text }),
    });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    fetch("/api/trade/checklist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((i) => i.id) }),
    });
  }

  if (loading) return <div className="item-line" style={{ marginTop: 14 }}>در حال بارگذاری…</div>;

  return (
    <div className="checklist-glass trade-checklist" style={{ marginTop: 14 }}>
      {items.map((item, i) => {
        const on = !!checked[item.id];
        return (
          <div key={item.id} className="trade-checklist-row">
            <div className={`check${on ? " on" : ""}`} onClick={() => setChecked((c) => ({ ...c, [item.id]: !c[item.id] }))}>
              <svg className="c-check" viewBox="0 0 24 24" fill="none">
                <path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {editingId === item.id ? (
              <input
                className="trade-checklist-edit-input"
                value={editText}
                autoFocus
                onChange={(e) => setEditText(e.target.value)}
                onBlur={() => saveEdit(item.id)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEdit(item.id); } }}
              />
            ) : (
              <div className={`task-name${on ? " done" : ""}`} style={{ cursor: "text" }} onClick={() => startEdit(item)}>
                {item.text}
              </div>
            )}

            <div className="trade-checklist-controls">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="بالا">
                <svg viewBox="0 0 24 24" fill="none"><path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="پایین">
                <svg viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button type="button" className="trade-checklist-remove" onClick={() => removeItem(item.id)} aria-label="حذف">×</button>
            </div>
          </div>
        );
      })}

      <div className="trade-checklist-add-row">
        <input
          ref={addInputRef}
          className="wsearch-newform-name"
          placeholder="آیتم جدید…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
          disabled={items.length >= MAX_ITEMS}
        />
        <button type="button" className="trade-checklist-add-btn" onClick={addItem} disabled={!newText.trim() || items.length >= MAX_ITEMS}>+</button>
      </div>
      <div className="trade-checklist-count" dir="ltr">{items.length} / {MAX_ITEMS}</div>
    </div>
  );
}
