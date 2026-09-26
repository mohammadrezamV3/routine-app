import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  RELEASE_WATCH_WINDOW_MS, compareActualToForecast, computeNextSyncDelayMs,
  normalizeExternalEvents, normalizeTradingViewEvents, syncEconomicCalendar,
} from "@/lib/economicCalendar";

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
      // پیاده‌سازیِ واقعیِ فیلتر (نه یک vi.fn تهی) تا هم بشه روی
      // آرگومان‌هایِ where اسرت کرد، هم رفتارِ واقعیِ حذف را (که removed
      // چند رویداد باشه) سنجید.
      deleteMany: vi.fn(async ({ where }: any) => {
        let count = 0;
        for (const [key, row] of rows) {
          let match = true;
          if (where.source) {
            if (typeof where.source === "string") match &&= row.source === where.source;
            else if (where.source.notIn) match &&= !where.source.notIn.includes(row.source);
          }
          if (match && where.occursAt) {
            const t = row.occursAt.getTime();
            if (where.occursAt.gte) match &&= t >= where.occursAt.gte.getTime();
            if (where.occursAt.lte) match &&= t <= where.occursAt.lte.getTime();
          }
          if (match && where.externalId?.notIn) {
            match &&= !where.externalId.notIn.includes(row.externalId);
          }
          if (match) { rows.delete(key); count++; }
        }
        return { count };
      }),
    },
  };
}

function stubFeed(payload: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(
    JSON.stringify(payload),
    { status: 200, headers: { "content-type": "application/json" } },
  )));
}

/** موکِ fetch بر اساسِ URL — لازم چون حالا هر sync ممکنه چند منبعِ متفاوت (TradingView، سه فایلِ فارکس‌فکتوری) را صدا بزنه. */
function stubFeedByUrl(handler: (url: string) => { status: number; body?: unknown }) {
  vi.stubGlobal("fetch", vi.fn(async (url: unknown) => {
    const { status, body } = handler(String(url));
    if (status !== 200) return new Response("err", { status });
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }));
}

const isTradingView = (url: string) => url.includes("economic-calendar.tradingview.com");
const isForexFactory = (url: string) => url.includes("faireconomy");

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

