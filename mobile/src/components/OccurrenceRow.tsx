import { useRef } from "react";
import { tapHaptic } from "@/lib/haptics";

export interface OccurrenceRowItem {
  id: string;
  name: string;
  time: string;
  custom?: boolean;
}

const LONG_PRESS_MS = 420;

// ردیفِ یک برنامه — تپ = تیک‌زدنِ انجام‌شده (با هپتیک)، فشارِ طولانی = باز
// شدنِ منوی عملیات (ویرایش/انتقال/حذف) — چون سواپ روی یک لیستِ عمودی که
// خودش هم اسکرول می‌خوره راحت با اسکرول قاطی می‌شه، long-press روی موبایل
// الگویِ رایج‌تری برای «عملیاتِ بیشتر» است.
export default function OccurrenceRow({
  item,
  checked,
  disabled,
  onToggle,
  onLongPress,
}: {
  item: OccurrenceRowItem;
  checked: boolean;
  disabled?: boolean;
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
    if (disabled) return;
    void tapHaptic();
    onToggle();
  }

  return (
    <div
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onClick={click}
      className="flex items-center gap-3 rounded-2xl px-3 no-select"
      style={{
        minHeight: 56,
        background: "var(--surface-1)",
        border: "1px solid var(--surface-line)",
        opacity: disabled ? 0.55 : 1,
      }}
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
          {item.name}
        </div>
        <div className="mono text-[12px]" style={{ color: "var(--muted)" }}>{item.time}</div>
      </div>
    </div>
  );
}
