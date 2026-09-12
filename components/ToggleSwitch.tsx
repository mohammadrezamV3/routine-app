"use client";

// سوییچ روشن/خاموش سبک iOS (لیکوئید گلس) — برای جاهایی که یک تنظیم
// دودویی (نمایش/عدم‌نمایش) داره، به‌جای چک‌باکس مربعی معمولی اپ.
export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`ios-toggle${checked ? " on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="ios-toggle-knob" />
    </button>
  );
}
