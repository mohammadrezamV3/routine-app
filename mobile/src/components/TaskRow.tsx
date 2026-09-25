import { useRef } from "react";
import { tapHaptic } from "@/lib/haptics";
import { TaskRow as TaskRowData } from "@/db/db";

const LONG_PRESS_MS = 420;

// ردیفِ یک تسکِ آزاد (Task model) — همون الگویِ long-press مثلِ
// OccurrenceRow: تپ = تیک‌زدنِ انجام‌شده، فشارِ طولانی = بازکردنِ منویِ
// عملیات (ویرایش/حذف)، تا تسک‌های آزاد هم مثلِ برنامه‌های روتین قابلِ
// ویرایش/حذف باشن.
export default function TaskRow({
  task,
  onToggle,
  onLongPress,
}: {
  task: TaskRowData;
  onToggle: () => void;
  onLongPress: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  function start() {
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }
  function cancel() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }
  function click() {
    if (firedRef.current) return; // long-press همین کلیک رو مصرف کرده
    void tapHaptic();
    onToggle();
  }

  const checked = !!task.completedAt;

  return (
    <div
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onClick={click}
      className="flex items-center gap-3 rounded-2xl px-3 no-select"
      style={{ minHeight: 56, background: "var(--surface-1)", border: "1px dashed var(--surface-line)" }}
    >
      <span
        className="flex items-center justify-center rounded-full"
        style={{
          width: 26,
          height: 26,
          border: `2px solid ${checked ? "var(--accent)" : "var(--surface-line)"}`,
          background: checked ? "var(--accent)" : "transparent",
          flexShrink: 0,
        }}
      >
        {checked && (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div
          className="truncate font-vazir text-[14px]"
          style={{ color: "var(--text)", textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.6 : 1 }}
        >
          {task.title}
        </div>
        <div className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>کارِ آزاد</div>
      </div>
    </div>
  );
}
