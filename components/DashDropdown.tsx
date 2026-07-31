"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// دراپ‌داونِ عمومی (برای «همه برنامه‌ها») — بک‌دراپِ نامرئی برای بستن با کلیک
// بیرون، بدون وابستگی به کتابخانه‌ی جدا (همون الگویی که بقیه‌ی اپ هم استفاده می‌کنه).
export function DashDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex shrink-0 items-center gap-1.5 rounded-dash border border-dash-border bg-dash-card px-3 py-2 text-[12px] font-semibold text-dash-text backdrop-blur-xl transition hover:border-white/10 sm:px-4 sm:py-2.5 sm:text-[13px]"
      >
        <ChevronDown size={15} className={cn("text-dash-muted transition-transform", open && "rotate-180")} />
        {current?.label ?? label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-[calc(100%+6px)] z-30 min-w-[160px] overflow-hidden rounded-2xl border border-dash-border bg-dash-card p-1.5 shadow-[0_16px_40px_rgba(0,0,0,.5)]">
            {options.map((o) => (
              <div
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn(
                  "cursor-pointer rounded-xl px-3 py-2 text-right text-[13px] transition",
                  o.value === value ? "bg-dash-green/10 text-dash-green" : "text-dash-muted hover:bg-white/5 hover:text-dash-text"
                )}
              >
                {o.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