describe("normalizeTradingViewEvents (منبعِ پیش‌فرضِ بدونِ کلید)", () => {
  const tvPayload = (overrides: Record<string, unknown> = {}) => ({
    status: "ok",
    result: [{
      id: "360047",
      title: "Non Farm Payrolls",
      country: "US",
      currency: "USD",
      importance: 1,
      date: "2026-09-04T12:30:00.000Z",
      actual: 175,
      forecast: 243,
      previous: 315,
      scale: "K",
      unit: "",
      period: "Aug",
      comment: "توضیحِ رویداد",
      ...overrides,
    }],
  });

  it("شکلِ استانداردِ یک ردیف را درست نرمال می‌کند", () => {
    const [e] = normalizeTradingViewEvents(tvPayload());
    expect(e.externalId).toBe("360047");
    expect(e.title).toBe("Non Farm Payrolls (Aug)");
    expect(e.country).toBe("US");
    expect(e.currency).toBe("USD");
    expect(e.impact).toBe("HIGH");
    expect(e.actual).toBe("175K");
    expect(e.forecast).toBe("243K");
    expect(e.previous).toBe("315K");
    expect(e.occursAt.toISOString()).toBe("2026-09-04T12:30:00.000Z");
    expect(e.description).toBe("توضیحِ رویداد");
  });

  it("واحدِ درصد را می‌چسباند («3.2%»)", () => {
    const [e] = normalizeTradingViewEvents(tvPayload({ actual: 3.2, scale: "", unit: "%" }));
    expect(e.actual).toBe("3.2%");
  });

  it("importance را به سطحِ تأثیر درست تبدیل می‌کند", () => {
    const [low] = normalizeTradingViewEvents(tvPayload({ importance: -1 }));
    const [medium] = normalizeTradingViewEvents(tvPayload({ importance: 0 }));
    const [high] = normalizeTradingViewEvents(tvPayload({ importance: 1 }));
    expect(low.impact).toBe("LOW");
    expect(medium.impact).toBe("MEDIUM");
    expect(high.impact).toBe("HIGH");
  });

  it("actualِ null را null نگه می‌دارد (نه رشته‌ی «null»)", () => {
    const [e] = normalizeTradingViewEvents(tvPayload({ actual: null }));
    expect(e.actual).toBeNull();
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

  it("بدونِ ECONOMIC_CALENDAR_API_KEY هم کار می‌کند — سراغِ TradingView می‌رود (منبعِ پیش‌فرض)", async () => {
    // این تست قبلاً برعکس بود (انتظارِ پرتابِ خطا) و دقیقاً همان رفتاری را
    // تثبیت می‌کرد که باعثِ «actual هیچ‌وقت نمی‌آید» می‌شد: نبودِ کلید یعنی
    // هیچ داده‌ای، برای همیشه.
    vi.unstubAllEnvs();
    const prisma = fakePrisma();
    stubFeed({ status: "ok", result: [{ id: "1", title: "Non Farm Payrolls", country: "US", currency: "USD", importance: 1, date: "2026-09-16T12:30:00.000Z", actual: 173, forecast: 160, previous: 142, scale: "K", unit: "" }] });

    const res = await syncEconomicCalendar(prisma as any);

    expect(res.source).toBe("TRADINGVIEW");
    expect(res.created).toBe(1);
    expect([...prisma.rows.values()][0].actual).toBe("173K");
  });
});

describe("فالبک به فارکس‌فکتوری وقتی TradingView در دسترس نیست", () => {
  beforeEach(() => { vi.unstubAllEnvs(); });

  it("در پاسِ کامل: TradingView شکست می‌خورد، فارکس‌فکتوری جایگزینِ منبع می‌شود", async () => {
    const prisma = fakePrisma();
    stubFeedByUrl((url) => {
      if (isTradingView(url)) return { status: 503 };
      return { status: 200, body: ffRow("173K") };
    });

    const res = await syncEconomicCalendar(prisma as any);
    expect(res.source).toBe("FOREXFACTORY");
    expect(res.created).toBe(1);
    expect([...prisma.rows.values()][0].actual).toBe("173K");
  });

  it("در حالتِ تند اگه TradingView شکست بخوره، فالبک نمی‌زنه و خطا پرتاب می‌شه", async () => {
    const prisma = fakePrisma();
    stubFeedByUrl((url) => (isTradingView(url) ? { status: 503 } : { status: 200, body: ffRow("173K") }));

    await expect(syncEconomicCalendar(prisma as any, { fast: true })).rejects.toThrow();
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

describe("فیدِ رایگان (بدونِ کلید، فقط وقتی TradingView در دسترس نیست)", () => {
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

    stubFeedByUrl((url) => (isTradingView(url) ? { status: 503 } : { status: 200, body: ffRow("") }));
    await syncEconomicCalendar(prisma as any);
    expect([...prisma.rows.values()][0].actual).toBeNull();

    stubFeedByUrl((url) => (isTradingView(url) ? { status: 503 } : { status: 200, body: ffRow("173K") }));
    const second = await syncEconomicCalendar(prisma as any);
    expect(second.created).toBe(0);
    expect(prisma.rows.size).toBe(1);
    expect([...prisma.rows.values()][0].actual).toBe("173K");
  });

  it("یک فیدِ از‌کارافتاده کلِ sync را نمی‌شکند", async () => {
    const prisma = fakePrisma();
    stubFeedByUrl((url) => {
      if (isTradingView(url)) return { status: 503 };
      // فایلِ lastweek خراب، بقیه سالم
      if (url.includes("lastweek")) return { status: 503 };
      return { status: 200, body: ffRow("173K") };
    });

    const res = await syncEconomicCalendar(prisma as any);
    expect(res.source).toBe("FOREXFACTORY");
    expect(res.created).toBe(1);
    expect([...prisma.rows.values()][0].actual).toBe("173K");
  });

  it("فایلِ عقب‌مانده، actualِ منتشرشده را با خالی بازنویسی نمی‌کند", async () => {
    const prisma = fakePrisma();
    stubFeedByUrl((url) => {
      if (isTradingView(url)) return { status: 503 };
      // فایلِ lastweek هنوز actual ندارد، بقیه دارند — همان رویداد
      const body = url.includes("lastweek") ? ffRow("") : ffRow("173K");
      return { status: 200, body };
    });

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

describe("پاک‌سازیِ رویدادهایِ حذف‌شده/تغییرِ منبع (پاسِ کامل)", () => {
  beforeEach(() => { vi.unstubAllEnvs(); vi.stubEnv("ECONOMIC_CALENDAR_API_KEY", "test-key"); });

  it("در حالتِ تند اصلاً deleteMany صدا زده نمی‌شود", async () => {
    const prisma = fakePrisma();
    stubFeed(jbRow("173K"));
    await syncEconomicCalendar(prisma as any, { fast: true });
    expect(prisma.economicEvent.deleteMany).not.toHaveBeenCalled();
  });

  it("وقتی فید خالیه، deleteMany صدا زده نمی‌شود (فیدِ خالی یعنی احتمالِ خرابیِ منبع)", async () => {
    const prisma = fakePrisma();
    stubFeed([]);
    await syncEconomicCalendar(prisma as any);
    expect(prisma.economicEvent.deleteMany).not.toHaveBeenCalled();
  });

  it("ردیف‌هایِ منابعِ خودکارِ دیگر و ردیف‌هایِ همین منبع که دیگر در فید نیستند را در همان بازه پاک می‌کند", async () => {
    const prisma = fakePrisma();

    // بازه‌ی پاک‌سازی بر اساسِ min/max زمانِ رویدادهایِ *تازه‌فچ‌شده* حساب
    // می‌شه (این‌جا فقط یک رویداد، پس بازه دقیقاً همون یک لحظه‌ست) — پس
    // ردیف‌هایِ از‌قبل‌موجود باید دقیقاً همون occursAt رو داشته باشن تا
    // داخلِ بازه بیفتن.
    const sameMoment = new Date("2026-09-16T12:30:00.000Z");
    // یک ردیفِ قدیمی از منبعِ دیگر (مثلاً فارکس‌فکتوریِ قبلی) در همین بازه
    prisma.rows.set("FOREXFACTORY|old-1", {
      source: "FOREXFACTORY", externalId: "old-1", occursAt: sameMoment,
    });
    // یک ردیفِ دستیِ ادمین در همان بازه — نباید هیچ‌وقت پاک شود
    prisma.rows.set("MANUAL|manual-1", {
      source: "MANUAL", externalId: "manual-1", occursAt: sameMoment,
    });
    // یک ردیفِ قدیمیِ خودِ همین منبع که در فیدِ تازه دیگر نیست
    prisma.rows.set("JBLANKED|stale-1", {
      source: "JBLANKED", externalId: "stale-1", occursAt: sameMoment,
    });

    stubFeed(jbRow("173K"));
    const res = await syncEconomicCalendar(prisma as any);

    expect(res.source).toBe("JBLANKED");
    expect(prisma.economicEvent.deleteMany).toHaveBeenCalledTimes(2);

    const [firstCall, secondCall] = (prisma.economicEvent.deleteMany as any).mock.calls.map((c: any[]) => c[0]);
    expect(firstCall.where.source).toEqual({ notIn: ["JBLANKED", "MANUAL"] });
    expect(secondCall.where.source).toBe("JBLANKED");
    expect(secondCall.where.externalId).toEqual({ notIn: ["12345"] });

    expect(prisma.rows.has("FOREXFACTORY|old-1")).toBe(false);
    expect(prisma.rows.has("MANUAL|manual-1")).toBe(true);
    expect(prisma.rows.has("JBLANKED|stale-1")).toBe(false);
    expect(res.removed).toBe(2);
  });
});

describe("externalProviderName", () => {
  beforeEach(() => { vi.unstubAllEnvs(); });

  it("با اولویتِ واقعیِ انتخابِ منبع هم‌نظر است", async () => {
    const { externalProviderName } = await import("@/lib/economicCalendar");
    expect(externalProviderName()).toBe("TRADINGVIEW");
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

// ── پنجره‌ی رصدِ انتشار ─────────────────────────────────────────────────
// خواسته‌ی صریح: «تا حدود ۳ دقیقه بعد، هر ۵ ثانیه، تا وقتی آپدیت شود».

/** prismaی قلابی که واقعاً شرطِ where را اعمال می‌کند (وگرنه تست چیزی را نمی‌سنجد). */
function prismaWithEvents(rows: { occursAt: Date; actual: string | null }[]) {
  return {
    economicEvent: {
      findFirst: async ({ where }: any) => {
        const match = rows
          .filter((r) => (where.actual === null ? r.actual === null : true))
          .filter((r) => r.occursAt >= where.occursAt.gte && r.occursAt <= where.occursAt.lte)
          .sort((a, b) => a.occursAt.getTime() - b.occursAt.getTime())[0];
        return match ? { occursAt: match.occursAt } : null;
      },
    },
  };
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

describe("computeNextSyncDelayMs — رصدِ لحظه‌ی انتشار", () => {
  it("تا ۳ دقیقه بعدِ رویدادِ بی‌actual، هر ۵ ثانیه چک می‌کند", async () => {
    for (const m of [0.5, 1, 2, 2.9]) {
      const prisma = prismaWithEvents([{ occursAt: minutesAgo(m), actual: null }]);
      expect(await computeNextSyncDelayMs(prisma as any)).toBe(5_000);
    }
  });

  it("بعد از ۳ دقیقه دست می‌کشد و به حالتِ آرام برمی‌گردد", async () => {
    const prisma = prismaWithEvents([{ occursAt: minutesAgo(4), actual: null }]);
    expect(await computeNextSyncDelayMs(prisma as any)).toBe(10 * 60 * 1000);
  });

  it("به‌محضِ رسیدنِ actual، رصدِ تند تمام می‌شود (نه اینکه ۳ دقیقه را صبر کند)", async () => {
    const prisma = prismaWithEvents([{ occursAt: minutesAgo(1), actual: "173K" }]);
    expect(await computeNextSyncDelayMs(prisma as any)).toBe(10 * 60 * 1000);
  });

  it("رویدادی که هنوز نرسیده: دقیقاً تا لحظه‌ی سررسید صبر می‌کند", async () => {
    const in30s = new Date(Date.now() + 30_000);
    const prisma = prismaWithEvents([{ occursAt: in30s, actual: null }]);
    const delay = await computeNextSyncDelayMs(prisma as any);
    // ۳۰ثانیه تا رویداد + ۳ثانیه مهلتِ ته‌نشینی
    expect(delay).toBeGreaterThan(30_000);
    expect(delay).toBeLessThanOrEqual(34_000);
  });

  it("پنجره همان چیزی‌ست که کلاینت هم استفاده می‌کند", () => {
    expect(RELEASE_WATCH_WINDOW_MS).toBe(3 * 60 * 1000);
  });
});

// ── ensureFreshCalendar — تازه‌نگه‌داشتن هنگامِ خواندن ────────────────────
// هر تست ماژول را از نو ایمپورت می‌کند (vi.resetModules) چون
// ensureFreshCalendar وضعیتِ ماژول‌سطحی (inflight/lastAttemptAt) دارد که
// نباید بینِ تست‌ها درز کند.

describe("ensureFreshCalendar", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  function fakeFreshnessPrisma(latestUpdatedAt: Date | null) {
    return {
      economicEvent: {
        // تشخیصِ نوعِ کوئری با شکلِ where: کوئریِ تازگی `source` دارد،
        // کوئریِ pending-release `actual: null` دارد.
        findFirst: vi.fn(async ({ where }: any) => {
          if (where && "source" in where) {
            return latestUpdatedAt ? { updatedAt: latestUpdatedAt } : null;
          }
          return null; // هیچ رویدادِ در‌انتظارِ انتشاری نیست
        }),
        upsert: vi.fn(async () => {
          const now = new Date();
          return { createdAt: now, updatedAt: now };
        }),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
    };
  }

  function stubEmptyFeed() {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ status: "ok", result: [] }),
      { status: 200, headers: { "content-type": "application/json" } },
    )));
  }

  it("وقتی آخرین sync تازه‌ست، sync دیگری نمی‌زند", async () => {
    stubEmptyFeed();
    const { ensureFreshCalendar } = await import("@/lib/economicCalendar");
    const prisma = fakeFreshnessPrisma(new Date());
    await ensureFreshCalendar(prisma as any);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("وقتی جدول خالیه (هیچ ردیفِ خودکاری نیست)، sync می‌زند", async () => {
    stubEmptyFeed();
    const { ensureFreshCalendar } = await import("@/lib/economicCalendar");
    const prisma = fakeFreshnessPrisma(null);
    await ensureFreshCalendar(prisma as any);
    expect(fetch).toHaveBeenCalled();
  });

  it("وقتی آخرین sync کهنه‌ست (بیشتر از بازه‌ی آروم)، sync می‌زند", async () => {
    stubEmptyFeed();
    const { ensureFreshCalendar } = await import("@/lib/economicCalendar");
    const staleAt = new Date(Date.now() - 20 * 60 * 1000); // ۲۰ دقیقه پیش
    const prisma = fakeFreshnessPrisma(staleAt);
    await ensureFreshCalendar(prisma as any);
    expect(fetch).toHaveBeenCalled();
  });
});
