import { describe, it, expect, vi } from "vitest";

// dashboardServer.ts در import به prisma/تقویم اقتصادی می‌رسه؛ اینجا فقط
// توابع خالص تاریخ تست می‌شن، پس هر دو mock می‌شن.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/economicCalendar", () => ({ ensureFreshCalendar: vi.fn() }));

import { isoAdd, resolveDay } from "@/lib/dashboardServer";
import { isoLocal } from "@/lib/jalali";

describe("isoAdd", () => {
  it("جمع و تفریق ساده", () => {
    expect(isoAdd("2026-09-30", 0)).toBe("2026-09-30");
    expect(isoAdd("2026-09-15", 1)).toBe("2026-09-16");
    expect(isoAdd("2026-09-15", 10)).toBe("2026-09-25");
  });

  it("عبور از مرز ماه", () => {
    expect(isoAdd("2026-09-30", 1)).toBe("2026-10-01");
    expect(isoAdd("2026-01-31", 1)).toBe("2026-02-01");
    expect(isoAdd("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("سال کبیسه", () => {
    expect(isoAdd("2028-02-28", 1)).toBe("2028-02-29");
    expect(isoAdd("2028-02-28", 2)).toBe("2028-03-01");
  });

  it("عبور از مرز سال", () => {
    expect(isoAdd("2026-12-31", 1)).toBe("2027-01-01");
    expect(isoAdd("2026-12-31", 366)).toBe("2028-01-01");
  });

  it("n منفی", () => {
    expect(isoAdd("2026-10-01", -1)).toBe("2026-09-30");
    expect(isoAdd("2027-01-01", -1)).toBe("2026-12-31");
    expect(isoAdd("2026-03-01", -1)).toBe("2026-02-28");
    expect(isoAdd("2026-09-30", -13)).toBe("2026-09-17");
    expect(isoAdd("2026-09-30", -120)).toBe("2026-06-02");
  });
});

describe("resolveDay", () => {
  const today = () => isoLocal(new Date());

  it("تاریخ معتبر امروز حفظ می‌شه", () => {
    const t = today();
    expect(resolveDay(t, "210").date).toBe(t);
  });

  it("دیروز و فردا (در بازه‌ی ۲.۵ روز) حفظ می‌شن", () => {
    const y = isoAdd(today(), -1);
    const tm = isoAdd(today(), 1);
    expect(resolveDay(y, "0").date).toBe(y);
    expect(resolveDay(tm, "0").date).toBe(tm);
  });

  it("تاریخ بدفرم → امروز", () => {
    const t = today();
    expect(resolveDay("abc", "210").date).toBe(t);
    expect(resolveDay("2026-9-3", "210").date).toBe(t);
    expect(resolveDay("2026-09-30T00:00:00Z", "210").date).toBe(t);
    expect(resolveDay("", "210").date).toBe(t);
    expect(resolveDay(null, "210").date).toBe(t);
  });

  it("تاریخ ناموجود (۳۱ فوریه) → امروز", () => {
    expect(resolveDay("2026-02-31", "210").date).toBe(today());
    expect(resolveDay("2026-13-01", "210").date).toBe(today());
  });

  it("تاریخ خیلی دور (گذشته/آینده) → امروز", () => {
    expect(resolveDay("2000-01-01", "210").date).toBe(today());
    expect(resolveDay(isoAdd(today(), -10), "210").date).toBe(today());
    expect(resolveDay(isoAdd(today(), 10), "210").date).toBe(today());
    expect(resolveDay("2999-12-31", "210").date).toBe(today());
  });

  it("tz خارج از -720..840 یا غیرصحیح → 210", () => {
    expect(resolveDay(null, "841").tz).toBe(210);
    expect(resolveDay(null, "-721").tz).toBe(210);
    expect(resolveDay(null, "210.5").tz).toBe(210);
    expect(resolveDay(null, "abc").tz).toBe(210);
    expect(resolveDay(null, "NaN").tz).toBe(210);
    expect(resolveDay(null, "Infinity").tz).toBe(210);
  });

  // باگ منبع: Number(null) === 0 و Number("") === 0 عدد صحیح معتبرن، پس نبود
  // پارامتر tz (searchParams.get → null) به‌جای پیش‌فرض ۲۱۰ (تهران) UTC می‌شه.
  it("tz نبود (null) → 210", () => {
    expect(resolveDay(null, null).tz).toBe(210);
  });
  it("tz رشته‌ی خالی → 210", () => {
    expect(resolveDay(null, "").tz).toBe(210);
  });

  it("tz معتبر (شامل مرزها) حفظ می‌شه", () => {
    expect(resolveDay(null, "0").tz).toBe(0);
    expect(resolveDay(null, "-720").tz).toBe(-720);
    expect(resolveDay(null, "840").tz).toBe(840);
    expect(resolveDay(null, "-300").tz).toBe(-300);
    expect(resolveDay(null, "210").tz).toBe(210);
  });

  it("date و tz مستقل از هم اعتبارسنجی می‌شن", () => {
    const t = today();
    expect(resolveDay("bad", "-300")).toEqual({ date: t, tz: -300 });
    expect(resolveDay(t, "9999")).toEqual({ date: t, tz: 210 });
  });
});
