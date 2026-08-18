"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar as CalendarIcon, Columns3, Filter, LayoutGrid, List as ListIcon,
  Plus, Table as TableIcon,
} from "lucide-react";
import {
  DatabaseProperty, DatabaseRecord, FilterRule, NotepadDatabaseFull, RecordValue,
  SortRule, ViewType, applyFiltersAndSort, createDatabaseForBlock, createProperty,
  createRecord, deleteProperty, deleteRecord, fetchDatabase, midPositionDb,
  updateDatabaseMeta, updateProperty, updateRecord,
} from "@/lib/notepadDb";
import { NotepadDbPropertyMenu } from "./NotepadDbPropertyMenu";
import { NotepadDbFilterSortMenu } from "./NotepadDbFilterSortMenu";
import { NotepadDbTableView } from "./NotepadDbTableView";
import { NotepadDbBoardView } from "./NotepadDbBoardView";
import { NotepadDbCalendarView } from "./NotepadDbCalendarView";
import { NotepadDbGalleryView } from "./NotepadDbGalleryView";
import { NotepadDbListView } from "./NotepadDbListView";

const VIEW_TABS: { key: ViewType; label: string; icon: JSX.Element }[] = [
  { key: "table", label: "جدول", icon: <TableIcon size={13} /> },
  { key: "board", label: "بورد", icon: <Columns3 size={13} /> },
  { key: "calendar", label: "تقویم", icon: <CalendarIcon size={13} /> },
  { key: "gallery", label: "گالری", icon: <LayoutGrid size={13} /> },
  { key: "list", label: "لیست", icon: <ListIcon size={13} /> },
];

