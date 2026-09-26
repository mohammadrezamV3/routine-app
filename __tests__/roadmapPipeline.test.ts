import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// پایپ‌لاینِ کاملِ ساختِ مسیر (اسکلت → راهنما + جزئیاتِ موازیِ هر مرحله)،
// بدونِ شبکه‌ی واقعی و بدونِ دیتابیس. فقط fetch جای گیت‌وی را می‌گیرد و از
// روی system prompt تشخیص می‌دهد کدام فاز صدا زده شده.

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

import { generateRoadmapPlan, generateStageDetail } from "@/lib/aiClient";

const OUTLINE = {
  title: "از صفر تا امنیت شبکه",
  summary: "مسیر کامل",
  totalDuration: "۶ ماه",
  tools: [{ name: "Linux", use: "محیطِ اصلی" }],
  meta: { audience: "تازه‌کار", prerequisites: [], outcomes: ["یک شبکه را اسکن می‌کنی"], certifications: [] },
  stages: [
    { title: "شبکه", goal: "شبکه را بفهمی", focus: "OSI و TCP/IP", why: "پایه", duration: "۲ هفته" },
    { title: "لینوکس", goal: "با ترمینال کار کنی", focus: "فایل‌سیستم و bash", why: "ابزارِ کار", duration: "۳ هفته" },
    { title: "امنیت", goal: "آسیب‌پذیری پیدا کنی", focus: "OWASP", why: "هدف", duration: "۴ هفته" },
  ],
};

const DETAIL = {
  why: "بدونِ این جلو نمی‌روی",
  topics: [
    { title: "مدل OSI", detail: "هفت لایه و کارِ هرکدام", points: ["لایه‌ی ۳", "لایه‌ی ۴"] },
    { title: "TCP", detail: "دست‌دادنِ سه‌مرحله‌ای", points: ["SYN"] },
  ],
  tasks: [
    { title: "ضبطِ ترافیک", detail: "با Wireshark", output: "فایلِ pcap" },
    { title: "فیلتر", detail: "http.request", output: "اسکرین‌شات" },
  ],
  project: { title: "نقشه‌ی شبکه‌ی خانه", brief: "…", deliverables: ["نمودار"] },
  tools: [{ name: "Wireshark", use: "تحلیلِ بسته" }],
  resources: [{ title: "Wireshark Docs", type: "documentation", source: "Wireshark", url: "https://fake.example" }],
  pitfalls: ["حفظ‌کردنِ لایه‌ها بدونِ فهم"],
  done: ["مسیرِ یک بسته را توضیح می‌دهی"],
  // مدل نباید بتواند اسکلت را عوض کند:
  title: "عنوانِ دست‌کاری‌شده",
};

const GUIDE = { guide: "## مسیر در یک نگاه\n" + "متنِ واقعیِ راهنما. ".repeat(60) };

function reply(payload: unknown) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: typeof payload === "string" ? payload : JSON.stringify(payload) } }],
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    }),
  } as any;
}

type Phase = "outline" | "stage" | "guide";
function phaseOf(init: any): Phase {
  const system = JSON.parse(init.body).messages.find((m: any) => m.role === "system").content as string;
  if (system.includes("اسکلتِ")) return system.includes("نامه‌ی راهنما") ? "guide" : "outline";
  return system.includes("یک مرحله") ? "stage" : "guide";
}
function userOf(init: any): string {
  return JSON.parse(init.body).messages.find((m: any) => m.role === "user").content;
}

