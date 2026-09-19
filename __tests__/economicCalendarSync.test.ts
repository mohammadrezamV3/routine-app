import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { normalizeExternalEvents, syncEconomicCalendar, compareActualToForecast } from "@/lib/economicCalendar";

// رگرسیونِ گزارشِ «اکشوال‌ها هیچ‌وقت نمی‌آیند»: مسیرِ کامل fetch → نرمال‌سازی
// → upsert باید در پاسِ دوم مقدارِ actual تازه‌منتشرشده را روی همان ردیف
// بنشاند (نه ردیفِ تکراری بسازد و نه مقدارِ قبلی را نگه دارد).

const jbRow = (actual: string | number) => [{
  ID: "12345",
  Name: "Non Farm Payrolls",
  Currency: "USD",
  Category: "Employment",
  Impact: "High",
  Date: "2026.09.16 12:30:00",
  Forecast: "160K",
  Previous: "142K",
  Actual: actual,
}];

function fakePrisma() {
  const rows = new Map<string, any>();
  return {
    rows,
    economicEvent: {
      upsert: async ({ where, create, update }: any) => {
        const key = `${where.source_externalId.source}|${where.source_externalId.externalId}`;
        const existing = rows.get(key);
        const now = new Date();
        if (!existing) {
          rows.set(key, { ...create, createdAt: now, updatedAt: now });
          return { createdAt: now, updatedAt: now };
        }
        Object.assign(existing, update, { updatedAt: new Date(existing.createdAt.getTime() + 1000) });
        return { createdAt: existing.createdAt, updatedAt: existing.updatedAt };
      },
    },
  };
}

function stubFeed(payload: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(
    JSON.stringify(payload),
    { status: 200, headers: { "content-type": "application/json" } },
  )));
}

