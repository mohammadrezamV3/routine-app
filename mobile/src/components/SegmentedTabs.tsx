import clsx from "clsx";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

// تب‌های قطعه‌ای عمومی — برای اهمیت برنامه (کم/متوسط/زیاد/خیلی‌زیاد) و
// برای سه‌تبِ صفحه‌ی روتین (امروز/هفتگی/تقویم).
export default function SegmentedTabs<T extends string>({
  active,
  onChange,
  options,
}: {
  active: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
}) {
  return (
    <div
      className="no-select flex rounded-full p-1"
      style={{ background: "var(--surface-2)", border: "1px solid var(--surface-line)" }}
      role="tablist"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={active === o.value}
          onClick={() => onChange(o.value)}
          className={clsx("flex-1 rounded-full font-vazir text-[13px] transition-colors")}
          style={{
            minHeight: 40,
            color: active === o.value ? "var(--bg)" : "var(--muted)",
            background: active === o.value ? "var(--accent)" : "transparent",
            fontWeight: active === o.value ? 700 : 500,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
