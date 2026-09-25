// فیلدِ ورودیِ ساعت — از <input type="time"> بومی استفاده می‌کنه (روی
// موبایل تجربه‌ی لمسی بومی‌ش بهتر از ماسکِ دستیِ وب جواب می‌ده)؛ مقدار
// همیشه به‌شکلِ "HH:mm" لاتین نگه داشته می‌شه و موقعِ ذخیره با
// normalizeTimeToFa به فرمتِ فارسیِ سازگار با schedule.ts تبدیل می‌شه.
export default function TimeField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string; // "HH:mm"
  onChange: (v: string) => void;
  error?: boolean;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl px-3 font-vazir mono"
        style={{
          minHeight: 44,
          background: "var(--input-bg)",
          color: "var(--text)",
          border: `1px solid ${error ? "var(--pnl-loss)" : "var(--surface-line)"}`,
        }}
      />
    </label>
  );
}
