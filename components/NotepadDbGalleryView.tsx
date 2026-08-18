"use client";

import { Plus, Trash2 } from "lucide-react";
import { DatabaseProperty, DatabaseRecord, RecordValue } from "@/lib/notepadDb";
import { NotepadDbCell } from "./NotepadDbCell";

// گالری — گریدِ کارت‌های واکنش‌گرا، هر کارت عنوان (اولین property) +
// چندتا از propertyهای بعدی (حداکثر ۴ تا) رو نشون می‌ده
export function NotepadDbGalleryView({
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
  const restProps = visibleProps.slice(1, 5);

  return (
    <div className="notepad-db-gallery">
      {records.map((rec) => (
        <div key={rec.id} className="notepad-db-gallery-card">
          <div className="notepad-db-gallery-card-head">
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
            <button type="button" onClick={() => onDeleteRecord(rec.id)} aria-label="حذفِ رکورد"><Trash2 size={12} /></button>
          </div>
          {restProps.length > 0 && (
            <div className="notepad-db-gallery-card-fields">
              {restProps.map((p) => (
                <div key={p.id} className="notepad-db-gallery-field">
                  <span className="notepad-db-gallery-field-label">{p.name}</span>
                  <NotepadDbCell
                    property={p}
                    value={rec.values[p.id] ?? null}
                    record={rec}
                    properties={properties}
                    onChange={(v) => onChangeValue(rec.id, p.id, v)}
                    onUpdateOptions={(opts) => onUpdatePropertyOptions(p.id, opts)}
                    compact
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <button type="button" className="notepad-db-gallery-add-card" onClick={onCreateRecord}>
        <Plus size={16} /> کارتِ جدید
      </button>
    </div>
  );
}
