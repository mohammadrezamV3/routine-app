"use client";

import { useEffect, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import {
  DatabaseProperty, DatabaseRecord, RecordValue, SelectOption,
  evaluateFormula, makeSelectOption,
} from "@/lib/notepadDb";

function ColorDot({ color }: { color: string }) {
  return <span className="notepad-db-color-dot" style={{ background: color }} />;
}

function SelectPill({ option, small }: { option: SelectOption; small?: boolean }) {
  return (
    <span className={`notepad-db-pill${small ? " small" : ""}`} style={{ background: `${option.color}26`, color: option.color }}>
      {option.label}
    </span>
  );
}

// یه سلولِ واحد از دیتابیس — رندر/ویرایشِ مقدار بسته به نوعِ property. توی
// Table/Board/Gallery/Calendar/List همه از همین یه کامپوننت استفاده می‌شه،
// فقط با compact=true فشرده‌تر رندر می‌شه (کارت‌های بورد/گالری)
export function NotepadDbCell({
  property,
  value,
  record,
  properties,
  onChange,
  compact,
  onUpdateOptions,
}: {
  property: DatabaseProperty;
  value: RecordValue;
  record?: DatabaseRecord;
  properties?: DatabaseProperty[];
  onChange: (v: RecordValue) => void;
  compact?: boolean;
  onUpdateOptions?: (options: DatabaseProperty["options"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [localText, setLocalText] = useState(typeof value === "string" ? value : value === null || value === undefined ? "" : String(value));

  useEffect(() => {
    setLocalText(typeof value === "string" ? value : value === null || value === undefined ? "" : String(value));
  }, [value]);

  switch (property.type) {
    case "text":
    case "url":
    case "email":
      return (
        <input
          type={property.type === "email" ? "email" : property.type === "url" ? "url" : "text"}
          className="notepad-db-cell-input"
          value={localText}
          placeholder="—"
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={() => { if (localText !== value) onChange(localText || null); }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          dir={property.type === "text" ? "auto" : "ltr"}
        />
      );

    case "number":
      return (
        <input
          type="number"
          className="notepad-db-cell-input mono"
          value={localText}
          placeholder="—"
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={() => {
            const n = localText.trim() === "" ? null : Number(localText);
            if (n !== value) onChange(Number.isFinite(n) ? n : null);
          }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        />
      );

    case "checkbox":
      return (
        <button
          type="button"
          className={`notepad-db-checkbox${value ? " on" : ""}`}
          onClick={() => onChange(!value)}
          aria-label="تیک بزن"
        >
          {value ? <Check size={12} strokeWidth={3} /> : null}
        </button>
      );

    case "date":
      return (
        <input
          type="date"
          className="notepad-db-cell-input mono"
          value={typeof value === "string" ? value.slice(0, 10) : ""}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
        />
      );

    case "formula": {
      const expr = (property.options as any)?.expression || "";
      const result = record && properties ? evaluateFormula(expr, record, properties) : 0;
      return <span className="notepad-db-formula-value mono">{Number.isFinite(result) ? result.toFixed(2).replace(/\.00$/, "") : "—"}</span>;
    }

    case "select": {
      const choices: SelectOption[] = (property.options as any)?.choices || [];
      const current = choices.find((c) => c.id === value);
      return (
        <div className="relative">
          <button type="button" className="notepad-db-select-trigger" onClick={() => setOpen((v) => !v)}>
            {current ? <SelectPill option={current} small={compact} /> : <span className="notepad-db-cell-empty">—</span>}
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-[19]" onClick={() => setOpen(false)} />
              <div className="notepad-db-select-menu">
                {choices.map((c) => (
                  <button key={c.id} type="button" className="notepad-db-select-menu-item" onClick={() => { onChange(c.id); setOpen(false); }}>
                    <SelectPill option={c} />
                    {value === c.id && <Check size={12} />}
                  </button>
                ))}
                {value != null && (
                  <button type="button" className="notepad-db-select-menu-item notepad-db-select-clear" onClick={() => { onChange(null); setOpen(false); }}>
                    <X size={12} /> پاک‌کردن
                  </button>
                )}
                {onUpdateOptions && (
                  <button
                    type="button"
                    className="notepad-db-select-menu-item"
                    onClick={() => {
                      const label = prompt("اسمِ گزینه‌ی جدید؟");
                      if (!label?.trim()) return;
                      const next = [...choices, makeSelectOption(label.trim())];
                      onUpdateOptions({ ...(property.options as any), choices: next });
                    }}
                  >
                    <Plus size={12} /> گزینه‌ی جدید
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      );
    }

    case "multi_select":
    case "relation": {
      const isRelation = property.type === "relation";
      const choices: SelectOption[] = isRelation ? [] : (property.options as any)?.choices || [];
      const selectedIds: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="relative">
          <button type="button" className="notepad-db-select-trigger" onClick={() => setOpen((v) => !v)}>
            {selectedIds.length ? (
              <span className="notepad-db-pill-row">
                {selectedIds.slice(0, 3).map((id) => {
                  const c = choices.find((x) => x.id === id);
                  return c ? <SelectPill key={id} option={c} small={compact} /> : <SelectPill key={id} option={{ id, label: id, color: "#7C6AF2" }} small />;
                })}
                {selectedIds.length > 3 && <span className="notepad-db-cell-empty">+{selectedIds.length - 3}</span>}
              </span>
            ) : (
              <span className="notepad-db-cell-empty">—</span>
            )}
          </button>
          {open && !isRelation && (
            <>
              <div className="fixed inset-0 z-[19]" onClick={() => setOpen(false)} />
              <div className="notepad-db-select-menu">
                {choices.map((c) => {
                  const on = selectedIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className="notepad-db-select-menu-item"
                      onClick={() => onChange(on ? selectedIds.filter((x) => x !== c.id) : [...selectedIds, c.id])}
                    >
                      <SelectPill option={c} />
                      {on && <Check size={12} />}
                    </button>
                  );
                })}
                {onUpdateOptions && (
                  <button
                    type="button"
                    className="notepad-db-select-menu-item"
                    onClick={() => {
                      const label = prompt("اسمِ گزینه‌ی جدید؟");
                      if (!label?.trim()) return;
                      const next = [...choices, makeSelectOption(label.trim())];
                      onUpdateOptions({ ...(property.options as any), choices: next });
                    }}
                  >
                    <Plus size={12} /> گزینه‌ی جدید
                  </button>
                )}
              </div>
            </>
          )}
          {open && isRelation && (
            <>
              <div className="fixed inset-0 z-[19]" onClick={() => setOpen(false)} />
              <div className="notepad-db-select-menu">
                <div className="notepad-db-cell-empty" style={{ padding: 8 }}>
                  {(property.options as any)?.targetDatabaseId ? "هنوز موردی برای ارتباط تعریف نشده" : "اول از تنظیماتِ این property، دیتابیسِ مقصد رو انتخاب کن"}
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    default:
      return <span className="notepad-db-cell-empty">—</span>;
  }
}
