"use client";

import { useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DatabaseProperty, DatabaseRecord, RecordValue } from "@/lib/notepadDb";
import { NotepadDbCell } from "./NotepadDbCell";

// بورد — گروه‌بندی‌شده بر اساسِ یه propertyِ انتخابی. جابه‌جاییِ کارت‌ها هم
// با درگ‌ودراپِ بومیِ HTML5 (بدونِ کتابخانه‌ی جدید) هم با کلیک روی سلولِ
// گروه‌بندیِ خودِ کارت (همون NotepadDbCell — منطقِ انتخاب رایگان میاد)
export function NotepadDbBoardView({
  properties,
  records,
  onChangeValue,
  onDeleteRecord,
  onCreateRecord,
  onUpdatePropertyOptions,
  groupPropertyId,
  onSetGroupProperty,
}: {
  properties: DatabaseProperty[];
  hiddenPropertyIds: string[];
  records: DatabaseRecord[];
  onChangeValue: (recordId: string, propertyId: string, value: RecordValue) => void;
  onDeleteRecord: (recordId: string) => void;
  onCreateRecord: () => void;
  onMoveRecord: (recordId: string, position: number) => void;
  onEditProperty: (propertyId: string) => void;
  onUpdatePropertyOptions: (propertyId: string, options: DatabaseProperty["options"]) => void;
  groupPropertyId: string | null;
  onSetGroupProperty: (propertyId: string) => void;
}) {
  const selectProps = properties.filter((p) => p.type === "select");
  const groupProp = properties.find((p) => p.id === groupPropertyId) || selectProps[0] || null;

  useEffect(() => {
    if (groupProp && groupPropertyId !== groupProp.id) onSetGroupProperty(groupProp.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupProp?.id, groupPropertyId]);

  if (!groupProp) {
    return (
      <div className="notepad-db-board-empty">
        بورد به یه property از نوع «انتخابی» نیاز داره — اول از تبِ جدول یکی بساز.
      </div>
    );
  }

  const titleProp = properties[0];
  const choices = (groupProp.options as any)?.choices || [];
  const columns = [...choices, { id: "__none__", label: "بدون گروه", color: "#8A8A93" }];

  function recordsFor(colId: string) {
    return records.filter((r) => (colId === "__none__" ? !r.values[groupProp!.id] : r.values[groupProp!.id] === colId));
  }

  function handleDrop(e: React.DragEvent, colId: string) {
    e.preventDefault();
    const recordId = e.dataTransfer.getData("text/plain");
    if (recordId) onChangeValue(recordId, groupProp!.id, colId === "__none__" ? null : colId);
  }

  return (
    <div className="notepad-db-board">
      {columns.map((col) => (
        <div key={col.id} className="notepad-db-board-col" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, col.id)}>
          <div className="notepad-db-board-col-head">
            <span className="notepad-db-color-dot" style={{ background: col.color }} />
            {col.label}
            <span className="notepad-db-board-col-count">{recordsFor(col.id).length}</span>
          </div>
          <div className="notepad-db-board-col-cards">
            {recordsFor(col.id).map((rec) => (
              <div
                key={rec.id}
                className="notepad-db-board-card"
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", rec.id)}
              >
                <div className="notepad-db-board-card-head">
                  <span className="notepad-db-board-card-title">{titleProp ? String(rec.values[titleProp.id] ?? "بدون‌عنوان") : "بدون‌عنوان"}</span>
                  <button type="button" onClick={() => onDeleteRecord(rec.id)} aria-label="حذف"><Trash2 size={11} /></button>
                </div>
                <NotepadDbCell
                  property={groupProp}
                  value={rec.values[groupProp.id] ?? null}
                  onChange={(v) => onChangeValue(rec.id, groupProp!.id, v)}
                  onUpdateOptions={(opts) => onUpdatePropertyOptions(groupProp!.id, opts)}
                  compact
                />
              </div>
            ))}
            <button type="button" className="notepad-db-board-add-btn" onClick={onCreateRecord}>
              <Plus size={12} /> کارتِ جدید
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
