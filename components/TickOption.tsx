"use client";

// ردیفِ «گزینه‌ی تیک‌خوردنی» (به‌جای چک‌باکسِ خامِ مرورگر) — همون TickButton ِ
// داشبورد به‌علاوه‌ی متن؛ کلِ ردیف کلیک‌پذیره. عمدا بی‌بک‌گراند.

import type { ReactNode } from "react";
import { TickButton } from "./TickButton";

export function TickOption({ checked, onChange, children, disabled, className }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      className={`tick-option${className ? ` ${className}` : ""}`}
      onClick={() => onChange(!checked)}
    >
      <TickButton as="span" checked={checked} size={22} disabled={disabled} />
      <span className="tick-option-text">{children}</span>
    </button>
  );
}