let fetchMock: ReturnType<typeof vi.fn>;
function route(handlers: Partial<Record<Phase, (init: any) => any>>) {
  fetchMock.mockImplementation(async (_url: string, init: any) => {
    const h = handlers[phaseOf(init)];
    return h ? h(init) : reply({});
  });
}

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
  it("اسکلت + راهنما + جزئیاتِ هر مرحله را کنارِ هم می‌گذارد", async () => {
    route({ outline: () => reply(OUTLINE), stage: () => reply(DETAIL), guide: () => reply(GUIDE) });
    const { plan, meta } = await generateRoadmapPlan(
      { topic: "امنیت شبکه", goal: "استخدام", level: "zero", weeklyHours: "8" },
      "u1"
    );

    expect(meta.attempts).toBe(1);
    expect(meta.pendingStages).toEqual([]);
    expect(meta.guideReady).toBe(true);
    // ۱ اسکلت + ۱ راهنما + ۳ مرحله
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(plan.stages).toHaveLength(3);
    expect(plan.stages.every((s) => s.detailed)).toBe(true);
    expect(plan.stages[0].topics[0].points).toContain("لایه‌ی ۳");
    expect(plan.guide).toContain("مسیر در یک نگاه");
    expect(plan.meta.level).toBe("zero");
  });

  it("جزئیات نمی‌تواند عنوان/محدوده‌ی اسکلت را عوض کند", async () => {
    route({ outline: () => reply(OUTLINE), stage: () => reply(DETAIL), guide: () => reply(GUIDE) });
    const { plan } = await generateRoadmapPlan({ topic: "x" }, "u1");
    expect(plan.stages.map((s) => s.title)).toEqual(["شبکه", "لینوکس", "امنیت"]);
    expect(plan.stages[1].focus).toBe("فایل‌سیستم و bash");
  });

  it("لینکِ ساختگیِ منبع حذف می‌شود ولی خودِ منبع می‌ماند", async () => {
    route({ outline: () => reply(OUTLINE), stage: () => reply(DETAIL), guide: () => reply(GUIDE) });
    const { plan } = await generateRoadmapPlan({ topic: "x" }, "u1");
    expect(plan.stages[0].resources[0].title).toBe("Wireshark Docs");
    expect(plan.stages[0].resources[0].url).toBeUndefined();
  });

  it("سطح، وقت و هدف به پرامپت می‌رسند؛ نبودِ هدف صریح گفته می‌شود", async () => {
    route({ outline: () => reply(OUTLINE), stage: () => reply(DETAIL), guide: () => reply(GUIDE) });
    await generateRoadmapPlan({ topic: "گیتار", level: "mid", weeklyHours: "15" }, "u1");
    const outlineCall = fetchMock.mock.calls.find(([, i]) => phaseOf(i) === "outline")!;
    const msg = userOf(outlineCall[1]);
    expect(msg).toContain("گیتار");
    expect(msg).toContain("مشخص نکرده");
    expect(msg).toContain("۱۰ تا ۲۰ ساعت");
  });

  it("پیامِ هر مرحله فقط همان مرحله را می‌خواهد و کلِ مسیر را هم می‌بیند", async () => {
    route({ outline: () => reply(OUTLINE), stage: () => reply(DETAIL), guide: () => reply(GUIDE) });
    await generateRoadmapPlan({ topic: "x" }, "u1");
    const stageMsgs = fetchMock.mock.calls.filter(([, i]) => phaseOf(i) === "stage").map(([, i]) => userOf(i));
    expect(stageMsgs).toHaveLength(3);
    expect(stageMsgs.some((m) => m.includes("فقط مرحله‌ی 2"))).toBe(true);
    for (const m of stageMsgs) expect(m).toContain("OWASP");
  });

  it("کلیدِ API در هدر است و هیچ‌وقت در بدنه نیست", async () => {
    route({ outline: () => reply(OUTLINE), stage: () => reply(DETAIL), guide: () => reply(GUIDE) });
    await generateRoadmapPlan({ topic: "x" }, "u1");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer test-key");
    expect(init.body).not.toContain("test-key");
  });
});