beforeEach(() => {
  vi.stubEnv("ECONOMIC_CALENDAR_API_KEY", "test-key");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("normalizeExternalEvents (شکلِ واقعیِ فیدِ JBlanked)", () => {
  it("ارز را از فیلد Currency می‌گیرد و actualِ خالی را null می‌کند", () => {
    const [e] = normalizeExternalEvents(jbRow(""));
    expect(e.currency).toBe("USD");
    expect(e.country).toBe("US");
    expect(e.impact).toBe("HIGH");
    expect(e.actual).toBeNull();
    expect(e.forecast).toBe("160K");
  });

  it("externalId بینِ پاسِ بی‌actual و پاسِ باactual یکی می‌ماند", () => {
    const before = normalizeExternalEvents(jbRow(""))[0];
    const after = normalizeExternalEvents(jbRow("173K"))[0];
    expect(after.externalId).toBe(before.externalId);
  });

  it("تاریخِ نقطه‌ای JBlanked («YYYY.MM.DD HH:mm:ss») را به‌عنوانِ UTC پارس می‌کند", () => {
    const [e] = normalizeExternalEvents(jbRow(""));
    expect(e.occursAt.toISOString()).toBe("2026-09-16T12:30:00.000Z");
  });

  it("Impactِ متنی («High»/«Medium») را به سطحِ تأثیر درست تبدیل می‌کند", () => {
    const [medium] = normalizeExternalEvents([{ ...jbRow("")[0], Impact: "Medium" }]);
    const [low] = normalizeExternalEvents([{ ...jbRow("")[0], Impact: "Low" }]);
    expect(medium.impact).toBe("MEDIUM");
    expect(low.impact).toBe("LOW");
  });
});

describe("syncEconomicCalendar", () => {
  it("پاسِ دوم actual را روی همان ردیف به‌روز می‌کند، نه ردیفِ تازه", async () => {
    const prisma = fakePrisma();

    stubFeed(jbRow(""));
    const first = await syncEconomicCalendar(prisma as any);
    expect(first.created).toBe(1);
    expect(prisma.rows.size).toBe(1);
    expect([...prisma.rows.values()][0].actual).toBeNull();

    stubFeed(jbRow("173K"));
    const second = await syncEconomicCalendar(prisma as any);
    expect(second.created).toBe(0);
    expect(second.updated).toBe(1);
    expect(prisma.rows.size).toBe(1);
    expect([...prisma.rows.values()][0].actual).toBe("173K");
  });

  it("توضیحِ دستیِ ادمین را با nullِ منبع پاک نمی‌کند", async () => {
    const prisma = fakePrisma();
    stubFeed(jbRow(""));
    await syncEconomicCalendar(prisma as any);
    const row = [...prisma.rows.values()][0];
    row.description = "توضیحِ دستی";

    stubFeed(jbRow("173K"));
    await syncEconomicCalendar(prisma as any);
    expect(row.description).toBe("توضیحِ دستی");
    expect(row.actual).toBe("173K");
  });

  it("بدونِ ECONOMIC_CALENDAR_API_KEY هم کار می‌کند — سراغِ فیدِ رایگان می‌رود", async () => {
    // این تست قبلاً برعکس بود (انتظارِ پرتابِ خطا) و دقیقاً همان رفتاری را
    // تثبیت می‌کرد که باعثِ «actual هیچ‌وقت نمی‌آید» می‌شد: نبودِ کلید یعنی
    // هیچ داده‌ای، برای همیشه.
    vi.unstubAllEnvs();
    const prisma = fakePrisma();
    stubFeed(ffRow("173K"));

    const res = await syncEconomicCalendar(prisma as any);

    expect(res.source).toBe("FOREXFACTORY");
    expect(res.created).toBe(1);
    expect([...prisma.rows.values()][0].actual).toBe("173K");
  });
});

// ── فیدِ رایگانِ فارکس‌فکتوری ────────────────────────────────────────────
// شکلش با JBlanked فرق دارد: کلیدها کوچک‌اند، `country` در واقع *کد ارز*
// است، تاریخ ISO با آفست است، و شناسه‌ی پایداری وجود ندارد.

const ffRow = (actual: string) => [{
  title: "Non-Farm Employment Change",
  country: "USD",
  date: "2026-09-16T08:30:00-04:00",
  impact: "High",
  forecast: "160K",
  previous: "142K",
  actual,
}];

describe("فیدِ رایگان (بدونِ کلید)", () => {
  beforeEach(() => { vi.unstubAllEnvs(); });

  it("کدِ ارز را از فیلدِ country می‌خواند و تاریخِ ISO با آفست را درست می‌فهمد", () => {
    const [e] = normalizeExternalEvents(ffRow("173K"));
    expect(e.currency).toBe("USD");
    expect(e.country).toBe("US");
    expect(e.impact).toBe("HIGH");
    expect(e.actual).toBe("173K");
    // ۰۸:۳۰ به وقتِ ‎-۰۴:۰۰ یعنی ۱۲:۳۰ UTC
    expect(e.occursAt.toISOString()).toBe("2026-09-16T12:30:00.000Z");
  });

  it("actualِ خالی null می‌شود ولی externalId همان می‌ماند", () => {
    const before = normalizeExternalEvents(ffRow(""))[0];
    const after = normalizeExternalEvents(ffRow("173K"))[0];
    expect(before.actual).toBeNull();
    expect(after.externalId).toBe(before.externalId);
  });

  it("actualِ منتشرشده روی همان ردیف می‌نشیند (بدونِ هیچ کارِ ادمین)", async () => {
    const prisma = fakePrisma();

    stubFeed(ffRow(""));
    await syncEconomicCalendar(prisma as any);
    expect([...prisma.rows.values()][0].actual).toBeNull();

    stubFeed(ffRow("173K"));
    const second = await syncEconomicCalendar(prisma as any);
    expect(second.created).toBe(0);
    expect(prisma.rows.size).toBe(1);
    expect([...prisma.rows.values()][0].actual).toBe("173K");
  });

  it("یک فیدِ از‌کارافتاده کلِ sync را نمی‌شکند", async () => {
    const prisma = fakePrisma();
    let call = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      // اولین فایل (lastweek) خراب، بقیه سالم
      if (++call === 1) return new Response("boom", { status: 503 });
      return new Response(JSON.stringify(ffRow("173K")), { status: 200, headers: { "content-type": "application/json" } });
    }));

    const res = await syncEconomicCalendar(prisma as any);
    expect(res.created).toBe(1);
    expect([...prisma.rows.values()][0].actual).toBe("173K");
  });

  it("فایلِ عقب‌مانده، actualِ منتشرشده را با خالی بازنویسی نمی‌کند", async () => {
    const prisma = fakePrisma();
    let call = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      // یک فایل هنوز actual ندارد، فایلِ دیگر دارد — همان رویداد
      const body = ++call === 1 ? ffRow("") : ffRow("173K");
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    }));

    await syncEconomicCalendar(prisma as any);
    expect(prisma.rows.size).toBe(1);
    expect([...prisma.rows.values()][0].actual).toBe("173K");
  });

  it("وقتی هیچ فیدی در دسترس نیست، صریح خطا می‌دهد (نه سکوت)", async () => {
    const prisma = fakePrisma();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
    await expect(syncEconomicCalendar(prisma as any)).rejects.toThrow(/فیدهای تقویم اقتصادی/);
  });
});

describe("externalProviderName", () => {
  beforeEach(() => { vi.unstubAllEnvs(); });

  it("با اولویتِ واقعیِ انتخابِ منبع هم‌نظر است", async () => {
    const { externalProviderName } = await import("@/lib/economicCalendar");
    expect(externalProviderName()).toBe("FOREXFACTORY");
    vi.stubEnv("ECONOMIC_CALENDAR_API_KEY", "k");
    expect(externalProviderName()).toBe("JBLANKED");
    vi.stubEnv("ECONOMIC_CALENDAR_URL", "https://example.test/feed.json");
    expect(externalProviderName()).toBe("EXTERNAL");
  });
});

describe("compareActualToForecast", () => {
  it("واحدها (K/M/%) را نادیده می‌گیرد و فقط عدد را مقایسه می‌کند", () => {
    expect(compareActualToForecast("173K", "160K")).toBe("up");
    expect(compareActualToForecast("-1.4M", "-0.9M")).toBe("down");
    expect(compareActualToForecast("3.2%", "3.2%")).toBe("flat");
    expect(compareActualToForecast(null, "3.2%")).toBeNull();
  });
});
