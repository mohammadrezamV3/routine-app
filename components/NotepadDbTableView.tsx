"use client";

import { Plus, Trash2 } from "lucide-react";
import { DatabaseProperty, DatabaseRecord, RecordValue } from "@/lib/notepadDb";
import { NotepadDbCell } from "./NotepadDbCell";

export function NotepadDbTableView({
  properties,
  hiddenPropertyIds,
  records,
  onChangeValue,
  onDeleteRecord,
  onCreateRecord,
  onEditProperty,
  onUpdatePropertyOptions,
  onAddProperty,
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
  onAddProperty: () => void;
}) {
  const visibleProps = properties.filter((p) => !hiddenPropertyIds.includes(p.id));

  return (
    <div className="notepad-db-table-scroll thin-scroll">
      <table className="notepad-db-table">
        <thead>
          <tr>
            {visibleProps.map((p) => (
              <th key={p.id}>
                <button type="button" className="notepad-db-th-btn" onClick={() => onEditProperty(p.id)}>{p.name}</button>
              </th>
            ))}
            <th className="notepad-db-th-add">
              <button type="button" className="notepad-db-th-btn" onClick={onAddProperty}><Plus size={13} /></button>
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => (
            <tr key={rec.id} className="notepad-db-row">
              {visibleProps.map((p) => (
                <td key={p.id}>
                  <NotepadDbCell
                    property={p}
                    value={rec.values[p.id] ?? null}
                    record={rec}
                    properties={properties}
                    onChange={(v) => onChangeValue(rec.id, p.id, v)}
                    onUpdateOptions={(opts) => onUpdatePropertyOptions(p.id, opts)}
                  />
                </td>
              ))}
              <td className="notepad-db-row-actions">
                <button type="button" onClick={() => onDeleteRecord(rec.id)} aria-label="حذف رکورد"><Trash2 size={12} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="notepad-db-add-row-btn" onClick={onCreateRecord}>
        <Plus size={13} /> ردیف جدید
      </button>
    </div>
  );
}
