"use client";

import { useMemo } from "react";
import type { CustomOccurrence } from "@/lib/storage";
import { toEnDigits } from "@/lib/schedule";

// فیلد تگ برنامه‌ی روتین: تایپ آزاد + پیشنهاد تگ‌هایی که کاربر قبلا روی
// برنامه‌هاش گذاشته (همون الگوی TradeTagField، ولی هر برنامه فقط یک تگ
// داره و تگ همون متن ذخیره‌شده روی occurrence ـه، نه یک موجودیت جدا).
// زدن یک پیشنهاد تگ رو ست می‌کنه و زدن دوباره‌اش پاکش می‌کنه.
export function RoutineTagField({
  id,
  value,
  onChange,
  occurrences,
}: {
  id: string;
  value: string;
  onChange: (tag: string) => void;
  occurrences: CustomOccurrence[];
}) {
  // تگ‌های موجود، پرتکرارترها اول (حداکثر 12 تا تا فرم شلوغ نشه)
  const suggestions = useMemo(() => {
    const count = new Map<string, number>();
    for (const o of occurrences) {
      const t = toEnDigits(o.tag?.trim() || "");
      if (t) count.set(t, (count.get(t) ?? 0) + 1);
    }
    return Array.from(count.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fa"))
      .slice(0, 12)
      .map(([t]) => t);
  }, [occurrences]);

  const current = value.trim();

  return (
    <>
      <input
        id={id}
        type="text"
        className="wsearch-newform-name"
        placeholder="درس، ورزش، کار…"
        maxLength={30}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {suggestions.length > 0 && (
        <div className="trade-tag-row" style={{ marginTop: 8 }} aria-label="تگ‌های قبلی">
          {suggestions.map((t) => {
            const active = t === current;
            return (
              <button
                key={t}
                type="button"
                className={`trade-tag-chip${active ? " active" : ""}`}
                aria-pressed={active}
                onClick={() => onChange(active ? "" : t)}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
