import { useState } from "react";
import BottomSheet from "./BottomSheet";
import SegmentedTabs from "./SegmentedTabs";
import JalaliDatePickerSheet from "./JalaliDatePickerSheet";
import { updateTask, TaskInput } from "@/db/repo";
import { TaskRow } from "@/db/db";
import { tapHaptic } from "@/lib/haptics";
import { formatJalali, toJalali } from "@/lib/jalali";

const PRIORITY_LABELS: Record<NonNullable<TaskInput["priority"]>, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
};

function isoToJalaliText(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return formatJalali(toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()));
}

// ویرایشِ یک تسکِ آزاد (Task model) — عنوان/یادداشت/مهلت/اولویت، از منویِ
// عملیاتِ TaskRow باز می‌شه. دقیقا همون فیلدهایی که QuickAddTaskSheet موقعِ
// ساخت می‌گیره، به‌علاوه‌ی یادداشت که فقط اینجا قابلِ ویرایشه.
export default function EditTaskSheet({
  open,
  task,
  onClose,
}: {
  open: boolean;
  task: TaskRow;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [dueDate, setDueDate] = useState<string | null>(task.dueDate);
  const [priority, setPriority] = useState<NonNullable<TaskInput["priority"]>>(task.priority ?? "medium");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    if (!title.trim()) { setError("اسمِ کار رو وارد کن"); return; }
    setError(null);
    setSaving(true);
    await updateTask(task.id, {
      title: title.trim(),
      notes: notes.trim() ? notes.trim() : null,
      dueDate,
      priority,
    });
    void tapHaptic();
    setSaving(false);
    onClose();
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="ویرایشِ کار">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>اسمِ کار</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl px-3 font-vazir"
              style={{ minHeight: 44, background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>یادداشت (اختیاری)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-xl px-3 py-2 font-vazir"
              style={{ background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--surface-line)", resize: "none" }}
            />
          </label>

          <label className="flex items-center gap-2 font-vazir text-[13px]" style={{ color: "var(--text)" }}>
            <input
              type="checkbox"
              checked={!!dueDate}
              onChange={(e) => setDueDate(e.target.checked ? dueDate ?? task.dueDate ?? new Date().toISOString().slice(0, 10) : null)}
              style={{ width: 20, height: 20 }}
            />
            دارای مهلت
          </label>

          {dueDate && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex items-center justify-between rounded-xl px-3 font-vazir text-[13px]"
              style={{ minHeight: 44, background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
            >
              مهلت
              <span className="mono">{isoToJalaliText(dueDate)}</span>
            </button>
          )}

          <div className="flex flex-col gap-1">
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>اولویت</span>
            <SegmentedTabs
              active={priority}
              onChange={setPriority}
              options={(Object.keys(PRIORITY_LABELS) as (keyof typeof PRIORITY_LABELS)[]).map((k) => ({ value: k, label: PRIORITY_LABELS[k] }))}
            />
          </div>

          {error && <div className="font-vazir text-[12.5px]" style={{ color: "var(--pnl-loss)" }}>{error}</div>}

          <button
            onClick={submit}
            disabled={saving}
            className="rounded-xl font-vazir text-[15px] font-bold"
            style={{ minHeight: 48, background: "var(--accent)", color: "var(--bg)", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "…" : "ذخیره"}
          </button>
        </div>
      </BottomSheet>

      <JalaliDatePickerSheet
        open={pickerOpen}
        title="مهلتِ کار"
        initialIso={dueDate}
        onClose={() => setPickerOpen(false)}
        onPick={(iso) => { setDueDate(iso); setPickerOpen(false); }}
      />
    </>
  );
}
