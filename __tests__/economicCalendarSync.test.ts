import { describe, it, expect, vi, afterEach } from "vitest";
import { normalizeExternalEvents, syncEconomicCalendar, compareActualToForecast } from "@/lib/economicCalendar";

// رگرسیونِ گزارشِ «اکشوال‌ها هیچ‌وقت نمی‌آیند»: مسیرِ کامل fetch → نرمال‌سازی
// → upsert باید در پاسِ دوم مقدارِ actual تازه‌منتشرشده را روی همان ردیف
// بنشاند (نه ردیفِ تکراری بسازد و نه مقدارِ قبلی را نگه دارد).

const ffRow = (actual: string) => [{
  title: "Non-Farm Employment Change",
  country: "USD",
  date: "2026-09-16T12:30:00+00:00",
  impact: "High",
  forecast: "160K",
  previous: "142K",
  actual,
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

// فیدِ پیش‌فرض سه فایلِ هفتگیِ جداست (هفته‌ی قبل/جاری/بعد)؛ اینجا فقط
// «همین هفته» رویداد دارد، دقیقاً مثلِ واقعیت.
function stubFeed(payload: unknown) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(
    JSON.stringify(String(url).includes("thisweek") ? payload : []),
    { status: 200, headers: { "content-type": "application/json" } },
  )));
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("normalizeExternalEvents (شکلِ واقعیِ فیدِ فارکس‌فکتوری)", () => {
  it("کد ارز را از فیلد country می‌گیرد و actualِ خالی را null می‌کند", () => {
    const [e] = normalizeExternalEvents(ffRow(""));
    expect(e.currency).toBe("USD");
    expect(e.country).toBe("US");
    expect(e.impact).toBe("HIGH");
    expect(e.actual).toBeNull();
    expect(e.forecast).toBe("160K");
  });

  it("externalId بینِ پاسِ بی‌actual و پاسِ باactual یکی می‌ماند", () => {
    const before = normalizeExternalEvents(ffRow(""))[0];
    const after = normalizeExternalEvents(ffRow("173K"))[0];
    expect(after.externalId).toBe(before.externalId);
  });
});

describe("syncEconomicCalendar", () => {
  it("پاسِ دوم actual را روی همان ردیف به‌روز می‌کند، نه ردیفِ تازه", async () => {
    const prisma = fakePrisma();

    stubFeed(ffRow(""));
    const first = await syncEconomicCalendar(prisma as any);
    expect(first.created).toBe(1);
    expect(prisma.rows.size).toBe(1);
    expect([...prisma.rows.values()][0].actual).toBeNull();

    stubFeed(ffRow("173K"));
    const second = await syncEconomicCalendar(prisma as any);
    expect(second.created).toBe(0);
    expect(second.updated).toBe(1);
    expect(prisma.rows.size).toBe(1);
    expect([...prisma.rows.values()][0].actual).toBe("173K");
  });

  it("توضیحِ دستیِ ادمین را با nullِ منبع پاک نمی‌کند", async () => {
    const prisma = fakePrisma();
    stubFeed(ffRow(""));
    await syncEconomicCalendar(prisma as any);
    const row = [...prisma.rows.values()][0];
    row.description = "توضیحِ دستی";

    stubFeed(ffRow("173K"));
    await syncEconomicCalendar(prisma as any);
    expect(row.description).toBe("توضیحِ دستی");
    expect(row.actual).toBe("173K");
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