describe("generateRoadmapPlan — شکستِ جزئی و کامل", () => {
  it("شکستِ یک مرحله کلِ مسیر را خراب نمی‌کند — فقط همان مرحله pending می‌ماند", async () => {
    route({
      outline: () => reply(OUTLINE),
      stage: (init) => (userOf(init).includes("فقط مرحله‌ی 2") ? reply("این JSON نیست") : reply(DETAIL)),
      guide: () => reply(GUIDE),
    });
    const { plan, meta } = await generateRoadmapPlan({ topic: "x" }, "u1");
    expect(meta.pendingStages).toEqual([2]);
    expect(plan.stages[1].detailed).toBe(false);
    expect(plan.stages[1].title).toBe("لینوکس");
    expect(plan.stages[0].detailed).toBe(true);
  });

  it("جزئیاتِ تهی (بی‌سرفصل/بی‌کار) مرحله را کامل نمی‌کند", async () => {
    route({ outline: () => reply(OUTLINE), stage: () => reply({ why: "x" }), guide: () => reply(GUIDE) });
    const { meta } = await generateRoadmapPlan({ topic: "x" }, "u1");
    expect(meta.pendingStages).toEqual([1, 2, 3]);
  });

  it("راهنمای دوخطی رد می‌شود و بعداً ساخته می‌شود", async () => {
    route({ outline: () => reply(OUTLINE), stage: () => reply(DETAIL), guide: () => reply({ guide: "کوتاه" }) });
    const { plan, meta } = await generateRoadmapPlan({ topic: "x" }, "u1");
    expect(meta.guideReady).toBe(false);
    expect(plan.guide).toBe("");
  });

  it("اسکلتِ ناقص یک بار تعمیر می‌شود", async () => {
    let n = 0;
    route({
      outline: () => reply(n++ === 0 ? { ...OUTLINE, stages: OUTLINE.stages.slice(0, 1) } : OUTLINE),
      stage: () => reply(DETAIL),
      guide: () => reply(GUIDE),
    });
    const { plan, meta } = await generateRoadmapPlan({ topic: "x" }, "u1");
    expect(meta.attempts).toBe(2);
    expect(plan.stages).toHaveLength(3);
    const repair = fetchMock.mock.calls.filter(([, i]) => phaseOf(i) === "outline").map(([, i]) => userOf(i))[1];
    expect(repair).toContain("ایرادها");
  });

  it("اگر اسکلت بعدِ تعمیر هم ناقص بود، مسیرِ ناقص ذخیره نمی‌شود", async () => {
    route({ outline: () => reply({ ...OUTLINE, stages: [] }) });
    await expect(generateRoadmapPlan({ topic: "x" }, "u1")).rejects.toThrow();
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("خطای HTTPِ گیت‌وی پرتاب می‌شود، نه کرش/استک‌تریس", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" } as any);
    await expect(generateRoadmapPlan({ topic: "x" }, "u1")).rejects.toThrow(/429/);
  });

  it("بدونِ کلیدِ گیت‌وی، پیامِ روشن می‌دهد", async () => {
    delete process.env.ARVAN_AI_API_KEY;
    await expect(generateRoadmapPlan({ topic: "x" }, "u1")).rejects.toThrow(/ARVAN_AI_API_KEY/);
  });
});

describe("generateStageDetail — ساختِ دوباره‌ی یک مرحله", () => {
  it("شماره‌ی مرحله حفظ می‌شود", async () => {
    route({ stage: () => reply(DETAIL) });
    const { normalizePlan } = await import("@/lib/roadmapPlan");
    const plan = normalizePlan(OUTLINE);
    const st = await generateStageDetail({ profile: { topic: "x" }, plan }, 3, "u1");
    expect(st.n).toBe(3);
    expect(st.title).toBe("امنیت");
    expect(st.detailed).toBe(true);
  });

  it("مرحله‌ی ناموجود خطا می‌دهد، نه فراخوانیِ بی‌هدف", async () => {
    const { normalizePlan } = await import("@/lib/roadmapPlan");
    await expect(
      generateStageDetail({ profile: { topic: "x" }, plan: normalizePlan(OUTLINE) }, 9, "u1")
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
