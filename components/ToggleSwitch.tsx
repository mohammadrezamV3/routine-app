"use client";

// سوییچِ روشن/خاموشِ سبکِ iOS (لیکوئید گلس) — برای جاهایی که یک تنظیمِ
// دودویی (نمایش/عدم‌نمایش) داره، به‌جای چک‌باکسِ مربعیِ معمولیِ اپ.
export function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`ios-toggle${checked ? " on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="ios-toggle-knob" />
    </button>
  );
}
