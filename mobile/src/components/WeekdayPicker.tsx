import { WEEK_ORDER } from "@/lib/schedule";

// انتخابِ چندروزه‌ی هفته (پیل‌های ش/ی/د/س/چ/پ/ج) — پورت از day-picker وب،
// برای AddOccurrenceSheet.
export default function WeekdayPicker({
  value,
  onChange,
  error,
}: {
  value: number[];
  onChange: (days: number[]) => void;
  error?: boolean;
}) {
  function toggle(jsDay: number) {
    const has = value.includes(jsDay);
    if (has && value.length === 1) return; // همیشه حداقل یک روز باید انتخاب بمونه
    onChange(has ? value.filter((d) => d !== jsDay) : [...value, jsDay]);
  }

  return (
    <div className="flex justify-between gap-1" role="group" aria-label="روزهای هفته">
      {WEEK_ORDER.map((o) => (
        <button
          key={o.jsDay}
          type="button"
          onClick={() => toggle(o.jsDay)}
          className="flex flex-1 items-center justify-center rounded-xl font-vazir text-[13px]"
          style={{
            minHeight: 40,
            background: value.includes(o.jsDay) ? "var(--accent)" : "var(--surface-2)",
            color: value.includes(o.jsDay) ? "var(--bg)" : "var(--text)",
            border: error ? "1px solid var(--pnl-loss)" : "1px solid var(--surface-line)",
            fontWeight: value.includes(o.jsDay) ? 700 : 500,
          }}
        >
          {o.short}
        </button>
      ))}
    </div>
  );
}
