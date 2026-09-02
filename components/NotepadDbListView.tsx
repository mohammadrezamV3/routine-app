"use client";

import { Plus, Trash2 } from "lucide-react";
import { DatabaseProperty, DatabaseRecord, RecordValue } from "@/lib/notepadDb";
import { NotepadDbCell } from "./NotepadDbCell";

// لیست — یه ردیف ساده به‌ازای هر رکورد: عنوان (اولین property) + یه
// property دوم کوچیک در سمت دیگه (اگه وجود داشته باشه)
export function NotepadDbListView({
  properties,
  hiddenPropertyIds,
  records,
  onChangeValue,
  onDeleteRecord,
  onCreateRecord,
  onUpdatePropertyOptions,
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
}) {
  const visibleProps = properties.filter((p) => !hiddenPropertyIds.includes(p.id));
  const titleProp = visibleProps[0];
  const secondaryProp = visibleProps[1];

  return (
    <div className="notepad-db-list">
      {records.map((rec) => (
        <div key={rec.id} className="notepad-db-list-row">
          <div className="notepad-db-list-row-main">
            {titleProp ? (
              <NotepadDbCell
                property={titleProp}
                value={rec.values[titleProp.id] ?? null}
                record={rec}
                properties={properties}
                onChange={(v) => onChangeValue(rec.id, titleProp.id, v)}
                onUpdateOptions={(opts) => onUpdatePropertyOptions(titleProp.id, opts)}
              />
            ) : (
              <span className="notepad-db-cell-empty">بدون‌عنوان</span>
            )}
          </div>
          {secondaryProp && (
            <div className="notepad-db-list-row-secondary">
              <NotepadDbCell
                property={secondaryProp}
                value={rec.values[secondaryProp.id] ?? null}
                record={rec}
                properties={properties}
                onChange={(v) => onChangeValue(rec.id, secondaryProp.id, v)}
                onUpdateOptions={(opts) => onUpdatePropertyOptions(secondaryProp.id, opts)}
                compact
              />
            </div>
          )}
          <button type="button" className="notepad-db-list-row-del" onClick={() => onDeleteRecord(rec.id)} aria-label="حذف رکورد"><Trash2 size={12} /></button>
        </div>
      ))}
      <button type="button" className="notepad-db-add-row-btn" onClick={onCreateRecord}>
        <Plus size={13} /> ردیف جدید
      </button>
    </div>
  );
}
