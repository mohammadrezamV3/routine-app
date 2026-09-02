import { describe, expect, it } from "vitest";
import { normalizeForexFactory, normalizeForexFactoryRow } from "@/lib/forexFactory";
import { translateEventTitle } from "@/lib/economicEventFa";

// نمونه‌ی واقعیِ شکلِ فیدِ هفتگیِ فارکس‌فکتوری. عمداً fixture است نه
// درخواستِ زنده: تست نباید به در دسترس بودنِ یک سرویسِ بیرونی گره بخورد.
const FF_ROWS = [
  {
    title: "Non-Farm Employment Change",
    country: "USD",
    date: "2026-09-04T12:30:00-04:00",
    impact: "High",
    forecast: "165K",
    previous: "142K",
  },
  {
    title: "Unemployment Rate",
    country: "USD",
    date: "2026-09-04T12:30:00-04:00",
    impact: "High",
    forecast: "4.3%",
    previous: "4.2%",
    actual: "4.4%",
  },
  {
    title: "Flash Manufacturing PMI",
    country: "EUR",
    date: "2026-09-02T08:00:00-04:00",
    impact: "Medium",
    forecast: "",
    previous: "45.8",
  },
  {
    title: "Bank Holiday",
    country: "GBP",
    date: "2026-09-01T00:00:00-04:00",
    impact: "Holiday",
    forecast: "",
    previous: "",
  },
];

describe("normalizeForexFactoryRow", () => {
  it("کدِ ارز را از فیلدِ country می‌خواند (که در این فید ارز است نه کشور)", () => {
    const ev = normalizeForexFactoryRow(FF_ROWS[0])!;
    expect(ev.currency).toBe("USD");
    // کشور از روی ارز مشتق می‌شود، نه از رشته‌ی "USD"
    expect(ev.country).toBe("US");
  });

  it("عنوان را فارسی می‌کند", () => {
    expect(normalizeForexFactoryRow(FF_ROWS[0])!.title).toContain("اشتغال غیرکشاورزی");
    expect(normalizeForexFactoryRow(FF_ROWS[2])!.title).toContain("مدیران خرید");
  });

  it("زمان را با offset درست به UTC می‌برد", () => {
    // 12:30 در UTC-4 یعنی 16:30 UTC
    expect(normalizeForexFactoryRow(FF_ROWS[0])!.occursAt.toISOString()).toBe("2026-09-04T16:30:00.000Z");
  });

  it("سطحِ تأثیر را نگاشت می‌کند و Holiday را کم‌اثر می‌گیرد", () => {
    expect(normalizeForexFactoryRow(FF_ROWS[0])!.impact).toBe("HIGH");
    expect(normalizeForexFactoryRow(FF_ROWS[2])!.impact).toBe("MEDIUM");
    expect(normalizeForexFactoryRow(FF_ROWS[3])!.impact).toBe("LOW");
  });

  it("رشته‌ی تهی را null می‌کند نه رشته‌ی خالی", () => {
    const ev = normalizeForexFactoryRow(FF_ROWS[2])!;
    expect(ev.forecast).toBeNull();
    expect(ev.previous).toBe("45.8");
    expect(ev.actual).toBeNull();
  });

  it("actual را وقتی منتشر شده برمی‌دارد", () => {
    expect(normalizeForexFactoryRow(FF_ROWS[1])!.actual).toBe("4.4%");
  });

  it("شناسه‌ی پایدار می‌سازد تا اجرای دوباره‌ی کران ردیفِ تکراری نسازد", () => {
    const a = normalizeForexFactoryRow(FF_ROWS[0])!;
    const b = normalizeForexFactoryRow({ ...FF_ROWS[0], actual: "170K" })!;
    // انتشارِ actual نباید شناسه را عوض کند، وگرنه به‌جای به‌روزرسانی یک
    // ردیفِ دوم ساخته می‌شود
    expect(b.externalId).toBe(a.externalId);
  });

  it("ردیفِ بدشکل را کنار می‌گذارد نه اینکه بشکند", () => {
    expect(normalizeForexFactoryRow(null)).toBeNull();
    expect(normalizeForexFactoryRow({ title: "X", country: "USD" })).toBeNull(); // بدونِ تاریخ
    expect(normalizeForexFactoryRow({ title: "", country: "USD", date: "2026-09-01T00:00:00Z" })).toBeNull();
    expect(normalizeForexFactoryRow({ title: "X", country: "United States", date: "2026-09-01T00:00:00Z" })).toBeNull();
    expect(normalizeForexFactoryRow({ title: "X", country: "USD", date: "not-a-date" })).toBeNull();
  });
});

describe("normalizeForexFactory", () => {
  it("کلِ فید را تبدیل می‌کند و ردیفِ خراب کلِ همگام‌سازی را نمی‌شکند", () => {
    const out = normalizeForexFactory([...FF_ROWS, null, { nope: true }]);
    expect(out).toHaveLength(4);
  });

  it("رویدادِ تکراری را یک بار برمی‌گرداند", () => {
    const out = normalizeForexFactory([FF_ROWS[0], FF_ROWS[0]]);
    expect(out).toHaveLength(1);
  });

  it("ورودیِ غیرآرایه‌ای را خالی برمی‌گرداند", () => {
    expect(normalizeForexFactory({ events: FF_ROWS })).toEqual([]);
    expect(normalizeForexFactory(null)).toEqual([]);
  });
});

describe("translateEventTitle", () => {
  it("عنوان‌های پرتکرار را دقیق ترجمه می‌کند", () => {
    expect(translateEventTitle("Unemployment Rate")).toBe("نرخ بیکاری");
    expect(translateEventTitle("ISM Services PMI")).toBe("شاخص مدیران خرید خدمات ISM");
  });

  it("پسوندِ دوره‌ای را فارسی می‌کند", () => {
    expect(translateEventTitle("Core CPI m/m")).toContain("(ماهانه)");
    expect(translateEventTitle("Retail Sales y/y")).toContain("(سالانه)");
  });

  it("عنوانِ ترکیبی را از روی عبارت‌ها می‌سازد", () => {
    const t = translateEventTitle("German Flash Services PMI");
    expect(t).toContain("آلمان");
    expect(t).toContain("مدیران خرید");
  });

  it("عنوانِ ناشناخته را دست‌نخورده برمی‌گرداند، نه نصفه‌ترجمه", () => {
    expect(translateEventTitle("Wibble Wobble Index")).toBe("Wibble Wobble Index");
  });

  it("مرزِ کلمه را رعایت می‌کند (core داخلِ کلمه‌ی دیگر گرفته نشود)", () => {
    expect(translateEventTitle("Scorecard Release")).toBe("Scorecard Release");
  });

  it("ورودیِ خالی را نمی‌شکند", () => {
    expect(translateEventTitle("")).toBe("");
  });
});
