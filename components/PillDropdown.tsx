"use client";

import { useEffect, useRef, useState } from "react";

// جایگزینِ گروه‌های پیل با گزینه‌های زیاد (که مجبور بودن به چند ردیف بشکنن) —
// یک دکمه‌ی محرک که مقدارِ انتخاب‌شده رو نشون می‌ده، با کلیک منوی کوچیکش باز
// می‌شه؛ با انتخاب یک گزینه یا کلیک بیرون از منو، خودش می‌بنده.
export function PillDropdown<T extends string>({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: T | null;
  options: { value: T; label: string }[];
  placeholder: string;
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="pill-dropdown" ref={rootRef}>
      <button
        type="button"
        className={`pill-dropdown-trigger${current ? "" : " placeholder"}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{current ? current.label : placeholder}</span>
        <svg className={`pill-dropdown-chevron${open ? " open" : ""}`} viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className={`pill-dropdown-menu${open ? " open" : ""}`}>
        {options.map((o) => (
          <div
            key={o.value}
            className={`pill-dropdown-option${value === o.value ? " on" : ""}`}
            onClick={() => { onChange(o.value); setOpen(false); }}
          >
            {o.label}
          </div>
        ))}
      </div>
    </div>
  );
}
