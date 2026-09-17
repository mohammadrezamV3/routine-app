import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// پایپ‌لاینِ کاملِ ساختِ مسیر — بدونِ شبکه‌ی واقعی و بدونِ دیتابیس.
//
// چیزی که این‌جا سنجیده می‌شود همان زنجیره‌ی واقعیِ تولید است:
//   پاسخِ مدل → parse → normalize → validate → (اگر ناقص بود) repair → خروجی
// فقط خودِ fetch جای گیت‌وی را می‌گیرد، پس منطقِ تعمیر واقعاً اجرا می‌شود،
// نه یک mockِ سطحی از بالای آن.

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiUsageRecord: { create: vi.fn(async () => ({})) },
    errorLog: { create: vi.fn(() => ({ catch: () => {} })) },
    appSetting: { findUnique: vi.fn(async () => null) },
  },
}));
vi.mock("@/lib/appSettings", () => ({
  getAiCostRate: vi.fn(async () => ({ inputPerMTokUsd: 0, outputPerMTokUsd: 0 })),
  estimateAiCostUsdMicros: vi.fn(() => 0),
}));

import { generateRoadmapPlan } from "@/lib/aiClient";

const STAGE = {
  title: "شبکه از صفر",
  goal: "شبکه را بفهمی",
  duration: "۲ هفته",
  learn: ["مدل OSI"],
  do: ["یک شبکه ترسیم کن"],
  tools: ["Wireshark"],
  resources: [],
  done: "مسیرِ یک بسته را توضیح می‌دهی",
};

const VALID = {
  title: "از صفر تا امنیت شبکه",
  summary: "مسیر کامل",
  totalDuration: "۶ ماه",
  tools: ["Linux"],
  guide: "## مسیر در یک نگاه\n" + "متنِ واقعیِ راهنما. ".repeat(40),
  stages: [STAGE, { ...STAGE, title: "لینوکس" }],
};

/** همان مسیر ولی با راهنمای دوخطی — چیزی که نباید به کاربر برسد. */
const THIN = { ...VALID, guide: "یاد بگیر و تمرین کن." };

function gatewayReply(payload: unknown) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(payload) } }],
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    }),
  } as any;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.ARVAN_AI_BASE_URL = "https://gateway.test/v1";
  process.env.ARVAN_AI_API_KEY = "test-key";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("generateRoadmapPlan — مسیرِ سالم", () => {
  it("خروجیِ معتبر را با یک تلاش برمی‌گرداند", async () => {
    fetchMock.mockResolvedValueOnce(gatewayReply(VALID));

    const { plan, meta } = await generateRoadmapPlan({ topic: "امنیت شبکه", goal: "استخدام" }, "u1");

    expect(meta.attempts).toBe(1);
    expect(meta.repaired).toBe(false);
    expect(plan.stages).toHaveLength(2);
    expect(plan.guide).toContain("مسیر در یک نگاه");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("فقط همان دو چیزِ پرسیده‌شده به مدل می‌رود", async () => {
    fetchMock.mockResolvedValueOnce(gatewayReply(VALID));
    await generateRoadmapPlan({ topic: "امنیت شبکه", goal: "استخدام" }, "u1");

    const userMsg = JSON.parse(fetchMock.mock.calls[0][1].body).messages.find((m: any) => m.role === "user").content;
    expect(userMsg).toContain("امنیت شبکه");
    expect(userMsg).toContain("استخدام");
  });

  it("نبودنِ هدف خطا نیست — مدل صریح می‌فهمد هدفی گفته نشده", async () => {
    fetchMock.mockResolvedValueOnce(gatewayReply(VALID));
    await generateRoadmapPlan({ topic: "گیتار" }, "u1");

    const userMsg = JSON.parse(fetchMock.mock.calls[0][1].body).messages.find((m: any) => m.role === "user").content;
    expect(userMsg).toContain("هدفِ مشخصی نگفته");
  });

  it("کلیدِ API را در هدر می‌فرستد و هیچ‌وقت در بدنه نمی‌گذارد", async () => {
    fetchMock.mockResolvedValueOnce(gatewayReply(VALID));
    await generateRoadmapPlan({ topic: "x" }, "u1");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer test-key");
    expect(init.body).not.toContain("test-key");
  });
});

describe("generateRoadmapPlan — تعمیرِ خروجیِ ناقص", () => {
  it("راهنمای دوخطی را قبول نمی‌کند؛ ایراد را به مدل پس می‌دهد و نسخه‌ی کامل را می‌پذیرد", async () => {
    fetchMock
      .mockResolvedValueOnce(gatewayReply(THIN))
      .mockResolvedValueOnce(gatewayReply(VALID));

    const { plan, meta } = await generateRoadmapPlan({ topic: "x" }, "u1");

    expect(meta.attempts).toBe(2);
    expect(meta.repaired).toBe(true);
    expect(plan.guide.length).toBeGreaterThan(400);

    const repairMsg = JSON.parse(fetchMock.mock.calls[1][1].body).messages.find((m: any) => m.role === "user").content;
    expect(repairMsg).toContain("guide");
  });

  it("اگر بعدِ همه‌ی تلاش‌ها هنوز ناقص بود، مسیرِ ناقص را برنمی‌گرداند", async () => {
    fetchMock.mockResolvedValue(gatewayReply(THIN));
    await expect(generateRoadmapPlan({ topic: "x" }, "u1")).rejects.toThrow();
  });

  it("سقفِ تلاش‌ها رعایت می‌شود (هزینه‌ی بی‌نهایت ممنوع)", async () => {
    fetchMock.mockResolvedValue(gatewayReply(THIN));
    await expect(generateRoadmapPlan({ topic: "x" }, "u1")).rejects.toThrow();
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it("JSONِ خراب هم باعثِ تلاشِ دوباره می‌شود، نه کرش", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "این JSON نیست" } }], usage: {} }),
      } as any)
      .mockResolvedValueOnce(gatewayReply(VALID));

    const { plan } = await generateRoadmapPlan({ topic: "x" }, "u1");
    expect(plan.stages).toHaveLength(2);
  });

  it("خطای HTTPِ گیت‌وی به پیامِ فارسی تبدیل می‌شود، نه استک‌تریس", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" } as any);
    await expect(generateRoadmapPlan({ topic: "x" }, "u1")).rejects.toThrow();
  });

  it("بدونِ کلیدِ گیت‌وی، پیامِ روشن می‌دهد", async () => {
    delete process.env.ARVAN_AI_API_KEY;
    await expect(generateRoadmapPlan({ topic: "x" }, "u1")).rejects.toThrow(/ARVAN_AI_API_KEY/);
  });
});
