"use client";

import { formatTimeDigits } from "@/lib/timeUtils";

export function TimeInput({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={5}
      placeholder={placeholder || "--:--"}
      className={className || "wsearch-add-time"}
      value={value}
      onChange={(e) => onChange(formatTimeDigits(e.target.value))}
    />
  );
}
