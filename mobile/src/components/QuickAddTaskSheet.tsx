import { useState } from "react";
import BottomSheet from "./BottomSheet";
import SegmentedTabs from "./SegmentedTabs";
import { addTask, TaskInput } from "@/db/repo";
import { tapHaptic } from "@/lib/haptics";
import { isoLocal } from "@/lib/jalali";

const PRIORITY_LABELS: Record<NonNullable<TaskInput["priority"]>, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
};

// افزودنِ سریعِ یک تسکِ آزاد (Task model) — از FABِ داشبورد باز می‌شه.
// جدا از برنامه‌های تکرارشونده‌ی روتین (CustomOccurrence)، برای کارهای
// یک‌باره‌ی سریع («زنگ زدن به…»، «خریدِ فلان»).
export default function QuickAddTaskSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [dueToday, setDueToday] = useState(true);
  const [priority, setPriority] = useState<NonNullable<TaskInput["priority"]>>("medium");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    if (!title.trim()) { setError("اسمِ کار رو وارد کن"); return; }
    setError(null);
    setSaving(true);
    await addTask({ title: title.trim(), priority, dueDate: dueToday ? isoLocal(new Date()) : null });
    void tapHaptic();
    setSaving(false);
    setTitle("");
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="افزودنِ کارِ سریع">
      <div className="flex flex-col gap-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثلا: زنگ زدن به…"
          autoFocus
          className="rounded-xl px-3 font-vazir"
          style={{ minHeight: 46, background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
        />

        <label className="flex items-center gap-2 font-vazir text-[13px]" style={{ color: "var(--text)" }}>
          <input type="checkbox" checked={dueToday} onChange={(e) => setDueToday(e.target.checked)} style={{ width: 20, height: 20 }} />
          برای امروز
        </label>

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
          {saving ? "…" : "افزودن"}
        </button>
      </div>
    </BottomSheet>
  );
}
