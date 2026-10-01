import type { KeyboardEvent } from "react";

// ردیف قابل‌کلیک (مثلا هر معامله در لیست‌ها): کل ردیف هم با کلیک/لمس و هم با
// Enter/Space باز می‌شود. ردیف `role="button"` می‌گیرد نه تگ <button>، چون
// داخلش بلوک و بج هست و ریست سراسری `button{}` نباید رویش بنشیند.
export function rowActivateProps(onActivate: () => void, label?: string) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": label,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
  };
}
