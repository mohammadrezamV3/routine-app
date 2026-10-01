"use client";

import { TickButton } from "./TickButton";

// گزینه‌ی روشن/خاموش — همون تیک واحد اپ (TickButton)، نه سوییچ.
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
  return <TickButton checked={checked} onToggle={() => onChange(!checked)} label={label} disabled={disabled} size={24} />;
}