// بلاکِ Database — پوسته‌ی مشترکِ همه‌ی ویوها: هدر (اسم + تب‌های ویو +
// فیلتر/سورت + افزودنِ property)، و بدنه که بسته‌به activeView یکی از پنج
// کامپوننتِ ویو رو رندر می‌کنه. خودش state رو نگه می‌داره و مستقیم به API
// دیتابیس وصله (جدا از autosaveِ بلاک‌های متنی).
export function NotepadDatabaseBlock({
  blockId,
  databaseId,
  onDatabaseCreated,
}: {
  blockId: string;
  databaseId: string | null;
  onDatabaseCreated: (databaseId: string) => void;
}) {
  const [db, setDb] = useState<NotepadDatabaseFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [propertyMenuFor, setPropertyMenuFor] = useState<"new" | string | null>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const creatingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!databaseId) {
        // creatingRef (نه cancelled) این شاخه رو سریالایز می‌کنه — چون تحتِ
        // StrictMode/دو-باراجراییِ افکت در dev، افکتِ اول mount/cleanup/remount
        // می‌شه و cancelledِ خودش true می‌مونه، ولی promise همون افکتِ اول
        // هنوز در پروازه؛ اگه نتیجه‌ش رو به‌خاطرِ cancelled دور بریزیم، دیتابیسِ
        // واقعاً ساخته‌شده روی سرور هیچ‌وقت به state نمی‌رسه و لودینگ گیر می‌کنه
        if (creatingRef.current) return;
        creatingRef.current = true;
        const created = await createDatabaseForBlock(blockId);
        creatingRef.current = false;
        if (created) {
          setDb(created);
          onDatabaseCreated(created.id);
        }
        setLoading(false);
        return;
      }
      const full = await fetchDatabase(databaseId);
      if (!cancelled) { setDb(full); setLoading(false); }
    }
    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId, databaseId]);

  if (loading || !db) {
    return <div className="notepad-db-loading">در حال آماده‌سازیِ دیتابیس…</div>;
  }

  const database = db;
  const properties = [...database.properties].sort((a, b) => a.position - b.position);
  const visibleRecords = applyFiltersAndSort(database.records, database.filters as FilterRule[], database.sorts as SortRule[]);

  async function patchMeta(patch: Partial<NotepadDatabaseFull>) {
    setDb((prev) => (prev ? { ...prev, ...patch } : prev));
    await updateDatabaseMeta(database.id, patch as any);
  }

  async function handleCreateProperty(input: { name: string; type: DatabaseProperty["type"] }) {
    const lastPos = properties.length ? properties[properties.length - 1].position : 0;
    const prop = await createProperty(database.id, { ...input, position: lastPos + 1000 });
    if (prop) setDb((prev) => (prev ? { ...prev, properties: [...prev.properties, prop] } : prev));
  }
  async function handleUpdateProperty(propertyId: string, patch: Partial<Pick<DatabaseProperty, "name" | "options">>) {
    setDb((prev) => (prev ? { ...prev, properties: prev.properties.map((p) => (p.id === propertyId ? { ...p, ...patch } as DatabaseProperty : p)) } : prev));
    await updateProperty(database.id, propertyId, patch);
  }
  async function handleDeleteProperty(propertyId: string) {
    setDb((prev) => (prev ? { ...prev, properties: prev.properties.filter((p) => p.id !== propertyId) } : prev));
    await deleteProperty(database.id, propertyId);
  }

  async function handleCreateRecord() {
    const lastPos = database.records.length ? Math.max(...database.records.map((r) => r.position)) : 0;
    const rec = await createRecord(database.id, lastPos + 1000);
    if (rec) setDb((prev) => (prev ? { ...prev, records: [...prev.records, rec] } : prev));
  }
  async function handleUpdateRecordValue(recordId: string, propertyId: string, value: RecordValue) {
    setDb((prev) => {
      if (!prev) return prev;
      return { ...prev, records: prev.records.map((r) => (r.id === recordId ? { ...r, values: { ...r.values, [propertyId]: value } } : r)) };
    });
    await updateRecord(database.id, recordId, { values: { [propertyId]: value } });
  }
  async function handleDeleteRecord(recordId: string) {
    setDb((prev) => (prev ? { ...prev, records: prev.records.filter((r) => r.id !== recordId) } : prev));
    await deleteRecord(database.id, recordId);
  }
  async function handleMoveRecord(recordId: string, newPosition: number) {
    setDb((prev) => (prev ? { ...prev, records: prev.records.map((r) => (r.id === recordId ? { ...r, position: newPosition } : r)) } : prev));
    await updateRecord(database.id, recordId, { position: newPosition });
  }

  const editingProperty = propertyMenuFor && propertyMenuFor !== "new" ? properties.find((p) => p.id === propertyMenuFor) : null;

  const viewProps = {
    properties,
    hiddenPropertyIds: (db.hiddenPropertyIds as string[]) || [],
    records: visibleRecords,
    onChangeValue: handleUpdateRecordValue,
    onDeleteRecord: handleDeleteRecord,
    onCreateRecord: handleCreateRecord,
    onMoveRecord: handleMoveRecord,
    onEditProperty: (id: string) => setPropertyMenuFor(id),
    onUpdatePropertyOptions: (propertyId: string, options: DatabaseProperty["options"]) => handleUpdateProperty(propertyId, { options }),
  };

  return (
    <div className="notepad-db-block">
      <div className="notepad-db-header">
        <input
          type="text"
          className="notepad-db-name-input"
          value={db.name}
          onChange={(e) => patchMeta({ name: e.target.value })}
          placeholder="اسمِ دیتابیس"
        />
        <div className="notepad-db-header-actions">
          <button type="button" className="notepad-db-header-btn" onClick={() => setFilterMenuOpen(true)}>
            <Filter size={13} /> فیلتر/سورت
          </button>
          <div className="relative">
            {filterMenuOpen && (
              <NotepadDbFilterSortMenu
                properties={properties}
                filters={(db.filters as FilterRule[]) || []}
                sorts={(db.sorts as SortRule[]) || []}
                hiddenPropertyIds={(db.hiddenPropertyIds as string[]) || []}
                onChange={(patch) => patchMeta(patch)}
                onClose={() => setFilterMenuOpen(false)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="notepad-db-view-tabs">
        {VIEW_TABS.map((v) => (
          <button
            key={v.key}
            type="button"
            className={`notepad-db-view-tab${db.activeView === v.key ? " active" : ""}`}
            onClick={() => patchMeta({ activeView: v.key })}
          >
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      <div className="notepad-db-body">
        {db.activeView === "table" && (
          <NotepadDbTableView
            {...viewProps}
            onAddProperty={() => setPropertyMenuFor("new")}
          />
        )}
        {db.activeView === "board" && (
          <NotepadDbBoardView
            {...viewProps}
            groupPropertyId={db.boardGroupPropertyId}
            onSetGroupProperty={(id) => patchMeta({ boardGroupPropertyId: id })}
          />
        )}
        {db.activeView === "calendar" && (
          <NotepadDbCalendarView
            {...viewProps}
            datePropertyId={db.calendarDatePropertyId}
            onSetDateProperty={(id) => patchMeta({ calendarDatePropertyId: id })}
          />
        )}
        {db.activeView === "gallery" && <NotepadDbGalleryView {...viewProps} />}
        {db.activeView === "list" && <NotepadDbListView {...viewProps} />}
      </div>

      {(propertyMenuFor === "new" || editingProperty) && (
        <NotepadDbPropertyMenu
          property={editingProperty}
          onCreate={handleCreateProperty}
          onUpdate={(patch) => editingProperty && handleUpdateProperty(editingProperty.id, patch)}
          onDelete={editingProperty ? () => handleDeleteProperty(editingProperty.id) : undefined}
          onClose={() => setPropertyMenuFor(null)}
        />
      )}
    </div>
  );
}

export function nextRecordPosition(records: DatabaseRecord[]): number {
  return midPositionDb(records.length ? Math.max(...records.map((r) => r.position)) : null, null);
}
