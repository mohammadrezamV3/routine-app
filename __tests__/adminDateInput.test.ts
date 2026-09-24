import { describe, it, expect } from "vitest";
import { toLocalInputValue } from "@/lib/adminFormat";

// فرمِ ویرایشِ رویدادِ تقویم اقتصادی، زمان را از یک ستونِ UTC می‌خواند و در
// یک `<input type="datetime-local">` می‌گذارد که مقدارش را *محلی* می‌فهمد.
// اگر این تبدیل غلط باشد، هر بار باز و ذخیره‌کردنِ یک رویداد ساعتش را
// جابه‌جا می‌کند — باگی که فقط بعدِ چند بار ویرایش دیده می‌شود.

describe("toLocalInputValue", () => {
  it("معکوسِ دقیقِ مسیرِ ذخیره است (رفت‌وبرگشت زمان را جابه‌جا نمی‌کند)", () => {
    const iso = "2026-09-19T12:30:00.000Z";
    const roundTripped = new Date(toLocalInputValue(iso)).toISOString();
    expect(roundTripped).toBe(iso);
  });

  it("خروجی دقیقاً فرمتی‌ست که اینپوت می‌پذیرد", () => {
    expect(toLocalInputValue("2026-01-05T04:07:00.000Z")).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("وقتِ محلی می‌دهد نه UTC", () => {
    const iso = "2026-09-19T12:30:00.000Z";
    const local = toLocalInputValue(iso);
    const d = new Date(iso);
    expect(local.slice(11, 13)).toBe(String(d.getHours()).padStart(2, "0"));
  });

  it("تاریخِ نامعتبر کرش نمی‌کند", () => {
    expect(toLocalInputValue("چرت")).toBe("");
  });
});
