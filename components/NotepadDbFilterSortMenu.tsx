"use client";

import { Plus, Trash2, X } from "lucide-react";
import { DatabaseProperty, FilterOp, FilterRule, SortRule } from "@/lib/notepadDb";

const OP_LABELS: Record<FilterOp, string> = {
  eq: "برابر",
  neq: "نابرابر",
  contains: "شامل",
  is_empty: "خالیه",
  is_not_empty: "خالی نیست",
  gt: "بیشتر از",
  lt: "کمتر از",
  checked: "تیک‌خورده",
  unchecked: "تیک‌نخورده",
}
function opsForType(type: DatabaseProperty["type"]): FilterOp[] {
  if (type === "checkbox") return ["checked", "unchecked"];
  if (type === "number") return ["eq", "neq", "gt", "lt", "is_empty", "is_not_empty"];
  if (type === "select" || type === "multi_select" || type === "relation") return ["eq", "neq", "is_empty", "is_not_empty"];
  return ["eq", "neq", "contains", "is_empty", "is_not_empty"];
}

// پاپ‌آپ مدیریت فیلتر/سورت/مخفی‌کردن propertyها — یه پیکربندی مشترک برای
// کل دیتابیس (نه جدا برای هر ویو)
export function NotepadDbFilterSortMenu({
  properties,
  filters,
  sorts,
  hiddenPropertyIds,
  onChange,
  onClose,
}: {
  properties: DatabaseProperty[];
  filters: FilterRule[];
  sorts: SortRule[];
  hiddenPropertyIds: string[];
  onChange: (patch: { filters?: FilterRule[]; sorts?: SortRule[]; hiddenPropertyIds?: string[] }) => void;
  onClose: () => void;
}) {
  function addFilter() {
    if (!properties.length) return;
    const p = properties[0];
    onChange({ filters: [...filters, { id: `f_${Date.now()}`, propertyId: p.id, op: opsForType(p.type)[0] }] });
  }
  function addSort() {
    if (!properties.length) return;
    onChange({ sorts: [...sorts, { propertyId: properties[0].id, dir: "asc" }] });
  }

  return (
    <>
      <div className="fixed inset-0 z-[19]" onClick={onClose} />
      <div className="notepad-db-filter-menu">
        <div className="notepad-db-filter-menu-head">
          <span>فیلتر / سورت / نمایش</span>
          <button type="button" className="notepad-icon-btn" onClick={onClose} style={{ width: 26, height: 26 }}><X size={13} /></button>
        </div>

        <div className="notepad-db-filter-section">
          <div className="notepad-db-filter-section-title">فیلترها</div>
          {filters.map((f, i) => {
            const prop = properties.find((p) => p.id === f.propertyId);
            return (
              <div key={f.id} className="notepad-db-filter-row">
                <select value={f.propertyId} onChange={(e) => {
                  const next = [...filters]; next[i] = { ...f, propertyId: e.target.value, op: opsForType(properties.find(p=>p.id===e.target.value)?.type || "text")[0] };
                  onChange({ filters: next });
                }}>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={f.op} onChange={(e) => { const next = [...filters]; next[i] = { ...f, op: e.target.value as FilterOp }; onChange({ filters: next }); }}>
                  {opsForType(prop?.type || "text").map((op) => <option key={op} value={op}>{OP_LABELS[op]}</option>)}
                </select>
                {!["is_empty", "is_not_empty", "checked", "unchecked"].includes(f.op) && (
                  <input
                    type="text"
                    placeholder="مقدار"
                    value={typeof f.value === "string" || typeof f.value === "number" ? String(f.value) : ""}
                    onChange={(e) => { const next = [...filters]; next[i] = { ...f, value: e.target.value }; onChange({ filters: next }); }}
                  />
                )}
                <button type="button" onClick={() => onChange({ filters: filters.filter((x) => x.id !== f.id) })}><Trash2 size={12} /></button>
              </div>
            );
          })}
          <button type="button" className="notepad-db-filter-add-btn" onClick={addFilter}><Plus size={12} /> فیلتر جدید</button>
        </div>

        <div className="notepad-db-filter-section">
          <div className="notepad-db-filter-section-title">سورت</div>
          {sorts.map((s, i) => (
            <div key={i} className="notepad-db-filter-row">
              <select value={s.propertyId} onChange={(e) => { const next = [...sorts]; next[i] = { ...s, propertyId: e.target.value }; onChange({ sorts: next }); }}>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={s.dir} onChange={(e) => { const next = [...sorts]; next[i] = { ...s, dir: e.target.value as "asc" | "desc" }; onChange({ sorts: next }); }}>
                <option value="asc">صعودی</option>
                <option value="desc">نزولی</option>
              </select>
              <button type="button" onClick={() => onChange({ sorts: sorts.filter((_, idx) => idx !== i) })}><Trash2 size={12} /></button>
            </div>
          ))}
          <button type="button" className="notepad-db-filter-add-btn" onClick={addSort}><Plus size={12} /> سورت جدید</button>
        </div>

        <div className="notepad-db-filter-section">
          <div className="notepad-db-filter-section-title">نمایش ستون‌ها</div>
          {properties.map((p) => {
            const hidden = hiddenPropertyIds.includes(p.id);
            return (
              <label key={p.id} className="notepad-db-hide-row">
                <input
                  type="checkbox"
                  checked={!hidden}
                  onChange={() => onChange({ hiddenPropertyIds: hidden ? hiddenPropertyIds.filter((id) => id !== p.id) : [...hiddenPropertyIds, p.id] })}
                />
                {p.name}
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
}
