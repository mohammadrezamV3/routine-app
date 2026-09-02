"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { DatabaseProperty, DatabaseRecord, RecordValue } from "@/lib/notepadDb";

const WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const MONTH_NAMES = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر",
];

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

// تقویم — گرید ماهانه‌ی میلادی ساده (نه جلالی)، رکوردها بر اساس یه
// property از نوع تاریخ انتخابی زیر روز متناظرشون قرار می‌گیرن
export function NotepadDbCalendarView({
  properties,
  records,
  onChangeValue,
  onCreateRecord,
  datePropertyId,
  onSetDateProperty,
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
  datePropertyId: string | null;
  onSetDateProperty: (propertyId: string) => void;
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const dateProps = properties.filter((p) => p.type === "date");
  const dateProp = properties.find((p) => p.id === datePropertyId) || dateProps[0] || null;
  const titleProp = properties[0];

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const firstWeekday = (first.getDay() + 1) % 7; // شنبه = 0
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    return out;
  }, [cursor]);

  useEffect(() => {
    if (dateProp && datePropertyId !== dateProp.id) onSetDateProperty(dateProp.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateProp?.id, datePropertyId]);

  if (!dateProp) {
    return (
      <div className="notepad-db-board-empty">
        تقویم به یه property از نوع «تاریخ» نیاز داره — اول از تب جدول یکی بساز.
      </div>
    );
  }

  function recordsForDay(day: Date) {
    return records.filter((r) => {
      const v = r.values[dateProp!.id];
      if (typeof v !== "string" || !v) return false;
      const d = new Date(v);
      return !isNaN(d.getTime()) && sameDay(d, day);
    });
  }

  async function createOnDay(day: Date) {
    onCreateRecord();
    // مقدار تاریخ بعد از ساخته‌شدن رکورد دستی توسط خود کاربر ست می‌شه؛
    // اینجا فقط رکورد خالی می‌سازیم چون id رکورد تازه در دسترس نیست
    void day;
  }

  return (
    <div className="notepad-db-calendar">
      <div className="notepad-db-calendar-head">
        <button type="button" className="notepad-icon-btn" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="ماه قبل">
          <ChevronRight size={14} />
        </button>
        <span className="notepad-db-calendar-title">{MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}</span>
        <button type="button" className="notepad-icon-btn" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="ماه بعد">
          <ChevronLeft size={14} />
        </button>
      </div>

      <div className="notepad-db-calendar-weekdays">
        {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
      </div>

      <div className="notepad-db-calendar-grid">
        {cells.map((day, i) => (
          <div key={i} className={`notepad-db-calendar-cell${day && sameDay(day, new Date()) ? " today" : ""}${!day ? " empty" : ""}`}>
            {day && (
              <>
                <div className="notepad-db-calendar-daynum">{day.getDate()}</div>
                <div className="notepad-db-calendar-items">
                  {recordsForDay(day).map((rec) => (
                    <button
                      key={rec.id}
                      type="button"
                      className="notepad-db-calendar-item"
                      onClick={() => {
                        const next = prompt("تاریخ جدید (YYYY-MM-DD)، خالی بذار برای حذف تاریخ:", String(rec.values[dateProp.id] ?? "").slice(0, 10));
                        if (next === null) return;
                        onChangeValue(rec.id, dateProp.id, next ? new Date(next).toISOString() : null);
                      }}
                    >
                      {titleProp ? String(rec.values[titleProp.id] ?? "بدون‌عنوان") : "بدون‌عنوان"}
                    </button>
                  ))}
                  <button type="button" className="notepad-db-calendar-add" onClick={() => createOnDay(day)} aria-label="افزودن رکورد">
                    <Plus size={11} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
